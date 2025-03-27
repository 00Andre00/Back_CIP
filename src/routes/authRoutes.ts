import { Router } from 'express';
import { loginAdmin } from '../controllers/authController';
import { authMiddleware, isAdmin, checkTokenExpiration } from '../middlewares/authMiddleware';
import asyncHandler from 'express-async-handler';

const router = Router();

// Rutas públicas
router.post('/login', asyncHandler(loginAdmin)); // Maneja correctamente las promesas

// Rutas protegidas
router.get('/verify-token',
    authMiddleware, 
    checkTokenExpiration, 
    asyncHandler(async (req, res) => {
      res.status(200).json({ 
        success: true, 
        valid: true 
      });
    })
);

// Rutas protegidas solo para administradores
router.get('/admin-only', 
    authMiddleware, 
    checkTokenExpiration,
    isAdmin, 
    asyncHandler(async (req, res) => {
      res.status(200).json({ 
        success: true, 
        message: 'Acceso permitido' 
      });
    })
);

export default router;
