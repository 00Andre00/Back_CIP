import { Router } from 'express';
import { 
  crearReserva, 
  obtenerReservas, 
  actualizarEstadoPago, 
  eliminarReserva,
  obtenerHorariosDisponibles 
} from '../controllers/reservaController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Rutas públicas
router.get('/horarios-disponibles', obtenerHorariosDisponibles);
router.post('/', crearReserva);

// Rutas protegidas
router.get('/', authMiddleware, obtenerReservas);
router.patch('/:id', authMiddleware, actualizarEstadoPago);
router.delete('/:id', authMiddleware, eliminarReserva);

export default router;