import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

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

const generarQR = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text);  // Genera el QR a partir de la URL
  } catch (error) {
    console.error('Error al generar el QR:', error);
    throw error;
  }
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
      align: 'center',
      lineGap: 10
    });
};

const agregarInformacionIngeniero = (doc: PDFDoc, ingeniero: Ingeniero) => {
  // Prefijo e información del ingeniero (solo datos en mayúsculas)
  const nombreCompleto = `${ingeniero.apellidos} ${ingeniero.nombres}`.toUpperCase();

  const textoDescriptivo = 'El Ingeniero (a): ';
  const initialX = (doc.page.width - doc.widthOfString(textoDescriptivo + nombreCompleto)) / 2;

  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoDescriptivo, initialX, doc.y);

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(nombreCompleto, initialX + doc.widthOfString(textoDescriptivo), doc.y);

  doc.moveDown(1);

  // Consejo departamental
  const consejo = ingeniero.consejoDepartamental.toUpperCase();
  const textoConsejo = 'Adscrito al Consejo Departamental de: ';
  const consejoX = (doc.page.width - doc.widthOfString(textoConsejo + consejo)) / 2;
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoConsejo, consejoX, doc.y);

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(consejo, consejoX + doc.widthOfString(textoConsejo), doc.y);

  doc.moveDown(1);

  // Registro CIP
  const registro = ingeniero.registroCIP;
  const textoRegistro = 'Con Registro de Matrícula del CIP Nº. ';
  const registroX = (doc.page.width - doc.widthOfString(textoRegistro + registro)) / 2;
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoRegistro, registroX, doc.y);

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(registro, registroX + doc.widthOfString(textoRegistro), doc.y);

  doc.moveDown(1);

  // Fecha de incorporación
  const fechaInc = formatearFechaNumerica(ingeniero.fechaIncorporacion);
  const textoFecha = 'Fecha de Incorporación: ';
  const fechaX = (doc.page.width - doc.widthOfString(textoFecha + fechaInc)) / 2;
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoFecha, fechaX, doc.y);

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(fechaInc, fechaX + doc.widthOfString(textoFecha), doc.y);

  doc.moveDown(1);

  // Especialidad
  const especialidad = ingeniero.especialidad.toUpperCase();
  const textoEspecialidad = 'Especialidad: ';
  const especialidadX = (doc.page.width - doc.widthOfString(textoEspecialidad + especialidad)) / 2;
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoEspecialidad, especialidadX, doc.y);

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(especialidad, especialidadX + doc.widthOfString(textoEspecialidad), doc.y);

  doc.moveDown(1);
};

const agregarPiePagina = async (doc: PDFDoc, lugar: string, fecha: Date, certificadoId: string) => {
  const qrUrl = `${process.env.FRONTEND_URL || ''}/certificados/verificar/${certificadoId}`;
  const qrDataUrl = await generarQR(qrUrl);
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrBuffer = Buffer.from(base64Data, 'base64');

  const qrSize = 80;
  const qrX = (doc.page.width - qrSize) / 2;
  const qrY = doc.page.height - 140;

  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  // Código QR debajo de "VÁLIDO SOLO ORIGINAL"
  doc.font('Helvetica')
    .fontSize(10)
    .fillColor('#666')
    .text(certificadoId, qrX, qrY + qrSize + 5, { width: qrSize, align: 'center' });

  // Lugar y fecha
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(`${lugar.toUpperCase()}, ${formatearFechaTexto(fecha)}`, {
      align: 'center',
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
      align: 'center',
      lineGap: 10
    });

  // Firma
  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('Ing. María del Carmen Ponce Mejía', {
      align: 'center',
      lineGap: 5
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('Decana Nacional', {
      align: 'center',
      lineGap: 5
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('Colegio de Ingenieros del Perú', {
      align: 'center'
    });
};

export const generarPDFCertificadoHabilidad = async (
  ingeniero: Ingeniero,
  fechaVigencia: Date,
  certificadoId: string
): Promise<string> => {
  const pdfPath = path.join(tempDir, `certificado_habilidad_${Date.now()}.pdf`);

  return generarPDF(pdfPath, async (doc) => {
    doc.info.Title = 'Certificado de Habilidad - CIP';
    agregarEncabezado(doc);
    agregarInformacionIngeniero(doc, ingeniero);
    agregarSeccionServicioProfesional(doc);
    agregarVigencia(doc, fechaVigencia);
    await agregarPiePagina(doc, 'HUANUCO', new Date(), certificadoId);
  });
};
function agregarSeccionServicioProfesional(doc: any) {
  throw new Error('Function not implemented.');
}

function agregarVigencia(doc: any, fechaVigencia: Date) {
  throw new Error('Function not implemented.');
}

