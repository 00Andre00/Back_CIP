import { Request, Response } from 'express';
import UsuarioNormal from '../models/UsuarioNormal';

export const crearUsuarioNormal = async (req: Request, res: Response) => {
    try {
        const { dni, nombre, apellido } = req.body;

        // Verificar si el usuario ya existe
        const usuarioExistente = await UsuarioNormal.findOne({ dni });
        if (usuarioExistente) {
            return res.status(400).json({ message: 'El usuario con ese DNI ya existe' });
        }

        // Crear el nuevo usuario
        const nuevoUsuario = await UsuarioNormal.create({
            dni,
            nombre,
            apellido,
        });

        return res.status(201).json({ message: 'Usuario creado correctamente', usuario: nuevoUsuario });
    } catch (error) {
        console.error('Error al crear el usuario normal:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};
