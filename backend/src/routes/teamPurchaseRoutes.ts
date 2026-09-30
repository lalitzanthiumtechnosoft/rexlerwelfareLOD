import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '../middleware/authMiddleware';
import { pool } from '../config/db';

const router = Router();
const PACKAGE_ID = 1;

const getMemberId = (req: AuthRequest): number | null => {
    const value = Number(req.user?.id ?? req.user?.memberId);
    return Number.isInteger(value) && value > 0 ? value : null;
};

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = getMemberId(req);
    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }

    try {
        const [walletRows, packageRows, historyRows]: any = await Promise.all([
            pool.query(
                'SELECT fundWallet FROM meddolic_user_details WHERE member_id = ? LIMIT 1',
                [memberId]
            ),
            pool.query(
                'SELECT packageId, upgradeIncome AS packagePrice FROM meddolic_config_package_type WHERE packageId = ? LIMIT 1',
                [PACKAGE_ID]
            ),
            pool.query(`
                SELECT history.*
                FROM (
                    SELECT
                        activation.dateTime,
                        activation.packageId,
                        activation.packagePrice,
                        beneficiary.user_id AS userId,
                        beneficiary.name,
                        purchaser.user_id AS purchaserId,
                        purchaser.name AS purchaserName
                    FROM meddolic_user_team_activation_details AS activation
                    INNER JOIN meddolic_user_details AS beneficiary
                        ON beneficiary.member_id = activation.memberId
                    INNER JOIN meddolic_user_details AS purchaser
                        ON purchaser.member_id = activation.activateBy
                    WHERE activation.activateBy = ?
                    UNION ALL
                    SELECT
                        activation.dateTime,
                        activation.packageId,
                        activation.packagePrice,
                        beneficiary.user_id AS userId,
                        beneficiary.name,
                        purchaser.user_id AS purchaserId,
                        purchaser.name AS purchaserName
                    FROM meddolic_user_team_activation_details AS activation
                    INNER JOIN meddolic_user_details AS beneficiary
                        ON beneficiary.member_id = activation.memberId
                    INNER JOIN meddolic_user_details AS purchaser
                        ON purchaser.member_id = activation.activateBy
                    WHERE activation.memberId = ?
                        AND activation.activateBy <> ?
                ) AS history
                ORDER BY history.dateTime DESC
                LIMIT 100
            `, [memberId, memberId, memberId])
        ]);

        const wallets = walletRows[0] as any[];
        const packages = packageRows[0] as any[];
        const history = historyRows[0] as any[];
        if (!wallets.length) {
            res.status(404).json({ error: 'Member not found.' });
            return;
        }
        if (!packages.length) {
            res.status(404).json({ error: 'Package configuration not found.' });
            return;
        }

        res.status(200).json({
            wallet: Number(wallets[0].fundWallet ?? 0),
            package: packages[0],
            history
        });
    } catch (error: any) {
        console.error('Team purchase data error:', error.message);
        res.status(500).json({ error: 'Failed to load team purchase data.' });
    }
});

router.get('/lookup', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    if (!userId) {
        res.status(400).json({ error: 'Enter a valid user ID.' });
        return;
    }

    try {
        const [users]: any = await pool.query(`
            SELECT user_id AS userId, name
            FROM meddolic_user_details
            WHERE user_id = ? AND user_type = 2 AND account_status = 1
            LIMIT 1
        `, [userId]);

        if (!users.length) {
            res.status(404).json({ error: 'Active member not found.' });
            return;
        }
        res.status(200).json({ member: users[0] });
    } catch (error: any) {
        console.error('Team purchase member lookup error:', error.message);
        res.status(500).json({ error: 'Failed to verify member.' });
    }
});

router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const purchaserId = getMemberId(req);
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    if (purchaserId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }
    if (!userId) {
        res.status(400).json({ error: 'Enter the member user ID.' });
        return;
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [purchasers]: any = await connection.query(`
            SELECT member_id AS memberId, fundWallet
            FROM meddolic_user_details
            WHERE member_id = ?
            LIMIT 1
            FOR UPDATE
        `, [purchaserId]);
        if (!purchasers.length) {
            await connection.rollback();
            res.status(404).json({ error: 'Purchasing member not found.' });
            return;
        }

        const [members]: any = await connection.query(`
            SELECT member_id AS memberId, sponser_id AS sponsorId, topup_flag AS topupFlag
            FROM meddolic_user_details
            WHERE user_id = ? AND user_type = 2 AND account_status = 1
            LIMIT 1
            FOR UPDATE
        `, [userId]);
        if (!members.length) {
            await connection.rollback();
            res.status(404).json({ error: 'Active member not found.' });
            return;
        }

        const member = members[0];
        const memberId = Number(member.memberId);
        const currentWallet = Number(purchasers[0].fundWallet ?? 0);

        const [packageRows]: any = await connection.query(`
            SELECT packageId, upgradeIncome, incomeDays
            FROM meddolic_config_package_type
            WHERE packageId = ?
            LIMIT 1
        `, [PACKAGE_ID]);
        if (!packageRows.length) {
            await connection.rollback();
            res.status(404).json({ error: 'Package configuration not found.' });
            return;
        }

        const packagePrice = Number(packageRows[0].upgradeIncome);
        if (!Number.isFinite(packagePrice) || packagePrice <= 0) {
            await connection.rollback();
            res.status(500).json({ error: 'Package price is not configured correctly.' });
            return;
        }
        if (currentWallet < packagePrice) {
            await connection.rollback();
            res.status(400).json({ error: 'Insufficient balance in fund wallet.' });
            return;
        }

        const [existingActivations]: any = await connection.query(`
            SELECT 1
            FROM meddolic_user_team_activation_details
            WHERE memberId = ? AND packageId = ?
            LIMIT 1
            FOR UPDATE
        `, [memberId, PACKAGE_ID]);
        if (existingActivations.length) {
            await connection.rollback();
            res.status(409).json({ error: 'This member has already purchased this package.' });
            return;
        }

        if (Number(member.topupFlag) === 0) {
            await connection.query(`
                UPDATE meddolic_user_details
                SET topup_flag = 1, activation_date = NOW()
                WHERE member_id = ?
            `, [memberId]);
            await connection.query(`
                UPDATE meddolic_user_child_ids
                SET topup_status = 1, topup_date = NOW()
                WHERE child_id = ?
            `, [memberId]);
        }

        const [activationResult]: any = await connection.query(`
            INSERT INTO meddolic_user_team_activation_details
                (memberId, sponserId, activateBy, packageId, packagePrice, dateTime)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [memberId, member.sponsorId ?? null, purchaserId, PACKAGE_ID, packagePrice]);
        const purchaseId = activationResult.insertId;

        const [walletResult]: any = await connection.query(`
            UPDATE meddolic_user_details
            SET fundWallet = fundWallet - ?
            WHERE member_id = ? AND fundWallet >= ?
        `, [packagePrice, purchaserId, packagePrice]);
        if (walletResult.affectedRows !== 1) {
            await connection.rollback();
            res.status(400).json({ error: 'Insufficient balance in fund wallet.' });
            return;
        }

        await connection.query(`
            INSERT INTO meddolic_user_wallet_statement
                (member_id, wallet_statement_id, deb_cr, amount, date_time, trn_id)
            VALUES (?, 8, 1, ?, NOW(), ?)
        `, [purchaserId, packagePrice, purchaseId]);

        const [eligibleSummaries]: any = await connection.query(`
            WITH RECURSIVE sponsor_chain AS (
                SELECT details.sponser_id AS memberId, 1 AS level
                FROM meddolic_user_details AS details
                WHERE details.member_id = ?
                UNION ALL
                SELECT parent.sponser_id AS memberId, chain.level + 1 AS level
                FROM sponsor_chain AS chain
                INNER JOIN meddolic_user_details AS parent
                    ON parent.member_id = chain.memberId
                WHERE chain.level < 16
                    AND parent.sponser_id IS NOT NULL
                    AND parent.sponser_id <> 0
            ), active_counts AS (
                SELECT chain.memberId, chain.level, COUNT(child.child_id) AS totalMembers
                FROM sponsor_chain AS chain
                INNER JOIN meddolic_user_details AS sponsor
                    ON sponsor.member_id = chain.memberId
                    AND sponsor.topup_flag = 1
                LEFT JOIN meddolic_user_child_ids AS child
                    ON child.member_id = chain.memberId
                    AND child.level = chain.level
                    AND child.topup_status = 1
                GROUP BY chain.memberId, chain.level
            )
            SELECT
                active_counts.memberId,
                active_counts.level,
                package.dailyIncome,
                package.upgradeIncome,
                package.incomeDays
            FROM active_counts
            INNER JOIN meddolic_config_package_type AS package
                ON package.packageId = active_counts.level
            WHERE active_counts.totalMembers > 0
                AND MOD(active_counts.totalMembers, POW(2, active_counts.level)) = 0
                AND NOT EXISTS (
                    SELECT 1
                    FROM meddolic_user_level_income_summary AS summary
                    WHERE summary.memberId = active_counts.memberId
                        AND summary.level = active_counts.level
                )
        `, [memberId]);

        if (eligibleSummaries.length) {
            const values = eligibleSummaries.map((summary: any) => [
                summary.memberId,
                summary.dailyIncome,
                summary.level,
                summary.upgradeIncome,
                summary.level,
                summary.incomeDays
            ]);
            const placeholders = values.map(() => '(?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), NOW(), ?)').join(', ');
            await connection.query(`
                INSERT INTO meddolic_user_level_income_summary
                    (memberId, dailyLevelIncome, level, packagePrice, packageId, dueDate, dateTime, incomeDays)
                VALUES ${placeholders}
            `, values.flat());
        }

        await connection.commit();
        res.status(200).json({
            message: 'Package purchased successfully.',
            purchaseId,
            packagePrice,
            wallet: currentWallet - packagePrice
        });
    } catch (error: any) {
        if (connection) await connection.rollback();
        console.error('Team package purchase error:', error.message);
        res.status(500).json({ error: 'Package purchase failed. No wallet changes were kept.' });
    } finally {
        connection?.release();
    }
});

export default router;