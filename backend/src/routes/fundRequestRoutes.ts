import { randomUUID } from 'crypto';
import { mkdirSync, promises as fs } from 'fs';
import path from 'path';
import { Router, Response, Request, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware';
import { pool } from '../config/db';

const router = Router();
const uploadDirectory = path.resolve(__dirname, '../../uploads/fund-requests');
mkdirSync(uploadDirectory, { recursive: true });

const allowedImageTypes: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif'
};

const uploadSlip = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, callback) => callback(null, uploadDirectory),
        filename: (_req, file, callback) => callback(null, `${randomUUID()}${allowedImageTypes[file.mimetype] || '.upload'}`)
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => callback(null, Boolean(allowedImageTypes[file.mimetype]))
});

const handleSlipUpload = (req: Request, res: Response, next: NextFunction): void => {
    uploadSlip.single('transactionImage')(req, res, (error: unknown) => {
        if (error) {
            const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
                ? 'Payment slip must be 5 MB or smaller.'
                : 'Could not upload payment slip. Use a JPG, PNG, or GIF image.';
            res.status(400).json({ error: message });
            return;
        }
        next();
    });
};

const removeUploadedSlip = async (filePath?: string): Promise<void> => {
    if (filePath) await fs.unlink(filePath).catch(() => undefined);
};

router.get('/payment-modes/:paymentId', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const paymentId = Number(req.params.paymentId);
    if (!Number.isInteger(paymentId) || paymentId < 1) {
        res.status(400).json({ error: 'Select a valid payment mode.' });
        return;
    }

    try {
        const [modes]: any = await pool.query(
            'SELECT payment_id AS id, paymentName AS name, paymentAddress AS address, paymentImage AS image FROM meddolic_config_payment_details WHERE payment_id = ? AND status = 1 LIMIT 1',
            [paymentId]
        );
        if (modes.length === 0) {
            res.status(404).json({ error: 'Payment mode is not available.' });
            return;
        }
        res.status(200).json({ paymentMode: modes[0] });
    } catch (error: any) {
        console.error('Fund request payment details error:', error.message);
        res.status(500).json({ error: 'Failed to load payment details.' });
    }
});

router.get('/requests/:requestId/receipt', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    const requestId = Number(req.params.requestId);
    if (memberId == null || !Number.isInteger(requestId) || requestId < 1) {
        res.status(400).json({ error: 'Invalid fund request.' });
        return;
    }

    try {
        const [requests]: any = await pool.query(
            'SELECT transactionImage FROM meddolic_user_fund_request WHERE id = ? AND member_id = ? LIMIT 1',
            [requestId, memberId]
        );
        if (requests.length === 0) {
            res.status(404).json({ error: 'Payment slip not found.' });
            return;
        }

        const fileName = path.basename(String(requests[0].transactionImage || ''));
        const filePath = path.resolve(uploadDirectory, fileName);
        if (!fileName || !filePath.startsWith(`${uploadDirectory}${path.sep}`)) {
            res.status(404).json({ error: 'Payment slip not found.' });
            return;
        }
        res.sendFile(filePath, (error) => {
            if (error && !res.headersSent) res.status(404).json({ error: 'Payment slip file is unavailable.' });
        });
    } catch (error: any) {
        console.error('Fund request receipt error:', error.message);
        res.status(500).json({ error: 'Failed to load payment slip.' });
    }
});

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }

    try {
        const [[users], [paymentModes], [requests]]: any = await Promise.all([
            pool.query('SELECT user_id AS userId, name, fundWallet FROM meddolic_user_details WHERE member_id = ? LIMIT 1', [memberId]),
            pool.query('SELECT payment_id AS id, paymentName AS name FROM meddolic_config_payment_details WHERE status = 1 ORDER BY payment_id ASC'),
            pool.query(`
                SELECT
                    request.id,
                    request.user_id AS userId,
                    request.name,
                    request.requestFund AS amount,
                    request.date_time AS requestDate,
                    request.paymentHash AS transactionId,
                    request.payment_id AS paymentId,
                    payment.paymentName AS paymentMode,
                    request.transactionImage,
                    request.status
                FROM meddolic_user_fund_request AS request
                LEFT JOIN meddolic_config_payment_details AS payment
                    ON payment.payment_id = request.payment_id
                WHERE request.member_id = ?
                ORDER BY request.date_time DESC, request.id DESC
            `, [memberId])
        ]);

        if (users.length === 0) {
            res.status(404).json({ error: 'User account not found.' });
            return;
        }

        res.status(200).json({
            user: { userId: users[0].userId, name: users[0].name, fundWallet: Number(users[0].fundWallet || 0) },
            paymentModes,
            requests
        });
    } catch (error: any) {
        console.error('Fund request page load error:', error.message);
        res.status(500).json({ error: 'Failed to load fund request data.' });
    }
});

router.post('/', verifyToken, handleSlipUpload, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    const amount = Number(req.body?.requestFund);
    const paymentId = Number(req.body?.paymentId);
    const paymentHash = typeof req.body?.paymentHash === 'string' ? req.body.paymentHash.trim() : '';
    const transactionPassword = typeof req.body?.transactionPassword === 'string' ? req.body.transactionPassword : '';
    const uploadedSlip = req.file;

    const rejectRequest = async (status: number, message: string): Promise<void> => {
        await removeUploadedSlip(uploadedSlip?.path);
        res.status(status).json({ error: message });
    };

    if (memberId == null) {
        await rejectRequest(401, 'Invalid session token.');
        return;
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
        await rejectRequest(400, 'Fund amount must be greater than zero and no more than 99,999,999.99.');
        return;
    }
    if (!Number.isInteger(paymentId) || paymentId < 1 || !paymentHash || paymentHash.length > 1000) {
        await rejectRequest(400, 'Select a payment mode and enter a valid transaction ID.');
        return;
    }
    if (!transactionPassword) {
        await rejectRequest(400, 'Transaction password is required.');
        return;
    }
    if (!uploadedSlip) {
        await rejectRequest(400, 'Upload a JPG, PNG, or GIF payment slip no larger than 5 MB.');
        return;
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [users]: any = await connection.query(
            'SELECT user_id AS userId, name, trnPassword FROM meddolic_user_details WHERE member_id = ? FOR UPDATE',
            [memberId]
        );
        if (users.length === 0) {
            await connection.rollback();
            await rejectRequest(404, 'User account not found.');
            return;
        }

        const storedPassword = String(users[0].trnPassword ?? '');
        const isHashedPassword = /^\$2[aby]\$/.test(storedPassword);
        const passwordMatches = isHashedPassword
            ? await bcrypt.compare(transactionPassword, storedPassword)
            : transactionPassword.trim() === storedPassword.trim();
        if (!passwordMatches) {
            await connection.rollback();
            await rejectRequest(400, 'Transaction password is incorrect.');
            return;
        }

        const [paymentModes]: any = await connection.query(
            'SELECT payment_id FROM meddolic_config_payment_details WHERE payment_id = ? AND status = 1 LIMIT 1',
            [paymentId]
        );
        if (paymentModes.length === 0) {
            await connection.rollback();
            await rejectRequest(400, 'Selected payment mode is no longer available.');
            return;
        }

        const [pendingRequests]: any = await connection.query(
            'SELECT id FROM meddolic_user_fund_request WHERE member_id = ? AND status = 0 LIMIT 1',
            [memberId]
        );
        if (pendingRequests.length > 0) {
            await connection.rollback();
            await rejectRequest(400, 'Your previous fund request is still pending.');
            return;
        }

        const [duplicateHashes]: any = await connection.query(
            'SELECT id FROM meddolic_user_fund_request WHERE member_id = ? AND paymentHash = ? LIMIT 1',
            [memberId, paymentHash]
        );
        if (duplicateHashes.length > 0) {
            await connection.rollback();
            await rejectRequest(400, 'This transaction ID has already been used.');
            return;
        }

        const receiptFileName = path.basename(uploadedSlip.filename);
        await connection.query(`
            INSERT INTO meddolic_user_fund_request
                (member_id, name, user_id, requestFund, paymentDate, paymentHash, transactionImage, date_time, status, payment_id)
            VALUES (?, ?, ?, ?, CURDATE(), ?, ?, NOW(), 0, ?)
        `, [memberId, users[0].name, users[0].userId, amount, paymentHash, receiptFileName, paymentId]);

        await connection.commit();
        res.status(201).json({ message: 'Fund request submitted successfully.' });
    } catch (error: any) {
        if (connection) await connection.rollback().catch(() => undefined);
        await removeUploadedSlip(uploadedSlip?.path);
        console.error('Fund request submit error:', error.message);
        res.status(500).json({ error: 'Failed to submit fund request.' });
    } finally {
        connection?.release();
    }
});

export default router;