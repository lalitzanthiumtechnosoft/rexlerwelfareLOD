import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '../middleware/authMiddleware';
import { pool } from '../config/db';

const router = Router();

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
                created_at: u.date_time || u.activation_date || u.registerDueDate
            }
        });
    } catch (error: any) {
        console.error('❌ Dashboard Error:', error.message);
        console.error('Full stack:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

export default router;