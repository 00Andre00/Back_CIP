import express from 'express';
import {
  verificarCipExistente,
  crearAfiliado,
  obtenerAfiliados,
  obtenerAfiliadoPorId,
  actualizarInfoAfiliacion,
  eliminarAfiliado,
  obtenerAfiliadoPorCIP
} from '../controllers/afiliadoController';

import {
  crearPreferenciaAfiliado,
  verificarPagoAfiliado,
  webhookPagoAfiliado,
  reservarPago,
  obtenerEstadoPagoAfiliado
} from '../controllers/pagoController'; // Asumiendo que separaste el controlador de pagos

const router = express.Router();

// === RUTAS DE AFILIADOS ===
router.get('/verificar-cip/:cip', verificarCipExistente);
router.post('/', crearAfiliado);
router.get('/', obtenerAfiliados);
router.get('/:id', obtenerAfiliadoPorId);
router.get('/cip/:cipNumero', obtenerAfiliadoPorCIP);
router.put('/:id/afiliacion', actualizarInfoAfiliacion);
router.delete('/:id', eliminarAfiliado);

// === RUTAS DE PAGOS MERCADOPAGO ===
router.post('/create_preference', crearPreferenciaAfiliado);
router.get('/verificar-pago', verificarPagoAfiliado);
router.post('/webhook-pago', webhookPagoAfiliado);
router.post('/reservar-pago', reservarPago);
router.get('/estado-pago/:afiliadoId', obtenerEstadoPagoAfiliado);

export default router;