import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import bodyParser from 'body-parser';
import reservaRoutes from './routes/reservaRoutes';
import usuarioNormalRoutes from './routes/usuarioNormalRoutes';
import certificadoRoutes from './routes/certificadoRoutes';
import cors from 'cors'; // Importa cors
import pagoRoutes from './routes/pagoRoutes';
import cron from 'node-cron';
import { limpiarReservasPendientes } from './controllers/reservaController';

//Actuales
import afiliadoRoutes from './routes/afiliadoRoutes';




// Configurar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

// Inicializar la aplicación
const app = express();

// Configurar CORS
// Configurar CORS de manera más flexible
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  '', // Agrega tu dominio de producción real
  // Puedes agregar más dominios permitidos aquí
];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir solicitudes sin origen (como Postman, curl, o solicitudes del mismo origen)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log(`Origen bloqueado por CORS: ${origin}`);
      const msg = 'La política CORS para este sitio no permite acceso desde el origen especificado.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.json());

// Ruta de prueba básica
app.get('/', (req: Request, res: Response) => {
  res.send('¡API funcionando con TypeScript! 🚀');
});

// Nueva ruta para exponer las variables de configuración
app.get('/config', (req: Request, res: Response) => {
  res.json({
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL,
  });
});

// Rutas
//actuales
app.use('/api/afiliados', afiliadoRoutes);

//nteriores
app.use('/api/auth', authRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/usuarios', usuarioNormalRoutes);
app.use('/api/certificados', certificadoRoutes);
// Agregar rutas de pagos
app.use('/api/pagos', pagoRoutes);


cron.schedule('*/5 * * * *', async () => {
  console.log('Ejecutando limpieza de reservas pendientes...');
  await limpiarReservasPendientes();
});

// Iniciar el servidor
const PORT = process.env.PORT || 6000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});