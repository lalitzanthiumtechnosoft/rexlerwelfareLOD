import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '../middleware/authMiddleware';
import { pool } from '../config/db';

const router = Router();

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const reqId = req.user.id;
        const reqEmail = req.user.email;

        // Fetch User Details from MySQL meddolic_user_details
        const [users]: any = await pool.query(
            'SELECT * FROM meddolic_user_details WHERE id = ? OR user_id = ? OR email_id = ?',
            [reqId, reqId, reqEmail]
        );

        if (users.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const u = users[0];
        const memberId = u.member_id || u.user_id || u.id;
        const userId = u.user_id || u.email_id || `RWF${u.id}`;

        // Wallets from meddolic_user_details table
        const incomeWallet = u.wallet !== undefined && u.wallet !== null ? u.wallet : (u.incomeWallet || 0);
        const fundWallet = u.fundWallet !== undefined && u.fundWallet !== null ? u.fundWallet : (u.fund_wallet || 0);

        // Calculated stats initialization
        let totalSponser = 0;
        let activeSponser = 0;
        let inActiveSponser = 0;
        let totalTeam = 0;
        let activeTeam = 0;
        let inActiveTeam = 0;

        let poolIncome = 0;
        let levelIncome = 0;
        let swasthya = 0;
        let garbhavati = 0;
        let kanya = 0;
        let aawas = 0;

        // 1. Referral & Team Stats
        try {
            const [sponserRes]: any = await pool.query(`
                SELECT 
                    (SELECT COUNT(1) FROM meddolic_user_details WHERE sponser_id = ?) AS totalSponser,
                    (SELECT COUNT(1) FROM meddolic_user_details WHERE sponser_id = ? AND topup_flag = 1) AS activeSponser,
                    (SELECT COUNT(1) FROM meddolic_user_details WHERE sponser_id = ? AND topup_flag = 0) AS inActiveSponser,
                    (SELECT COUNT(1) FROM meddolic_user_child_ids WHERE member_id = ? AND level BETWEEN 1 AND 16) AS totalTeam,
                    (SELECT COUNT(1) FROM meddolic_user_child_ids WHERE member_id = ? AND topup_status = 1 AND level BETWEEN 1 AND 16) AS activeTeam,
                    (SELECT COUNT(1) FROM meddolic_user_child_ids WHERE member_id = ? AND topup_status = 0 AND level BETWEEN 1 AND 16) AS inActiveTeam
            `, [memberId, memberId, memberId, memberId, memberId, memberId]);

            if (sponserRes && sponserRes.length > 0) {
                totalSponser = Number(sponserRes[0].totalSponser || 0);
                activeSponser = Number(sponserRes[0].activeSponser || 0);
                inActiveSponser = Number(sponserRes[0].inActiveSponser || 0);
                totalTeam = Number(sponserRes[0].totalTeam || 0);
                activeTeam = Number(sponserRes[0].activeTeam || 0);
                inActiveTeam = Number(sponserRes[0].inActiveTeam || 0);
            }
        } catch (e) {
            // Ignore if sub-tables do not exist
        }

        // 2. Pool Income
        try {
            const [poolRes]: any = await pool.query(
                'SELECT SUM(poolIncome) AS dailyIncome FROM meddolic_user_pool_income WHERE memberId = ?',
                [memberId]
            );
            if (poolRes && poolRes.length > 0 && poolRes[0].dailyIncome !== null) {
                poolIncome = Number(poolRes[0].dailyIncome);
            }
        } catch (e) {}

        // 3. Level Income
        try {
            const [levelRes]: any = await pool.query(
                'SELECT SUM(levelIncome) AS levelIncome FROM meddolic_user_level_income WHERE memberId = ?',
                [memberId]
            );
            if (levelRes && levelRes.length > 0 && levelRes[0].levelIncome !== null) {
                levelIncome = Number(levelRes[0].levelIncome);
            }
        } catch (e) {}

        // 4. Sahayata History (Option IDs: 1 = Swasthya, 2 = Garbhavati, 3 = Kanya, 4 = Aawas)
        try {
            const [sahayataRes]: any = await pool.query(`
                SELECT 
                    SUM(CASE WHEN optionId = 1 THEN sendAmount ELSE 0 END) AS swasthya,
                    SUM(CASE WHEN optionId = 2 THEN sendAmount ELSE 0 END) AS garbhavati,
                    SUM(CASE WHEN optionId = 3 THEN sendAmount ELSE 0 END) AS kanya,
                    SUM(CASE WHEN optionId = 4 THEN sendAmount ELSE 0 END) AS aawas
                FROM meddolic_user_sahayata_history 
                WHERE member_id = ? AND status = 1
            `, [memberId]);

            if (sahayataRes && sahayataRes.length > 0) {
                swasthya = Number(sahayataRes[0].swasthya || 0);
                garbhavati = Number(sahayataRes[0].garbhavati || 0);
                kanya = Number(sahayataRes[0].kanya || 0);
                aawas = Number(sahayataRes[0].aawas || 0);
            }
        } catch (e) {}

        const totalEarning = poolIncome + levelIncome;

        res.status(200).json({
            message: 'Welcome to Dashboard',
            user: {
                id: u.id,
                name: u.name || 'KUNDAN SHARMA',
                email: u.email_id || u.email,
                userId: userId,
                memberId: memberId,
                topupFlag: u.topup_flag !== undefined ? Number(u.topup_flag) : 1,
                wallet: Number(incomeWallet).toFixed(2),
                incomeWallet: Number(incomeWallet).toFixed(2),
                fundWallet: Number(fundWallet).toFixed(2),
                totalEarning: Number(totalEarning).toFixed(2),
                levelIncome: Number(levelIncome).toFixed(2),
                swasthya: Number(swasthya).toFixed(2),
                garbhavati: Number(garbhavati).toFixed(2),
                kanya: Number(kanya).toFixed(2),
                aawas: Number(aawas).toFixed(2),
                totalSponser: totalSponser,
                activeSponser: activeSponser,
                inActiveSponser: inActiveSponser,
                totalTeam: totalTeam,
                activeTeam: activeTeam,
                inActiveTeam: inActiveTeam,
                created_at: u.created_at
            }
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;