import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware';
import { pool } from '../config/db';

const router = Router();

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }

    try {
        const [[users], [settings], [history]]: any = await Promise.all([
            pool.query('SELECT user_id AS userId, name, wallet AS incomeWallet, fundWallet FROM meddolic_user_details WHERE member_id = ? LIMIT 1', [memberId]),
            pool.query('SELECT incomeToFund FROM meddolic_config_misc_setting ORDER BY id ASC LIMIT 1'),
            pool.query(`
                SELECT
                    transfer.id,
                    user.user_id AS userId,
                    user.name,
                    transfer.transferAmount,
                    transfer.transferCharge,
                    transfer.depositAmount,
                    transfer.transferDate
                FROM meddolic_user_income_wallet_transfer AS transfer
                INNER JOIN meddolic_user_details AS user
                    ON user.member_id = transfer.memberId
                WHERE transfer.memberId = ?
                ORDER BY transfer.transferDate DESC, transfer.id DESC
            `, [memberId])
        ]);

        if (users.length === 0) {
            res.status(404).json({ error: 'User account not found.' });
            return;
        }

        res.status(200).json({
            user: {
                userId: users[0].userId,
                name: users[0].name,
                incomeWallet: Number(users[0].incomeWallet || 0),
                fundWallet: Number(users[0].fundWallet || 0)
            },
            chargePercent: Number(settings[0]?.incomeToFund || 0),
            history
        });
    } catch (error: any) {
        console.error('Wallet transfer page load error:', error.message);
        res.status(500).json({ error: 'Failed to load wallet transfer data.' });
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
        res.status(400).json({ error: 'Enter an amount with no more than 2 decimal places.' });
        return;
    }
    const amountCents = Math.round(Number(amountText) * 100);
    if (amountCents <= 0 || amountCents > 9999999999) {
        res.status(400).json({ error: 'Transfer amount must be greater than zero and within the supported limit.' });
        return;
    }
    if (!transactionPassword) {
        res.status(400).json({ error: 'Transaction password is required.' });
        return;
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [users]: any = await connection.query(
            'SELECT user_id AS userId, name, wallet, fundWallet, trnPassword FROM meddolic_user_details WHERE member_id = ? FOR UPDATE',
            [memberId]
        );
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

        const [settings]: any = await connection.query(
            'SELECT incomeToFund FROM meddolic_config_misc_setting ORDER BY id ASC LIMIT 1'
        );
        const chargePercent = Number(settings[0]?.incomeToFund);
        if (!Number.isFinite(chargePercent) || chargePercent < 0 || chargePercent >= 100) {
            await connection.rollback();
            res.status(500).json({ error: 'Wallet transfer charge is not configured correctly.' });
            return;
        }

        const incomeWalletCents = Math.round(Number(users[0].wallet || 0) * 100);
        const fundWalletCents = Math.round(Number(users[0].fundWallet || 0) * 100);
        if (incomeWalletCents < amountCents) {
            await connection.rollback();
            res.status(400).json({ error: 'Insufficient balance in the income wallet.' });
            return;
        }

        const chargeCents = Math.round(amountCents * chargePercent / 100);
        const netAmountCents = amountCents - chargeCents;
        const amount = (amountCents / 100).toFixed(2);
        const charge = (chargeCents / 100).toFixed(2);
        const netAmount = (netAmountCents / 100).toFixed(2);
        const incomeWalletBefore = (incomeWalletCents / 100).toFixed(2);
        const fundWalletBefore = (fundWalletCents / 100).toFixed(2);

        const [updateResult]: any = await connection.query(
            'UPDATE meddolic_user_details SET wallet = wallet - ?, fundWallet = fundWallet + ? WHERE member_id = ? AND wallet >= ?',
            [amount, netAmount, memberId, amount]
        );
        if (updateResult.affectedRows !== 1) {
            await connection.rollback();
            res.status(400).json({ error: 'Wallet balance changed. Refresh and try again.' });
            return;
        }

        const [transferResult]: any = await connection.query(`
            INSERT INTO meddolic_user_income_wallet_transfer
                (memberId, transferAmount, transferCharge, depositAmount, transferDate, incomeWallet, fundWallet)
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `, [memberId, amount, charge, netAmount, incomeWalletBefore, fundWalletBefore]);

        await connection.query(`
            INSERT INTO meddolic_user_wallet_statement
                (member_id, wallet_statement_id, deb_cr, amount, date_time, trn_id)
            VALUES (?, 9, 1, ?, NOW(), ?)
        `, [memberId, amount, transferResult.insertId]);

        await connection.commit();
        res.status(200).json({
            message: 'Income wallet transferred to purchase wallet successfully.',
            transferAmount: Number(amount),
            transferCharge: Number(charge),
            depositAmount: Number(netAmount),
            incomeWallet: Number(((incomeWalletCents - amountCents) / 100).toFixed(2)),
            fundWallet: Number(((fundWalletCents + netAmountCents) / 100).toFixed(2))
        });
    } catch (error: any) {
        if (connection) await connection.rollback().catch(() => undefined);
        console.error('Wallet transfer error:', error.message);
        res.status(500).json({ error: 'Failed to transfer wallet balance.' });
    } finally {
        connection?.release();
    }
});

export default router;