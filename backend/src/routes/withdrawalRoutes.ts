import { randomBytes } from 'crypto';
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware';
import { pool } from '../config/db';

const router = Router();

const getIndiaTimeParts = (date: Date) => {
    const parts = new Map(
        new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(date).map((part) => [part.type, part.value])
    );

    return {
        year: parts.get('year') || '1970',
        month: parts.get('month') || '01',
        day: parts.get('day') || '01',
        hour: Number(parts.get('hour') || 0),
        minute: Number(parts.get('minute') || 0),
        second: Number(parts.get('second') || 0)
    };
};

const getWindowStatus = (date = new Date()) => {
    const parts = getIndiaTimeParts(date);
    const secondsOfDay = parts.hour * 3600 + parts.minute * 60 + parts.second;
    return {
        open: parts.day === '03' && secondsOfDay >= 5 * 3600 && secondsOfDay <= 19 * 3600,
        day: Number(parts.day),
        localTime: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
    };
};

const isInsideWithdrawalWindow = () => getWindowStatus().open;

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }

    try {
        const [[users], [settings], [sponsors], [history]]: any = await Promise.all([
            pool.query(`
                SELECT user_id AS userId, name, wallet, acName, bank, ifsc, accountNo
                FROM meddolic_user_details
                WHERE member_id = ?
                LIMIT 1
            `, [memberId]),
            pool.query('SELECT withdrawCharge, minimumWithdraw, maximum_withdraw FROM meddolic_config_misc_setting ORDER BY id ASC LIMIT 1'),
            pool.query('SELECT COUNT(1) AS totalSponsors FROM meddolic_user_details WHERE sponser_id = ?', [memberId]),
            pool.query(`
                SELECT id, amount, withdrawCharge, netAmount, orderid, date_time AS requestedAt,
                    released AS status, payment_date AS actionDate, remarks
                FROM meddolic_user_wallet_withdrawal_crypto
                WHERE member_id = ?
                ORDER BY id DESC
            `, [memberId])
        ]);

        if (users.length === 0) {
            res.status(404).json({ error: 'User account not found.' });
            return;
        }
        if (settings.length === 0) {
            res.status(500).json({ error: 'Withdrawal settings are not configured.' });
            return;
        }

        const totalSponsors = Number(sponsors[0]?.totalSponsors || 0);
        const accountNumber = String(users[0].accountNo || '');
        const windowStatus = getWindowStatus();

        res.status(200).json({
            user: {
                userId: users[0].userId,
                name: users[0].name,
                incomeWallet: Number(users[0].wallet || 0),
                bankAccountName: users[0].acName || '',
                bankName: users[0].bank || '',
                ifsc: users[0].ifsc || '',
                maskedAccountNumber: accountNumber ? `••••${accountNumber.slice(-4)}` : ''
            },
            withdrawCharge: Number(settings[0].withdrawCharge || 0),
            minimumWithdraw: Number(settings[0].minimumWithdraw || 0),
            maximumWithdraw: Number(settings[0].maximum_withdraw || 0),
            totalSponsors,
            bankDetailsConfigured: Boolean(accountNumber),
            withdrawalWindow: {
                ...windowStatus,
                description: 'Withdrawals are available on the 3rd of each month from 05:00 to 19:00 IST.'
            },
            history
        });
    } catch (error: any) {
        console.error('Withdrawal page load error:', error.message);
        res.status(500).json({ error: 'Failed to load withdrawal data.' });
    }
});

router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    const amountText = typeof req.body?.amount === 'string' || typeof req.body?.amount === 'number'
        ? String(req.body.amount).trim()
        : '';
    const transactionPassword = typeof req.body?.transactionPassword === 'string'
        ? req.body.transactionPassword
        : '';

    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }
    if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(amountText)) {
        res.status(400).json({ error: 'Enter a withdrawal amount with no more than 2 decimal places.' });
        return;
    }
    const amountCents = Math.round(Number(amountText) * 100);
    if (amountCents <= 0 || amountCents > 9999999999) {
        res.status(400).json({ error: 'Withdrawal amount is outside the supported range.' });
        return;
    }
    if (!transactionPassword) {
        res.status(400).json({ error: 'Transaction password is required.' });
        return;
    }
    if (!isInsideWithdrawalWindow()) {
        res.status(400).json({ error: 'Withdrawals are only allowed on the 3rd of each month from 05:00 to 19:00 IST.' });
        return;
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [users]: any = await connection.query(`
            SELECT user_id AS userId, name, wallet, trnPassword, acName, bank, ifsc, accountNo
            FROM meddolic_user_details
            WHERE member_id = ?
            FOR UPDATE
        `, [memberId]);
        if (users.length === 0) {
            await connection.rollback();
            res.status(404).json({ error: 'User account not found.' });
            return;
        }

        const storedPassword = String(users[0].trnPassword ?? '');
        const isHashedPassword = /^\$2[aby]\$/.test(storedPassword);
        const passwordMatches = isHashedPassword
            ? await bcrypt.compare(transactionPassword, storedPassword)
            : transactionPassword.trim() === storedPassword.trim();
        if (!passwordMatches) {
            await connection.rollback();
            res.status(400).json({ error: 'Transaction password is incorrect.' });
            return;
        }

        const [sponsors]: any = await connection.query(
            'SELECT COUNT(1) AS totalSponsors FROM meddolic_user_details WHERE sponser_id = ?',
            [memberId]
        );
        if (Number(sponsors[0]?.totalSponsors || 0) < 2) {
            await connection.rollback();
            res.status(400).json({ error: 'At least 2 direct sponsors are required for withdrawal.' });
            return;
        }

        if (!users[0].accountNo) {
            await connection.rollback();
            res.status(400).json({ error: 'Add your bank account details before requesting a withdrawal.' });
            return;
        }

        const [settings]: any = await connection.query(
            'SELECT withdrawCharge, minimumWithdraw, maximum_withdraw FROM meddolic_config_misc_setting ORDER BY id ASC LIMIT 1'
        );
        if (settings.length === 0) {
            await connection.rollback();
            res.status(500).json({ error: 'Withdrawal settings are not configured.' });
            return;
        }

        const minimumCents = Math.round(Number(settings[0].minimumWithdraw || 0) * 100);
        const maximumCents = Math.round(Number(settings[0].maximum_withdraw || 0) * 100);
        const chargePercent = Number(settings[0].withdrawCharge || 0);
        if (amountCents < minimumCents) {
            await connection.rollback();
            res.status(400).json({ error: `Minimum withdrawal amount is ₹${(minimumCents / 100).toFixed(2)}.` });
            return;
        }
        if (maximumCents > 0 && amountCents > maximumCents) {
            await connection.rollback();
            res.status(400).json({ error: `Maximum withdrawal amount is ₹${(maximumCents / 100).toFixed(2)}.` });
            return;
        }
        if (!Number.isFinite(chargePercent) || chargePercent < 0 || chargePercent >= 100) {
            await connection.rollback();
            res.status(500).json({ error: 'Withdrawal charge is not configured correctly.' });
            return;
        }

        const walletCents = Math.round(Number(users[0].wallet || 0) * 100);
        if (walletCents < amountCents) {
            await connection.rollback();
            res.status(400).json({ error: 'Insufficient balance in your income wallet.' });
            return;
        }

        const chargeCents = Math.round(amountCents * chargePercent / 100);
        const netAmountCents = amountCents - chargeCents;
        const amount = (amountCents / 100).toFixed(2);
        const charge = (chargeCents / 100).toFixed(2);
        const netAmount = (netAmountCents / 100).toFixed(2);
        const orderId = `RW-${memberId}-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

        const [updateResult]: any = await connection.query(
            'UPDATE meddolic_user_details SET wallet = wallet - ? WHERE member_id = ? AND wallet >= ?',
            [amount, memberId, amount]
        );
        if (updateResult.affectedRows !== 1) {
            await connection.rollback();
            res.status(400).json({ error: 'Wallet balance changed. Refresh and try again.' });
            return;
        }

        const indiaDate = getIndiaTimeParts(new Date());
        const withdrawalDate = `${indiaDate.year}-${indiaDate.month}-${indiaDate.day}`;
        const [withdrawalResult]: any = await connection.query(`
            INSERT INTO meddolic_user_wallet_withdrawal_crypto
                (member_id, withdrawal_date, date_time, amount, withdrawCharge, netAmount, released, orderid, paymentId, walletType, withdrawType)
            VALUES (?, ?, NOW(), ?, ?, ?, 0, ?, 0, 'wallet', 1)
        `, [memberId, withdrawalDate, amount, charge, netAmount, orderId]);

        await connection.query(`
            INSERT INTO meddolic_user_wallet_statement
                (member_id, wallet_statement_id, deb_cr, amount, date_time, trn_id)
            VALUES (?, 10, 1, ?, NOW(), ?)
        `, [memberId, amount, withdrawalResult.insertId]);

        await connection.commit();
        res.status(201).json({
            message: 'Withdrawal request submitted successfully.',
            amount: Number(amount),
            charge: Number(charge),
            netAmount: Number(netAmount),
            incomeWallet: Number(((walletCents - amountCents) / 100).toFixed(2)),
            orderId
        });
    } catch (error: any) {
        if (connection) await connection.rollback().catch(() => undefined);
        console.error('Withdrawal submit error:', error.message);
        res.status(500).json({ error: 'Failed to submit withdrawal request.' });
    } finally {
        connection?.release();
    }
});

export default router;