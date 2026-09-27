import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// 1. REGISTER
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ error: 'Please provide all required fields' });
            return;
        }

        // Check if user already exists
        const [existingUsers]: any = await pool.query(
            'SELECT * FROM meddolic_user_details WHERE email_id = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            res.status(400).json({ error: 'User already exists with this email' });
            return;
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert User
        await pool.query(
            'INSERT INTO meddolic_user_details (name, email_id, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 2. LOGIN (Using userId and password)
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            res.status(400).json({ error: 'Please provide user_id and password' });
            return;
        }

        // Find User by user_id
        const [users]: any = await pool.query(
            'SELECT * FROM meddolic_user_details WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            res.status(400).json({ error: 'Invalid user_id or password' });
            return;
        }

        const user = users[0];

        // Check Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ error: 'Invalid user_id or password' });
            return;
        }

        // Generate JWT Token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: '1h',
        });

        res.status(200).json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, userId: user.user_id },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};