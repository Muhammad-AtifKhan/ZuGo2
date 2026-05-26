import express from 'express';
import { passengerSignup, transporterSignup, login } from '../controllers/authController';

const router = express.Router();

router.post('/passenger/signup', passengerSignup);
router.post('/transporter/signup', transporterSignup);
router.post('/login', login);

export default router;
