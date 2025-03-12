import { Router } from 'express';
import { crearUsuarioNormal } from '../controllers/usuarioNormalController';

const router = Router();

router.post('/', crearUsuarioNormal as any);

export default router;
