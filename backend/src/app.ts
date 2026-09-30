import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import teamPurchaseRoutes from './routes/teamPurchaseRoutes';
import autopoolPurchaseRoutes from './routes/autopoolPurchaseRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/team-purchase', teamPurchaseRoutes);
app.use('/api/autopool-purchase', autopoolPurchaseRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('API is running smoothly...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});