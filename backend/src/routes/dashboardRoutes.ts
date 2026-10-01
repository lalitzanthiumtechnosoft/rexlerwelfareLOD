import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { verifyToken, AuthRequest } from '../middleware/authMiddleware';
import { pool } from '../config/db';

const router = Router();

router.get('/bank-details', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }

    try {
        const [users]: any = await pool.query(
            'SELECT acName, ifsc, bank, branch, accountNo, panNo FROM meddolic_user_details WHERE member_id = ? LIMIT 1',
            [memberId]
        );
        if (users.length === 0) {
            res.status(404).json({ error: 'User account not found.' });
            return;
        }

        res.status(200).json({
            bankDetails: {
                accountHolderName: users[0].acName || '',
                ifscCode: users[0].ifsc || '',
                bankName: users[0].bank || '',
                branch: users[0].branch || '',
                accountNumber: users[0].accountNo || '',
                panNumber: users[0].panNo || ''
            }
        });
    } catch (error: any) {
        console.error('Bank details load error:', error.message);
        res.status(500).json({ error: 'Failed to load bank details.' });
    }
});

router.put('/bank-details', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    const accountHolderName = typeof req.body?.accountHolderName === 'string' ? req.body.accountHolderName.trim() : '';
    const ifscCode = typeof req.body?.ifscCode === 'string' ? req.body.ifscCode.trim().toUpperCase() : '';
    const bankName = typeof req.body?.bankName === 'string' ? req.body.bankName.trim() : '';
    const branch = typeof req.body?.branch === 'string' ? req.body.branch.trim() : '';
    const accountNumber = typeof req.body?.accountNumber === 'string' ? req.body.accountNumber.trim() : '';
    const panNumber = typeof req.body?.panNumber === 'string' ? req.body.panNumber.trim().toUpperCase() : '';

    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }
    if (!accountHolderName) {
        res.status(400).json({ error: 'Account holder name is required.' });
        return;
    }
    if (!bankName) {
        res.status(400).json({ error: 'Bank name is required.' });
        return;
    }
    if (!branch) {
        res.status(400).json({ error: 'Branch is required.' });
        return;
    }
    if (!accountNumber) {
        res.status(400).json({ error: 'Account number is required.' });
        return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
        res.status(400).json({ error: 'IFSC must be 11 characters, for example SBIN0001234.' });
        return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
        res.status(400).json({ error: 'PAN must be 10 characters, for example ABCDE1234F.' });
        return;
    }

    try {
        await pool.query(
            'UPDATE meddolic_user_details SET acName = ?, ifsc = ?, bank = ?, branch = ?, accountNo = ?, panNo = ? WHERE member_id = ?',
            [accountHolderName, ifscCode, bankName, branch, accountNumber, panNumber, memberId]
        );
        const [users]: any = await pool.query(
            'SELECT acName, ifsc, bank, branch, accountNo, panNo FROM meddolic_user_details WHERE member_id = ? LIMIT 1',
            [memberId]
        );
        if (users.length === 0) {
            res.status(404).json({ error: 'User account not found.' });
            return;
        }

        const savedDetails = {
            accountHolderName: users[0].acName || '',
            ifscCode: users[0].ifsc || '',
            bankName: users[0].bank || '',
            branch: users[0].branch || '',
            accountNumber: users[0].accountNo || '',
            panNumber: users[0].panNo || ''
        };
        if (savedDetails.accountHolderName !== accountHolderName || savedDetails.ifscCode !== ifscCode || savedDetails.bankName !== bankName || savedDetails.branch !== branch || savedDetails.accountNumber !== accountNumber || savedDetails.panNumber !== panNumber) {
            res.status(500).json({ error: 'Bank details were not saved. Please try again.' });
            return;
        }

        res.status(200).json({ message: 'Bank details saved successfully.', bankDetails: savedDetails });
    } catch (error: any) {
        console.error('Bank details update error:', error.message);
        res.status(500).json({ error: 'Failed to save bank details.' });
    }
});

router.put('/change-transaction-password', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    const currentPassword = req.body?.currentPassword;
    const newPassword = req.body?.newPassword;

    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }
    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || newPassword.length < 3 || newPassword.length > 6) {
        res.status(400).json({ error: 'Enter your current transaction password and a new password of 3 to 6 characters.' });
        return;
    }
    if (currentPassword === newPassword) {
        res.status(400).json({ error: 'New transaction password must be different from the current password.' });
        return;
    }

    try {
        const [users]: any = await pool.query(
            'SELECT trnPassword FROM meddolic_user_details WHERE member_id = ? LIMIT 1',
            [memberId]
        );
        if (users.length === 0) {
            res.status(404).json({ error: 'User account not found.' });
            return;
        }

        const storedPassword = String(users[0].trnPassword ?? '');
        const isHashedPassword = /^\$2[aby]\$/.test(storedPassword);
        const passwordMatches = isHashedPassword
            ? await bcrypt.compare(currentPassword, storedPassword)
            : currentPassword.trim() === storedPassword.trim();
        if (!passwordMatches) {
            res.status(400).json({ error: 'Current transaction password is incorrect.' });
            return;
        }

        await pool.query(
            'UPDATE meddolic_user_details SET trnPassword = ? WHERE member_id = ?',
            [newPassword, memberId]
        );
        res.status(200).json({ message: 'Transaction password updated successfully.' });
    } catch (error: any) {
        console.error('Transaction password update error:', error.message);
        res.status(500).json({ error: 'Failed to update transaction password.' });
    }
});

router.put('/change-password', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    const currentPassword = req.body?.currentPassword;
    const newPassword = req.body?.newPassword;

    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }
    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || newPassword.length < 3 || newPassword.length > 6) {
        res.status(400).json({ error: 'Enter your current password and a new password of 3 to 6 characters.' });
        return;
    }
    if (currentPassword === newPassword) {
        res.status(400).json({ error: 'New password must be different from the current password.' });
        return;
    }

    try {
        const [users]: any = await pool.query(
            'SELECT password FROM meddolic_user_details WHERE member_id = ? LIMIT 1',
            [memberId]
        );
        if (users.length === 0) {
            res.status(404).json({ error: 'User account not found.' });
            return;
        }

        const storedPassword = String(users[0].password ?? '');
        const isHashedPassword = /^\$2[aby]\$/.test(storedPassword);
        const passwordMatches = isHashedPassword
            ? await bcrypt.compare(currentPassword, storedPassword)
            : currentPassword.trim() === storedPassword.trim();
        if (!passwordMatches) {
            res.status(400).json({ error: 'Current password is incorrect.' });
            return;
        }

        await pool.query(
            'UPDATE meddolic_user_details SET password = ? WHERE member_id = ?',
            [newPassword, memberId]
        );
        res.status(200).json({ message: 'Login password updated successfully.' });
    } catch (error: any) {
        console.error('Login password update error:', error.message);
        res.status(500).json({ error: 'Failed to update login password.' });
    }
});

router.put('/profile', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';

    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Enter a valid name and email address.' });
        return;
    }

    try {
        await pool.query(
            'UPDATE meddolic_user_details SET name = ?, email_id = ? WHERE member_id = ?',
            [name, email, memberId]
        );
        const [users]: any = await pool.query(
            'SELECT name, email_id AS email FROM meddolic_user_details WHERE member_id = ? LIMIT 1',
            [memberId]
        );
        if (users.length === 0) {
            res.status(404).json({ error: 'User profile not found.' });
            return;
        }
        if (users[0].name !== name || users[0].email !== email) {
            res.status(500).json({ error: 'Profile changes were not saved. Please try again.' });
            return;
        }

        res.status(200).json({
            message: 'Profile updated successfully.',
            user: { name: users[0].name, email: users[0].email }
        });
    } catch (error: any) {
        console.error('Profile update error:', error.message);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

router.get('/daily-income', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const memberId = req.user?.id ?? req.user?.memberId;
        if (memberId == null) {
            res.status(401).json({ error: 'Invalid session token.' });
            return;
        }

        const [incomeRows]: any = await pool.query(`
            SELECT
                summary.id AS summaryId,
                summary.status AS incomeStatus,
                summary.dailyLevelIncome AS dailyIncome,
                summary.level,
                summary.dateTime AS createdAt,
                summary.releaseStatus,
                user.user_id AS userId,
                user.name,
                COALESCE(released.incomeGet, 0) AS incomeGet
            FROM meddolic_user_level_income_summary AS summary
            INNER JOIN meddolic_user_details AS user
                ON user.member_id = summary.memberId
            LEFT JOIN (
                SELECT summaryId, SUM(levelIncome) AS incomeGet
                FROM meddolic_user_level_income
                WHERE memberId = ? AND releaseStatus = 1
                GROUP BY summaryId
            ) AS released
                ON released.summaryId = summary.id
            WHERE summary.memberId = ?
            ORDER BY summary.dateTime DESC
        `, [memberId, memberId]);

        res.status(200).json({ incomeRows });
    } catch (error: any) {
        console.error('Daily income query error:', error.message);
        res.status(500).json({ error: 'Failed to load daily income.' });
    }
});

router.get('/daily-income/:summaryId', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const memberId = req.user?.id ?? req.user?.memberId;
        const summaryId = Number(req.params.summaryId);
        if (memberId == null) {
            res.status(401).json({ error: 'Invalid session token.' });
            return;
        }
        if (!Number.isInteger(summaryId) || summaryId < 1) {
            res.status(400).json({ error: 'Invalid income summary.' });
            return;
        }

        const [details]: any = await pool.query(`
            SELECT
                income.id,
                owner.user_id AS userId,
                owner.name,
                income.levelIncome AS dailyAmount,
                income.dateTime AS releaseDate
            FROM meddolic_user_level_income AS income
            INNER JOIN meddolic_user_details AS owner
                ON owner.member_id = income.memberId
            WHERE income.memberId = ?
                AND income.summaryId = ?
                AND income.releaseStatus = 1
            ORDER BY income.dateTime DESC, income.id DESC
        `, [memberId, summaryId]);

        res.status(200).json({ details });
    } catch (error: any) {
        console.error('Daily income details query error:', error.message);
        res.status(500).json({ error: 'Failed to load income details.' });
    }
});

router.get('/team-tree', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const memberId = req.user?.id ?? req.user?.memberId;
        if (memberId == null) {
            res.status(401).json({ error: 'Invalid session token.' });
            return;
        }

        const [counts]: any = await pool.query(`
            SELECT
                child.level,
                COUNT(1) AS totalMembers
            FROM meddolic_user_child_ids AS child
            WHERE child.member_id = ?
                AND child.level BETWEEN 1 AND 16
            GROUP BY child.level
            ORDER BY child.level ASC
        `, [memberId]);

        const memberCountByLevel = new Map<number, number>(
            counts.map((row: any) => [Number(row.level), Number(row.totalMembers)])
        );
        const levels = Array.from({ length: 16 }, (_, index) => ({
            level: index + 1,
            totalMembers: memberCountByLevel.get(index + 1) ?? 0
        }));

        res.status(200).json({ levels });
    } catch (error: any) {
        console.error('Team level summary query error:', error.message);
        res.status(500).json({ error: 'Failed to load team levels.' });
    }
});

router.get('/team-tree/:level', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const memberId = req.user?.id ?? req.user?.memberId;
        const level = Number(req.params.level);
        if (memberId == null) {
            res.status(401).json({ error: 'Invalid session token.' });
            return;
        }
        if (!Number.isInteger(level) || level < 1 || level > 16) {
            res.status(400).json({ error: 'Level must be between 1 and 16.' });
            return;
        }

        const [members]: any = await pool.query(`
            SELECT
                child.child_id AS memberId,
                child.level,
                child.date_time AS joinedAt,
                child.topup_status AS topupStatus,
                child.topup_date AS activeAt,
                user.user_id AS userId,
                user.name,
                user.email_id AS email,
                user.phone
            FROM meddolic_user_child_ids AS child
            LEFT JOIN meddolic_user_details AS user
                ON user.member_id = child.child_id
            WHERE child.member_id = ?
                AND child.level = ?
            ORDER BY child.id ASC
        `, [memberId, level]);

        res.status(200).json({ members });
    } catch (error: any) {
        console.error('Team level details query error:', error.message);
        res.status(500).json({ error: 'Failed to load level members.' });
    }
});

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Use the actual primary key from the token payload, with safe fallbacks.
        // The DB schema uses member_id, not id.
        const memberId = req.user?.id ?? req.user?.memberId;
        const userId = req.user?.userId;
        const reqEmail = req.user?.email;

        console.log('🔍 Dashboard Request - memberId:', memberId);

        if (memberId == null && !userId && !reqEmail) {
            res.status(401).json({ error: 'Invalid session token.' });
            return;
        }

        // Never use OR here: blank or duplicate emails can select another member.
        const lookupColumn = memberId != null ? 'member_id' : userId ? 'user_id' : 'email_id';
        const lookupValue = memberId != null ? memberId : userId || reqEmail;
        const [users]: any = await pool.query(
            `SELECT * FROM meddolic_user_details WHERE ${lookupColumn} = ? LIMIT 1`,
            [lookupValue]
        );

        if (users.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const u = users[0];
        console.log('✅ User found:', u.member_id, u.user_id, u.name);

        // ✅ FIX: member_id integer (relations), user_id string (display)
        const memberIdNum = u.member_id;
        const userIdStr = u.user_id || u.email_id || `RWF${u.member_id}`;

        // Some rows use FundWallet while others use fundWallet. Read both safely.
        const walletValue = u.wallet ?? u.Wallet ?? 0;
        const fundWalletValue = u.fundWallet ?? u.FundWallet ?? 0;
        const incomeWallet = walletValue !== undefined && walletValue !== null ? Number(walletValue) : 0;
        const fundWallet = fundWalletValue !== undefined && fundWalletValue !== null ? Number(fundWalletValue) : 0;

        let totalSponser = 0, activeSponser = 0, inActiveSponser = 0;
        let totalTeam = 0, activeTeam = 0, inActiveTeam = 0;

        // 1. Referral Stats (only meddolic_user_details table)
        try {
            const [sponserRes]: any = await pool.query(`
                SELECT 
                    (SELECT COUNT(1) FROM meddolic_user_details WHERE sponser_id = ?) AS totalSponser,
                    (SELECT COUNT(1) FROM meddolic_user_details WHERE sponser_id = ? AND topup_flag = 1) AS activeSponser,
                    (SELECT COUNT(1) FROM meddolic_user_details WHERE sponser_id = ? AND topup_flag = 0) AS inActiveSponser
            `, [memberIdNum, memberIdNum, memberIdNum]);

            if (sponserRes && sponserRes.length > 0) {
                totalSponser = Number(sponserRes[0].totalSponser || 0);
                activeSponser = Number(sponserRes[0].activeSponser || 0);
                inActiveSponser = Number(sponserRes[0].inActiveSponser || 0);
            }
            console.log('✅ Sponser stats:', { totalSponser, activeSponser, inActiveSponser });
        } catch (e: any) {
            console.error('❌ Sponser query error:', e.message);
        }

        // 2. Team Stats (only if meddolic_user_child_ids exists)
        try {
            const [teamRes]: any = await pool.query(`
                SELECT 
                    (SELECT COUNT(1) FROM meddolic_user_child_ids WHERE member_id = ? AND level BETWEEN 1 AND 16) AS totalTeam,
                    (SELECT COUNT(1) FROM meddolic_user_child_ids WHERE member_id = ? AND topup_status = 1 AND level BETWEEN 1 AND 16) AS activeTeam,
                    (SELECT COUNT(1) FROM meddolic_user_child_ids WHERE member_id = ? AND topup_status = 0 AND level BETWEEN 1 AND 16) AS inActiveTeam
            `, [memberIdNum, memberIdNum, memberIdNum]);

            if (teamRes && teamRes.length > 0) {
                totalTeam = Number(teamRes[0].totalTeam || 0);
                activeTeam = Number(teamRes[0].activeTeam || 0);
                inActiveTeam = Number(teamRes[0].inActiveTeam || 0);
            }
            console.log('✅ Team stats:', { totalTeam, activeTeam, inActiveTeam });
        } catch (e: any) {
            console.warn('⚠️ Team table not available:', e.message);
        }
        
        // Agar level_income table exist karti hai to yeh uncomment karo:
        let levelIncome = 0;
        try {
            const [levelRes]: any = await pool.query(
                'SELECT SUM(levelIncome) AS levelIncome FROM meddolic_user_level_income WHERE memberId = ?',
                [memberIdNum]
            );
            if (levelRes?.[0]?.levelIncome) levelIncome = Number(levelRes[0].levelIncome);
            console.log('✅ Level income:', levelIncome);
        } catch (e: any) {
            console.warn('⚠️ Level income table not available:', e.message);
        }

        const totalEarning = levelIncome;

        const [directReferrals]: any = await pool.query(`
            SELECT
                member_id AS memberId,
                user_id AS userId,
                name,
                email_id AS email,
                phone,
                date_time AS registeredAt,
                activation_date AS activeAt,
                topup_flag AS topupFlag
            FROM meddolic_user_details
            WHERE sponser_id = ?
            ORDER BY member_id DESC
        `, [memberIdNum]);

        res.status(200).json({
            message: 'Welcome to Dashboard',
            directReferrals,
            user: {
                id: u.member_id,
                name: u.name || 'Rexler User',
                email: u.email_id || u.email,
                phone: u.phone || '',
                userId: userIdStr,
                memberId: u.member_id,
                topupFlag: u.topup_flag !== undefined ? Number(u.topup_flag) : 0,
                wallet: Number(incomeWallet).toFixed(2),
                incomeWallet: Number(incomeWallet).toFixed(2),
                fundWallet: Number(fundWallet).toFixed(2),
                totalEarning: Number(totalEarning).toFixed(2),
                levelIncome: Number(levelIncome).toFixed(2),
                swasthya: '0.00',
                garbhavati: '0.00',
                kanya: '0.00',
                aawas: '0.00',
                totalSponser,
                activeSponser,
                inActiveSponser,
                totalTeam,
                activeTeam,
                inActiveTeam,
                created_at: u.activation_date || u.date_time || u.registerDueDate
            }
        });
    } catch (error: any) {
        console.error('❌ Dashboard Error:', error.message);
        console.error('Full stack:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

export default router;