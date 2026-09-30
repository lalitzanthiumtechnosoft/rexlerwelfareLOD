import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
import { pool } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'rexler-super-secret-key-2026';

export const registrationOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
        const [countries, states, districts]: any = await Promise.all([
            pool.query('SELECT country_id AS id, countryName AS name FROM meddolic_config_country_list WHERE status = 1 ORDER BY countryName'),
            pool.query('SELECT state_id AS id, stateName AS name FROM meddolic_config_state_list WHERE status = 1 ORDER BY stateName'),
            pool.query('SELECT district_id AS id, districtName AS name FROM meddolic_config_district_list WHERE status = 1 ORDER BY districtName')
        ]);

        res.status(200).json({
            countries: countries[0],
            states: states[0],
            districts: districts[0]
        });
    } catch (error: any) {
        console.error('Registration options error:', error.message);
        res.status(500).json({ error: 'Could not load registration options.' });
    }
};

export const lookupSponsor = async (req: Request, res: Response): Promise<void> => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    if (!userId) {
        res.status(400).json({ error: 'Enter a sponsor user ID.' });
        return;
    }

    try {
        const [sponsors]: any = await pool.query(`
            SELECT user_id AS userId, name
            FROM meddolic_user_details
            WHERE user_id = ? AND account_status = 1 AND topup_flag = 1
            LIMIT 1
        `, [userId]);

        if (!sponsors.length) {
            res.status(404).json({ error: 'Invalid or inactive sponsor ID.' });
            return;
        }
        res.status(200).json({ sponsor: sponsors[0] });
    } catch (error: any) {
        console.error('Sponsor lookup error:', error.message);
        res.status(500).json({ error: 'Could not verify sponsor.' });
    }
};

export const register = async (req: Request, res: Response): Promise<void> => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const sponsorId = typeof req.body?.sponsorId === 'string' ? req.body.sponsorId.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const transactionPassword = typeof req.body?.transactionPassword === 'string' ? req.body.transactionPassword : '';
    const countryId = Number(req.body?.countryId);
    const stateId = Number(req.body?.stateId);
    const districtId = Number(req.body?.districtId);

    if (!name || name.length > 120 || !sponsorId || !email || !phone || !password || !transactionPassword) {
        res.status(400).json({ error: 'Please complete all required fields.' });
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Enter a valid email address.' });
        return;
    }
    if (!/^\d{7,15}$/.test(phone)) {
        res.status(400).json({ error: 'Phone number must contain 7 to 15 digits.' });
        return;
    }
    if (password.length < 4 || password.length > 72 || transactionPassword.length < 4 || transactionPassword.length > 72) {
        res.status(400).json({ error: 'Passwords must be between 4 and 72 characters.' });
        return;
    }
    if (![countryId, stateId, districtId].every((id) => Number.isInteger(id) && id > 0)) {
        res.status(400).json({ error: 'Select a valid country, state, and district.' });
        return;
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [sponsors]: any = await connection.query(`
            SELECT member_id AS memberId, user_id AS userId, name
            FROM meddolic_user_details
            WHERE user_id = ? AND account_status = 1 AND topup_flag = 1
            LIMIT 1
            FOR UPDATE
        `, [sponsorId]);
        if (!sponsors.length) {
            await connection.rollback();
            res.status(400).json({ error: 'Invalid or inactive sponsor ID.' });
            return;
        }
        const sponsor = sponsors[0];

        const [referrals]: any = await connection.query(
            'SELECT COUNT(1) AS total FROM meddolic_user_details WHERE sponser_id = ?',
            [sponsor.memberId]
        );
        if (Number(referrals[0].total) >= 2) {
            await connection.rollback();
            res.status(400).json({ error: 'This sponsor has reached the referral limit. Try another sponsor.' });
            return;
        }

        const [phoneRows]: any = await connection.query(`
            SELECT member_id
            FROM meddolic_user_details
            WHERE phone = ?
            LIMIT 1
            FOR UPDATE
        `, [phone]);
        if (phoneRows.length) {
            await connection.rollback();
            res.status(409).json({ error: 'This phone number is already registered.' });
            return;
        }

        const [emailRows]: any = await connection.query(`
            SELECT member_id
            FROM meddolic_user_details
            WHERE email_id = ?
            LIMIT 1
            FOR UPDATE
        `, [email]);
        if (emailRows.length) {
            await connection.rollback();
            res.status(409).json({ error: 'This email is already registered.' });
            return;
        }

        const [validCountries]: any = await connection.query(
            'SELECT country_id FROM meddolic_config_country_list WHERE country_id = ? AND status = 1 LIMIT 1',
            [countryId]
        );
        const [validStates]: any = await connection.query(
            'SELECT state_id FROM meddolic_config_state_list WHERE state_id = ? AND status = 1 LIMIT 1',
            [stateId]
        );
        const [validDistricts]: any = await connection.query(
            'SELECT district_id FROM meddolic_config_district_list WHERE district_id = ? AND status = 1 LIMIT 1',
            [districtId]
        );
        if (!validCountries.length || !validStates.length || !validDistricts.length) {
            await connection.rollback();
            res.status(400).json({ error: 'Select a valid country, state, and district.' });
            return;
        }

        let userId = '';
        for (let attempt = 0; attempt < 20; attempt += 1) {
            const candidate = `RWF${randomInt(100000000, 1000000000)}`;
            const [matches]: any = await connection.query(
                'SELECT 1 FROM meddolic_user_details WHERE user_id = ? LIMIT 1',
                [candidate]
            );
            if (!matches.length) {
                userId = candidate;
                break;
            }
        }
        if (!userId) {
            await connection.rollback();
            res.status(503).json({ error: 'Could not create a unique user ID. Please try again.' });
            return;
        }

        const [insertResult]: any = await connection.query(`
            INSERT INTO meddolic_user_details
                (user_id, name, email_id, phone, password, trnPassword, sponser_id,
                 date_time, registerDueDate, countryId, stateId, districtId, UPIid, qrimage)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 5 DAY), ?, ?, ?, '', '')
        `, [userId, name, email, phone, password, transactionPassword, sponsor.memberId, countryId, stateId, districtId]);
        const memberId = Number(insertResult.insertId);

        const [ancestors]: any = await connection.query(`
            WITH RECURSIVE sponsor_chain AS (
                SELECT member_id AS memberId, sponser_id AS sponsorId, 1 AS level,
                    CAST(CONCAT(',', member_id, ',') AS CHAR(8192)) AS path
                FROM meddolic_user_details
                WHERE member_id = ?
                UNION ALL
                SELECT parent.member_id, parent.sponser_id, chain.level + 1,
                    CONCAT(chain.path, parent.member_id, ',')
                FROM sponsor_chain AS chain
                INNER JOIN meddolic_user_details AS parent
                    ON parent.member_id = chain.sponsorId
                WHERE chain.level < 512
                    AND chain.sponsorId IS NOT NULL
                    AND chain.sponsorId <> 0
                    AND LOCATE(CONCAT(',', parent.member_id, ','), chain.path) = 0
            )
            SELECT memberId, level FROM sponsor_chain ORDER BY level ASC
        `, [sponsor.memberId]);

        if (ancestors.length) {
            const values = ancestors.map((ancestor: any) => [ancestor.memberId, memberId, ancestor.level]);
            const placeholders = values.map(() => '(?, ?, ?, NOW())').join(', ');
            await connection.query(`
                INSERT INTO meddolic_user_child_ids (member_id, child_id, level, date_time)
                VALUES ${placeholders}
            `, values.flat());
        }

        await connection.commit();
        res.status(201).json({
            message: 'Account created successfully.',
            userId
        });
    } catch (error: any) {
        if (connection) await connection.rollback();
        console.error('Register Error:', error.message);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    } finally {
        connection?.release();
    }
};

// 2. LOGIN (Using userId and password)
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, password } = req.body;
        console.log('Login Request:', { userId });

        if (!userId || !password) {
            res.status(400).json({ error: 'Please provide user_id and password' });
            return;
        }

        // Find User by user_id
        const [users]: any = await pool.query(
            'SELECT * FROM meddolic_user_details WHERE user_id = ?',
            [userId.trim()]
        );

        if (!users || users.length === 0) {
            res.status(400).json({ error: 'Invalid user_id or password' });
            return;
        }

        const user = users[0];

        const storedPassword = String(user.password ?? '');
        const isHashedPassword = /^\$2[aby]\$/.test(storedPassword);
        const passwordMatches = isHashedPassword
            ? await bcrypt.compare(String(password), storedPassword)
            : String(password).trim() === storedPassword.trim();
        if (!passwordMatches) {
            res.status(400).json({ error: 'Invalid user_id or password' });
            return;
        }
        // Safe secret fallback in case JWT_SECRET is missing in .env
        const secretKey = process.env.JWT_SECRET || JWT_SECRET || 'rexler_secret_key_123';

        const token = jwt.sign(
            { id: user.member_id, email: user.email_id }, 
            secretKey, 
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.member_id,
                name: user.name,
                email: user.email_id,
                userId: user.user_id,
                topupFlag: Number(user.topup_flag ?? 0)
            },
        });
    } catch (error: any) {
        console.error('Login Error:', error);
        // Exact error message frontend par bhej rahe hain taaki aapko pata chale kya fail hua
        res.status(500).json({ 
            error: error.message || 'Internal Server Error' 
        });
    }
};