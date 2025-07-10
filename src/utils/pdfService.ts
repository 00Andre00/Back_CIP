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
  const tituloTexto = 'COLEGIO DE INGENIEROS DEL PERÚ';

  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('#d65055')
    .text(tituloTexto, {
      align: 'center',
      lineGap: 10
    });

  const titleWidth = doc.widthOfString(tituloTexto);
  const titleX = (doc.page.width - titleWidth) / 2;
  const yLine = doc.y - 10;
  doc.moveTo(titleX, yLine)
    .lineTo(titleX + titleWidth, yLine)
    .lineWidth(1)
    .strokeColor('#d65055')
    .stroke();

  doc.font('Helvetica-Bold')
    .fontSize(24)
    .fillColor('#d65055')
    .text('Certificado de Habilidad', {
      align: 'center',
      lineGap: 15
    });

  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text('Los que suscriben certifican que:', {
      align: 'left',
      lineGap: 10
    });
};

const agregarInformacionIngeniero = (doc: PDFDoc, ingeniero: Ingeniero) => {
  const nombreCompleto = `${ingeniero.apellidos} ${ingeniero.nombres}`.toUpperCase();
  const textoDescriptivo = 'El Ingeniero (a): ';
  const anchoTextoDescriptivo = doc.widthOfString(textoDescriptivo);

  const initialX = doc.x;

  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoDescriptivo, {
      continued: true
    });

  const nombreStartX = initialX + anchoTextoDescriptivo;
  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(nombreCompleto);

  const nombreWidth = doc.widthOfString(nombreCompleto);
  const startY = doc.y - 3;

  doc.moveTo(nombreStartX, startY)
    .lineTo(nombreStartX + nombreWidth, startY)
    .lineWidth(0.5)
    .strokeColor('black')
    .stroke();

  doc.moveDown(1);

  const consejo = ingeniero.consejoDepartamental.toUpperCase();
  const textoConsejo = 'Adscrito al Consejo Departamental de: ';
  const anchoTextoConsejo = doc.widthOfString(textoConsejo);

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

  const consejoWidth = doc.widthOfString(consejo);
  const consejoY = doc.y - 3;

  doc.moveTo(consejoStartX, consejoY)
    .lineTo(consejoStartX + consejoWidth, consejoY)
    .lineWidth(0.5)
    .strokeColor('black')
    .stroke();

  doc.moveDown(0.5);

  const registro = ingeniero.registroCIP;
  const textoRegistro = 'Con Registro de Matrícula del CIP Nº. ';
  const anchoTextoRegistro = doc.widthOfString(textoRegistro);

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

  const regWidth = doc.widthOfString(registro);
  const regY = doc.y - 3;

  doc.moveTo(registroStartX, regY)
    .lineTo(registroStartX + regWidth, regY)
    .lineWidth(0.5)
    .strokeColor('black')
    .stroke();

  doc.moveDown(0.5);

  const fechaInc = formatearFechaNumerica(ingeniero.fechaIncorporacion);
  const textoFecha = 'Fecha de Incorporación: ';
  const anchoTextoFecha = doc.widthOfString(textoFecha);

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

  const fechaWidth = doc.widthOfString(fechaInc);
  const fechaY = doc.y - 3;

  doc.moveTo(fechaStartX, fechaY)
    .lineTo(fechaStartX + fechaWidth, fechaY)
    .lineWidth(0.5)
    .strokeColor('black')
    .stroke();

  doc.moveDown(0.5);

  const especialidad = ingeniero.especialidad.toUpperCase();
  const textoEspecialidad = 'Especialidad: ';
  const anchoTextoEspecialidad = doc.widthOfString(textoEspecialidad);

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

  const especialidadWidth = doc.widthOfString(especialidad);
  const especialidadY = doc.y - 3;

  doc.moveTo(especialidadStartX, especialidadY)
    .lineTo(especialidadStartX + especialidadWidth, especialidadY)
    .lineWidth(0.5)
    .strokeColor('black')
    .stroke();

  doc.moveDown(1);
}

const agregarPiePagina = (doc: PDFDoc, lugar: string, fecha: Date) => {
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(`${lugar.toUpperCase()}, ${formatearFechaTexto(fecha)}`, {
      align: 'left',
      lineGap: 15
    });

  doc.moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .lineWidth(1)
    .strokeColor('black')
    .stroke();

  doc.moveDown(1);

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('VÁLIDO SOLO ORIGINAL', {
      align: 'left',
      lineGap: 10
    });

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

// Exportamos la función
export const generarPDFCertificadoHabilidad = async (
  ingeniero: Ingeniero,
  fechaVigencia: Date
): Promise<string> => {
  const pdfPath = path.join(tempDir, `certificado_habilidad_${Date.now()}.pdf`);

  return generarPDF(pdfPath, (doc) => {
    doc.info.Title = 'Certificado de Habilidad - CIP';
    agregarEncabezado(doc);
    agregarInformacionIngeniero(doc, ingeniero);
    agregarPiePagina(doc, 'HUANUCO', new Date());
  });
};
