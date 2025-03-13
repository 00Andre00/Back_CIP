import express from 'express';
import { 
  crearAfiliado, 
  obtenerAfiliados, 
  obtenerAfiliadoPorId,
  verificarCodigoCip
} from '../controllers/afiliadoController';

const router = express.Router();

// Rutas para afiliados
router.post('/', crearAfiliado);
router.get('/', obtenerAfiliados);
router.get('/:id', obtenerAfiliadoPorId);
router.get('/verificar/:codigoCip', verificarCodigoCip);

export default router;