// En routes/pagoRoutes.ts
import express from 'express';
import { crearOrdenPago } from '../controllers/pagoController';

const router = express.Router();

router.post('/crear-orden', crearOrdenPago);

export default router;