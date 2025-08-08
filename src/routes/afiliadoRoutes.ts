// nombre: afiliadoRoutes.ts
import { Router } from 'express';
import {
  crearAfiliado,
  obtenerAfiliados,
  obtenerAfiliadoPorId,
  obtenerAfiliadoPorCIP,
  actualizarInfoAfiliacion,
  eliminarAfiliado,
  verificarCipExistente,
  crearMensualidadesAfiliado,
  actualizarMensualidad,
} from '../controllers/afiliadoController';

const router = Router();

// Verificar CIP
router.get('/verificar-cip/:cip', verificarCipExistente);

// Crear afiliado
router.post('/', crearAfiliado);

// Obtener todos los afiliados
router.get('/', obtenerAfiliados);

// Obtener afiliado por ID
router.get('/:id', obtenerAfiliadoPorId);

// Obtener afiliado por CIP
router.get('/cip/:cipNumero', obtenerAfiliadoPorCIP);

// Actualizar información de afiliación
router.put('/:id/info-afiliacion', actualizarInfoAfiliacion);

// Eliminar afiliado
router.delete('/:id', eliminarAfiliado);

// Crear mensualidades para un afiliado
router.post('/:id/mensualidades', crearMensualidadesAfiliado);

// Actualizar estado de una mensualidad
router.put('/mensualidades/:mensualidadId', actualizarMensualidad);

export default router;