import express from 'express';
import { 
  crearAfiliado, 
  obtenerAfiliados, 
  obtenerAfiliadoPorId,
  actualizarInfoAfiliacion,
  
  eliminarAfiliado
} from '../controllers/afiliadoController';

const router = express.Router();

// Rutas para afiliados
router.post('/', crearAfiliado);
router.get('/', obtenerAfiliados);

router.get('/:id', obtenerAfiliadoPorId);
router.put('/:id', actualizarInfoAfiliacion);
router.delete('/:id', eliminarAfiliado);

export default router;