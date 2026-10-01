import { randomBytes } from 'crypto';
import { Router, Response } from 'express';
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
        const [[subjects], [priorities], [outbox], [inbox]]: any = await Promise.all([
            pool.query('SELECT subjectId AS id, subjectName AS name FROM meddolic_config_support_subject WHERE subjectStatus = 1 ORDER BY subjectName'),
            pool.query('SELECT priorityId AS id, priorityName AS name FROM meddolic_config_support_priority WHERE priorityStatus = 1 ORDER BY priorityId'),
            pool.query(`
                SELECT
                    ticket.ticketId AS id,
                    ticket.ticketCode,
                    subject.subjectName,
                    ticket.ticketMessage,
                    priority.priorityName,
                    ticket.raiseDate,
                    ticket.actionDate,
                    ticket.ticketStatus
                FROM meddolic_user_support_ticket AS ticket
                LEFT JOIN meddolic_config_support_subject AS subject ON subject.subjectId = ticket.subjectId
                LEFT JOIN meddolic_config_support_priority AS priority ON priority.priorityId = ticket.priorityId
                WHERE ticket.memberId = ?
                ORDER BY ticket.raiseDate DESC, ticket.ticketId DESC
            `, [memberId]),
            pool.query(`
                SELECT
                    ticket.ticketId AS id,
                    ticket.ticketCode,
                    subject.subjectName,
                    ticket.adminMessage,
                    ticket.actionDate,
                    ticket.ticketStatus
                FROM meddolic_user_support_ticket AS ticket
                LEFT JOIN meddolic_config_support_subject AS subject ON subject.subjectId = ticket.subjectId
                WHERE ticket.memberId = ?
                    AND ticket.adminMessage IS NOT NULL
                    AND ticket.adminMessage <> ''
                ORDER BY ticket.actionDate DESC, ticket.ticketId DESC
            `, [memberId])
        ]);

        res.status(200).json({
            subjects,
            priorities,
            outbox,
            inbox,
            canCreateTicket: !outbox.some((ticket: any) => ticket.ticketStatus === 1 || ticket.ticketStatus === 2)
        });
    } catch (error: any) {
        console.error('Support page load error:', error.message);
        res.status(500).json({ error: 'Failed to load support tickets.' });
    }
});

router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.id ?? req.user?.memberId;
    const subjectId = Number(req.body?.subjectId);
    const priorityId = Number(req.body?.priorityId);
    const ticketMessage = typeof req.body?.ticketMessage === 'string' ? req.body.ticketMessage.trim() : '';

    if (memberId == null) {
        res.status(401).json({ error: 'Invalid session token.' });
        return;
    }
    if (!Number.isInteger(subjectId) || subjectId < 1 || !Number.isInteger(priorityId) || priorityId < 1) {
        res.status(400).json({ error: 'Select a valid subject and priority.' });
        return;
    }
    if (ticketMessage.length < 5 || ticketMessage.length > 5000) {
        res.status(400).json({ error: 'Message must be between 5 and 5,000 characters.' });
        return;
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [members]: any = await connection.query(
            'SELECT member_id FROM meddolic_user_details WHERE member_id = ? FOR UPDATE',
            [memberId]
        );
        if (members.length === 0) {
            await connection.rollback();
            res.status(404).json({ error: 'User account not found.' });
            return;
        }

        const [activeTickets]: any = await connection.query(
            'SELECT ticketId FROM meddolic_user_support_ticket WHERE memberId = ? AND ticketStatus IN (1, 2) LIMIT 1',
            [memberId]
        );
        if (activeTickets.length > 0) {
            await connection.rollback();
            res.status(400).json({ error: 'Your previous support request is still open or being processed.' });
            return;
        }

        const [[subjects], [priorities]]: any = await Promise.all([
            connection.query('SELECT subjectId FROM meddolic_config_support_subject WHERE subjectId = ? AND subjectStatus = 1 LIMIT 1', [subjectId]),
            connection.query('SELECT priorityId FROM meddolic_config_support_priority WHERE priorityId = ? AND priorityStatus = 1 LIMIT 1', [priorityId])
        ]);
        if (subjects.length === 0 || priorities.length === 0) {
            await connection.rollback();
            res.status(400).json({ error: 'Selected subject or priority is no longer available.' });
            return;
        }

        const ticketCode = `SUP${Date.now()}${memberId}${randomBytes(2).toString('hex').toUpperCase()}`;
        const [insertResult]: any = await connection.query(`
            INSERT INTO meddolic_user_support_ticket
                (memberId, ticketCode, subjectId, priorityId, ticketMessage, raiseDate, ticketStatus)
            VALUES (?, ?, ?, ?, ?, NOW(), 1)
        `, [memberId, ticketCode, subjectId, priorityId, ticketMessage]);

        await connection.commit();
        res.status(201).json({
            message: 'Support ticket raised successfully.',
            ticket: { id: insertResult.insertId, ticketCode }
        });
    } catch (error: any) {
        if (connection) await connection.rollback().catch(() => undefined);
        console.error('Support ticket create error:', error.message);
        res.status(500).json({ error: 'Failed to create support ticket.' });
    } finally {
        connection?.release();
    }
});

export default router;