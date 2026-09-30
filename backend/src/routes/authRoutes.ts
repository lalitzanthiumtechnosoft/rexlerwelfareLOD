import { Router } from 'express';
import { register, login, lookupSponsor, registrationOptions } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.get('/registration-options', registrationOptions);
router.get('/sponsor', lookupSponsor);
router.post('/login', login);

export default router;