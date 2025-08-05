// nombre de archivo index.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import bodyParser from 'body-parser';
import usuarioNormalRoutes from './routes/usuarioNormalRoutes';
import cors from 'cors'; // Importa cors
import pagoRoutes from './routes/pagoRoutes';  


import certificadoRoutes from './routes/certificadoRoutes';

//Actuales
import afiliadoRoutes from './routes/afiliadoRoutes';

// Configurar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

// Inicializar la aplicación
const app = express();


const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://cip.sistemasudh.com',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Check']
};

app.use(cors(corsOptions)); // Habilitar CORS con las opciones definidas
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

//anteriores
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioNormalRoutes);
app.use('/api/pagos', pagoRoutes);


app.use('/api/certificados', certificadoRoutes);



// Iniciar el servidor
const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});