import { Router } from 'express';
import { loginAdmin } from '../controllers/authController';
import asyncHandler from 'express-async-handler';

const router = Router();
router.post('/login', asyncHandler(loginAdmin)); // Maneja correctamente las promesas

export default router;
