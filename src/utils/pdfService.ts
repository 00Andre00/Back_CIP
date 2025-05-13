import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

type PDFDoc = InstanceType<typeof PDFDocument>;

interface Ingeniero {
  nombres: string;
  apellidos: string;
  registroCIP: string;
  fechaIncorporacion: Date;
  consejoDepartamental: string;
  especialidad: string;
}

const formatearFechaNumerica = (fecha: Date): string => {
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const año = fecha.getFullYear();
  return `${dia}/${mes}/${año}`;
};

const formatearFechaTexto = (fecha: Date): string => {
  const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];
  const dia = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  const año = fecha.getFullYear().toString().slice(-2); // Solo últimos dos dígitos
  return `${dia} de ${mes} del ${año}`;
};

const generarPDF = (
  pdfPath: string,
  generarContenido: (doc: PDFDoc) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
    });

    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    generarContenido(doc);
    doc.end();

    writeStream.on('finish', () => resolve(pdfPath));
    writeStream.on('error', reject);
  });
};

const agregarEncabezado = (doc: PDFDoc) => {
  // Título principal con subrayado
  const tituloTexto = 'COLEGIO DE INGENIEROS DEL PERÚ';

  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('#d65055')
    .text(tituloTexto, {
      align: 'center',
      lineGap: 10
    });

  // Calculamos el ancho del texto y su posición X para el subrayado
  const titleWidth = doc.widthOfString(tituloTexto);
  const titleX = (doc.page.width - titleWidth) / 2;

  // Añadir subrayado al título
  const yLine = doc.y - 10; // Ajustar según el espaciado deseado
  doc.moveTo(titleX, yLine)
    .lineTo(titleX + titleWidth, yLine)
    .lineWidth(1)
    .strokeColor('#d65055')
    .stroke();

  // Subtítulo
  doc.font('Helvetica-Bold')
    .fontSize(24)
    .fillColor('#d65055')
    .text('Certificado de Habilidad', {
      align: 'center',
      lineGap: 15
    });

  // Texto introductorio
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text('Los que suscriben certifican que:', {
      align: 'left',
      lineGap: 10
    });
};

const agregarInformacionIngeniero = (doc: PDFDoc, ingeniero: Ingeniero) => {
  // Prefijo e información del ingeniero (solo datos en mayúsculas)
  const nombreCompleto = `${ingeniero.apellidos} ${ingeniero.nombres}`.toUpperCase();

  // Texto descriptivo
  const textoDescriptivo = 'El Ingeniero (a): ';

  // Calculamos el ancho del texto descriptivo ANTES de renderizarlo
  const anchoTextoDescriptivo = doc.widthOfString(textoDescriptivo);

  // Guarda la posición X inicial
  const initialX = doc.x;

  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoDescriptivo, {
      continued: true
    });

  // La posición X donde comienza el valor es exactamente initialX + anchoTextoDescriptivo
  const nombreStartX = initialX + anchoTextoDescriptivo;

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(nombreCompleto);

  // Subrayado para el nombre - solo subrayar el valor, no todo desde el margen
  const nombreWidth = doc.widthOfString(nombreCompleto);
  const startY = doc.y - 3; // Ajustar según el espaciado deseado

  doc.moveTo(nombreStartX, startY)
    .lineTo(nombreStartX + nombreWidth, startY)
    .lineWidth(0.5)
    .strokeColor('black')
    .stroke();

  doc.moveDown(1);

  // Consejo departamental
  const consejo = ingeniero.consejoDepartamental.toUpperCase();
  const textoConsejo = 'Adscrito al Consejo Departamental de: ';
  const anchoTextoConsejo = doc.widthOfString(textoConsejo);

  // Resetea la posición X para la nueva línea
  doc.x = initialX;

  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoConsejo, {
      continued: true
    });

  const consejoStartX = initialX + anchoTextoConsejo;

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(consejo);

  // Subrayado solo para el valor del consejo
  const consejoWidth = doc.widthOfString(consejo);
  const consejoY = doc.y - 3;

  doc.moveTo(consejoStartX, consejoY)
    .lineTo(consejoStartX + consejoWidth, consejoY)
    .lineWidth(0.5)
    .strokeColor('black')
    .stroke();

  doc.moveDown(0.5);

  // Registro CIP
  const registro = ingeniero.registroCIP;
  const textoRegistro = 'Con Registro de Matrícula del CIP Nº. ';
  const anchoTextoRegistro = doc.widthOfString(textoRegistro);

  // Resetea la posición X para la nueva línea
  doc.x = initialX;

  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoRegistro, {
      continued: true
    });

  const registroStartX = initialX + anchoTextoRegistro;

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(registro);

  // Subrayado solo para el valor del registro
  const regWidth = doc.widthOfString(registro);
  const regY = doc.y - 3;

  doc.moveTo(registroStartX, regY)
    .lineTo(registroStartX + regWidth, regY)
    .lineWidth(0.5)
    .strokeColor('black')
    .stroke();

  doc.moveDown(0.5);

  // Fecha de incorporación
  const fechaInc = formatearFechaNumerica(ingeniero.fechaIncorporacion);
  const textoFecha = 'Fecha de Incorporación: ';
  const anchoTextoFecha = doc.widthOfString(textoFecha);

  // Resetea la posición X para la nueva línea
  doc.x = initialX;

  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoFecha, {
      continued: true
    });

  const fechaStartX = initialX + anchoTextoFecha;

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(fechaInc);

  // Subrayado solo para el valor de la fecha
  const fechaWidth = doc.widthOfString(fechaInc);
  const fechaY = doc.y - 3;

  doc.moveTo(fechaStartX, fechaY)
    .lineTo(fechaStartX + fechaWidth, fechaY)
    .lineWidth(0.5)
    .strokeColor('black')
    .stroke();

  doc.moveDown(0.5);

  // Especialidad
  const especialidad = ingeniero.especialidad.toUpperCase();
  const textoEspecialidad = 'Especialidad: ';
  const anchoTextoEspecialidad = doc.widthOfString(textoEspecialidad);

  // Resetea la posición X para la nueva línea
  doc.x = initialX;

  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoEspecialidad, {
      continued: true
    });

  const especialidadStartX = initialX + anchoTextoEspecialidad;

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(especialidad);

  // Subrayado solo para el valor de la especialidad
  const especialidadWidth = doc.widthOfString(especialidad);
  const especialidadY = doc.y - 3;

  doc.moveTo(especialidadStartX, especialidadY)
    .lineTo(especialidadStartX + especialidadWidth, especialidadY)
    .lineWidth(0.5)
    .strokeColor('black')
    .stroke();

  doc.moveDown(1);
}
const agregarSeccionServicioProfesional = (doc: PDFDoc) => {
  // Texto legal
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text('De conformidad con la Ley Nº 28858, Ley que complementa a la Ley Nº 16053 del Ejercicio Profesional y el Estatuto del Colegio de Ingenieros del Perú, SE ENCUENTRA COLEGIADO Y HÁBIL, en consecuencia está autorizado para ejercer la Profesión de Ingeniero (a).', {
      align: 'left',
      lineGap: 15
    });
  // Contenido del servicio profesional
  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('ASUNTO', {
      align: 'left',
      lineGap: 5
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('ENTIDAD O PROPIETARIO', {
      align: 'left',
      lineGap: 5
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('LUGAR', {
      align: 'left',
      lineGap: 10
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('SERVICIO PROFESIONAL', {
      align: 'left',
      lineGap: 10
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('PÚBLICO Y/O PRIVADO', {
      align: 'left',
      lineGap: 10
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('A NIVEL NACIONAL', {
      align: 'left',
      lineGap: 15
    });

  // Línea divisoria inferior
  doc.moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .lineWidth(1)
    .strokeColor('black')
    .stroke();

  doc.moveDown(1);
};

const agregarVigencia = (doc: PDFDoc, fechaVigencia: Date) => {
  // Título de la sección
  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('EL PRESENTE DOCUMENTO TIENE VIGENCIA HÁBIL A:', {
      align: 'left',
      lineGap: 10
    });

  // Valores de vigencia
  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text(`DÍA ${fechaVigencia.getDate().toString().padStart(2, '0')}`, {
      align: 'left',
      lineGap: 5
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text(`MES ${(fechaVigencia.getMonth() + 1).toString().padStart(2, '0')}`, {
      align: 'left',
      lineGap: 5
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text(`AÑO ${fechaVigencia.getFullYear()}`, {
      align: 'left',
      lineGap: 15
    });
};

const agregarPiePagina = (doc: PDFDoc, lugar: string, fecha: Date) => {
  // Lugar y fecha
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(`${lugar.toUpperCase()}, ${formatearFechaTexto(fecha)}`, {
      align: 'left',
      lineGap: 15
    });

  // Línea divisoria
  doc.moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .lineWidth(1)
    .strokeColor('black')
    .stroke();

  doc.moveDown(1);

  // Texto "VÁLIDO SOLO ORIGINAL"
  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('VÁLIDO SOLO ORIGINAL', {
      align: 'left',
      lineGap: 10
    });

  // Firma
  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('Ing. María del Carmen Ponce Mejía', {
      align: 'right',
      lineGap: 5
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('Decana Nacional', {
      align: 'right',
      lineGap: 5
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('Colegio de Ingenieros del Perú', {
      align: 'right'
    });
};

export const generarPDFCertificadoHabilidad = async (
  ingeniero: Ingeniero,
  fechaVigencia: Date
): Promise<string> => {
  const pdfPath = path.join(tempDir, `certificado_habilidad_${Date.now()}.pdf`);

  return generarPDF(pdfPath, (doc) => {
    // Configuración inicial
    doc.info.Title = 'Certificado de Habilidad - CIP';

    // Contenido en orden exacto
    agregarEncabezado(doc);
    agregarInformacionIngeniero(doc, ingeniero);
    agregarSeccionServicioProfesional(doc);
    agregarVigencia(doc, fechaVigencia);
    agregarPiePagina(doc, 'HUANUCO', new Date());
  });
};