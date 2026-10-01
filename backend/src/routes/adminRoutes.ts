import { Router, Response } from 'express';
import { AuthRequest, verifyAdminToken } from '../middleware/authMiddleware';
import { pool } from '../config/db';

const router = Router();

const getIndiaDate = (): string => {
    const dateParts = new Map(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(new Date()).map((part) => [part.type, part.value])
    );
    return `${dateParts.get('year')}-${dateParts.get('month')}-${dateParts.get('day')}`;
};

const isValidDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

router.get('/members', verifyAdminToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const today = getIndiaDate();
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    const searchValue = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : '';
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : '';
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const page = Number(req.query.page || 1);
    const pageSize = 10;

    if ((Boolean(fromDate) !== Boolean(toDate)) || (fromDate && (!isValidDate(fromDate) || !isValidDate(toDate) || fromDate > toDate))) {
        res.status(400).json({ error: 'Enter a valid date range.' });
        return;
    }
    if (userId.length > 50 || searchValue.length > 100 || !['all', 'active', 'inactive'].includes(status) || !Number.isInteger(page) || page < 1 || page > 100000) {
        res.status(400).json({ error: 'Invalid member search filters.' });
        return;
    }

    const conditions = [
        'member.user_type = 2',
        'member.member_id <> 1'
    ];
    const parameters: Array<string | number> = [];
    if (fromDate && toDate) {
        conditions.push('member.date_time >= ?', 'member.date_time < DATE_ADD(?, INTERVAL 1 DAY)');
        parameters.push(fromDate, toDate);
    }
    if (userId) {
        conditions.push('member.user_id = ?');
        parameters.push(userId);
    }
    if (searchValue) {
        conditions.push('(member.user_id LIKE ? OR member.name LIKE ? OR member.phone LIKE ? OR member.email_id LIKE ? OR CAST(member.member_id AS CHAR) LIKE ?)');
        const searchPattern = `%${searchValue}%`;
        parameters.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    if (status === 'active') conditions.push('member.topup_flag = 1');
    if (status === 'inactive') conditions.push('member.topup_flag = 0');

    try {
        const [members]: any = await pool.query(`
            SELECT
                member.member_id AS memberId,
                member.user_id AS userId,
                member.name,
                member.phone,
                member.email_id AS email,
                member.sponser_id AS sponsorMemberId,
                sponsor.user_id AS sponsorUserId,
                sponsor.name AS sponsorName,
                member.date_time AS joinedAt,
                member.topup_flag AS topupFlag,
                member.account_status AS accountStatus
            FROM meddolic_user_details AS member
            LEFT JOIN meddolic_user_details AS sponsor ON sponsor.member_id = member.sponser_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY member.date_time DESC, member.member_id DESC
            LIMIT ? OFFSET ?
        `, [...parameters, pageSize, (page - 1) * pageSize]);
        const [countRows]: any = await pool.query(`
            SELECT COUNT(1) AS total
            FROM meddolic_user_details AS member
            WHERE ${conditions.join(' AND ')}
        `, parameters);

        const total = Number(countRows[0]?.total || 0);
        res.status(200).json({
            members,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        });
    } catch (error: any) {
        console.error('Admin member search error:', error.message);
        res.status(500).json({ error: 'Failed to load members.' });
    }
});

router.get('/members/:memberId', verifyAdminToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = Number(req.params.memberId);
    if (!Number.isInteger(memberId) || memberId <= 1) {
        res.status(400).json({ error: 'Invalid member ID.' });
        return;
    }

    try {
        const [members]: any = await pool.query(`
            SELECT
                member.member_id AS memberId,
                member.user_id AS userId,
                member.name,
                member.phone,
                member.email_id AS email,
                member.sponser_id AS sponsorMemberId,
                sponsor.user_id AS sponsorUserId,
                sponsor.name AS sponsorName,
                member.date_time AS joinedAt,
                member.activation_date AS activationDate,
                member.topup_flag AS topupFlag,
                member.account_status AS accountStatus,
                member.acName AS accountHolderName,
                member.ifsc,
                member.bank AS bankName,
                member.branch,
                member.accountNo AS accountNumber,
                member.panNo AS panNumber
            FROM meddolic_user_details AS member
            LEFT JOIN meddolic_user_details AS sponsor ON sponsor.member_id = member.sponser_id
            WHERE member.member_id = ? AND member.user_type = 2
            LIMIT 1
        `, [memberId]);

        if (members.length === 0) {
            res.status(404).json({ error: 'Member not found.' });
            return;
        }
        res.status(200).json({ member: members[0] });
    } catch (error: any) {
        console.error('Admin member details error:', error.message);
        res.status(500).json({ error: 'Failed to load member details.' });
    }
});

router.patch('/members/:memberId/status', verifyAdminToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = Number(req.params.memberId);
    const accountStatus = Number(req.body?.accountStatus);
    if (!Number.isInteger(memberId) || memberId <= 1 || ![0, 1].includes(accountStatus)) {
        res.status(400).json({ error: 'Invalid member or account status.' });
        return;
    }

    try {
        const [result]: any = await pool.query(
            'UPDATE meddolic_user_details SET account_status = ? WHERE member_id = ? AND user_type = 2',
            [accountStatus, memberId]
        );
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Member not found.' });
            return;
        }
        res.status(200).json({ message: accountStatus === 1 ? 'Member unblocked.' : 'Member blocked.' });
    } catch (error: any) {
        console.error('Admin member status update error:', error.message);
        res.status(500).json({ error: 'Failed to update member status.' });
    }
});

router.get('/dashboard', verifyAdminToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id;
    if (memberId == null) {
        res.status(401).json({ error: 'Invalid administrator session.' });
        return;
    }

    try {
        const [[admins], [userCounts], [walletTotals], [businessTotals], [todayBusiness], [withdrawals], [pendingWithdrawals]]: any = await Promise.all([
            pool.query('SELECT user_id AS userId, name FROM meddolic_user_details WHERE member_id = ? AND user_type = 1 AND account_status = 1 LIMIT 1', [memberId]),
            pool.query(`
                SELECT
                    COUNT(1) AS totalUsers,
                    SUM(CASE WHEN topup_flag = 1 THEN 1 ELSE 0 END) AS activeUsers,
                    SUM(CASE WHEN topup_flag = 0 THEN 1 ELSE 0 END) AS inactiveUsers
                FROM meddolic_user_details
                WHERE user_type = 2
            `),
            pool.query('SELECT COALESCE(SUM(wallet), 0) AS incomeWalletOutstanding, COALESCE(SUM(fundWallet), 0) AS purchaseWalletOutstanding FROM meddolic_user_details'),
            pool.query(`
                SELECT
                    (SELECT COALESCE(SUM(packagePrice), 0) FROM meddolic_user_activation_details) AS retailBusiness,
                    (SELECT COALESCE(SUM(packagePrice), 0) FROM meddolic_user_team_activation_details) AS teamBusiness
            `),
            pool.query(`
                SELECT
                    (SELECT COALESCE(SUM(packagePrice), 0) FROM meddolic_user_activation_details WHERE DATE(dateTime) = ?) AS retailBusiness,
                    (SELECT COALESCE(SUM(packagePrice), 0) FROM meddolic_user_team_activation_details WHERE DATE(dateTime) = ?) AS teamBusiness
            `, [getIndiaDate(), getIndiaDate()]),
            pool.query('SELECT COALESCE(SUM(amount), 0) AS totalWithdrawals FROM meddolic_user_wallet_withdrawal_crypto WHERE released IN (0, 1)'),
            pool.query('SELECT COALESCE(SUM(amount), 0) AS pendingWithdrawals FROM meddolic_user_wallet_withdrawal_crypto WHERE released IN (0, 4)')
        ]);

        if (admins.length === 0) {
            res.status(403).json({ error: 'Administrator account is no longer active.' });
            return;
        }

        const totalBusiness = Number(businessTotals[0].retailBusiness || 0) + Number(businessTotals[0].teamBusiness || 0);
        const totalTodayBusiness = Number(todayBusiness[0].retailBusiness || 0) + Number(todayBusiness[0].teamBusiness || 0);

        res.status(200).json({
            admin: { userId: admins[0].userId, name: admins[0].name },
            stats: {
                totalUsers: Number(userCounts[0].totalUsers || 0),
                activeUsers: Number(userCounts[0].activeUsers || 0),
                inactiveUsers: Number(userCounts[0].inactiveUsers || 0),
                totalBusiness,
                todayBusiness: totalTodayBusiness,
                incomeWalletOutstanding: Number(walletTotals[0].incomeWalletOutstanding || 0),
                purchaseWalletOutstanding: Number(walletTotals[0].purchaseWalletOutstanding || 0),
                totalWithdrawals: Number(withdrawals[0].totalWithdrawals || 0),
                pendingWithdrawals: Number(pendingWithdrawals[0].pendingWithdrawals || 0),
                totalRewards: null
            },
            referralUrl: `/?affiliateCode=${encodeURIComponent(admins[0].userId)}`
        });
    } catch (error: any) {
        console.error('Admin dashboard load error:', error.message);
        res.status(500).json({ error: 'Failed to load administrator dashboard.' });
    }
});

export default router;