import { Request, Response } from 'express';
import Informacion from '../models/Informacion';

// Obtener la información
export const obtenerInformacion = async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar la información (asumimos que solo habrá un documento)
    let informacion = await Informacion.findOne();
    
    // Si no existe, creamos una con datos predeterminados
    if (!informacion) {
      informacion = await Informacion.create({
        periodo: 'Consejo Departamental de Huánuco (2025-2027)',
        fechaActualizacion: '23 de enero del 2025',
        telefono: '(062) 513560',
        direccion: 'Jr. 28 de Julio Nº 340 Cercado de Huánuco',
        horarioLV: '08:00 am a 13:00 y de 15:00 a 18:00 hrs',
        horarioSab: '08:00 am a 13:30 hrs',
        correo: 'cip.huanuco@cip.org.pe',
        web: 'https://ciphuanuco.org.pe/',
        facebook: 'https://www.facebook.com/huanucocipoficial',
        instagram: 'https://www.instagram.com/ciphuanucooficial/',
        directivos: [
          { nombre: 'FERNANDO HUSSERL ESPINOZA SOTO', cargo: 'Decano Departamental' },
          { nombre: 'RAUL CAJAHUANCA TORRES', cargo: 'Vicedecano Departamental' },
          { nombre: 'PATRICIA JUDITH MEZA BLACIDO', cargo: 'Directora Secretaria' },
          { nombre: 'LENIN SLIM MARQUEZ VISAG', cargo: 'Director Tesorero' },
          { nombre: 'BELISARIO ESTACIO LAGUNA', cargo: 'Director Pro Secretario' },
          { nombre: 'LUIS BERNARDINO MARTEL DOMINGUEZ', cargo: 'Director Pro Tesorero' }
        ]
      });
    }
    
    res.status(200).json({
      success: true,
      data: informacion
    });
  } catch (error) {
    console.error('Error al obtener información:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener la información',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Actualizar la información
export const actualizarInformacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      periodo, fechaActualizacion, telefono, direccion, horarioLV, 
      horarioSab, correo, web, facebook, instagram, directivos 
    } = req.body;
    
    // Buscar la información existente
    let informacion = await Informacion.findOne();
    
    // Si no existe, la creamos
    if (!informacion) {
      informacion = new Informacion({
        periodo, fechaActualizacion, telefono, direccion, horarioLV,
        horarioSab, correo, web, facebook, instagram, directivos
      });
    } else {
      // Si existe, actualizamos sus campos
      informacion.periodo = periodo;
      informacion.fechaActualizacion = fechaActualizacion;
      informacion.telefono = telefono;
      informacion.direccion = direccion;
      informacion.horarioLV = horarioLV;
      informacion.horarioSab = horarioSab;
      informacion.correo = correo;
      informacion.web = web;
      informacion.facebook = facebook;
      informacion.instagram = instagram;
      informacion.directivos = directivos;
    }
    
    // Guardar los cambios
    await informacion.save();
    
    res.status(200).json({
      success: true,
      mensaje: 'Información actualizada correctamente',
      data: informacion
    });
  } catch (error) {
    console.error('Error al actualizar información:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al actualizar la información',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};