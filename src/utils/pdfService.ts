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
  generarContenido: (doc: PDFDoc) => void | Promise<void>
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    Promise.resolve(generarContenido(doc))
      .then(() => { doc.end(); })
      .catch(err => { reject(err); });

    writeStream.on('finish', () => resolve(pdfPath));
    writeStream.on('error', (error) => {
      console.error('Error al escribir el archivo PDF:', error);
      reject(error);
    });
  });
};

const agregarEncabezado = (doc: PDFDoc) => {
  const leftMargin = doc.page.margins.left;
  const rightMargin = doc.page.margins.right;
  const pageWidth = doc.page.width;
  const headerY = doc.page.margins.top;
  const offsetX = 10;
  const offsetY = 5;
  const logoWidth = 100;
  const logoHeight = 100;
  const gap = 2;
  const textBlockWidth = 300;
  const totalWidth = logoWidth + gap + textBlockWidth;
  const startX = leftMargin;  // Cambiar la posición del logo y texto para alinearlos a la izquierda.

  const logoPath = path.join(process.cwd(), 'src', 'assets', 'logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, startX - offsetX, headerY - offsetY, {
      width: logoWidth,
      height: logoHeight
    });
  } else {
    console.error('Logo no encontrado en la ruta:', logoPath);
  }

  const textX = startX + logoWidth + gap - offsetX;
  const textBlockHeight = 52;
  const textY = headerY + (logoHeight - textBlockHeight) / 2;

  doc.font('Helvetica-Bold')
    .fontSize(20)
    .fillColor('black')
    .text('DIÓCESIS DE HUÁNUCO', textX, textY, { width: textBlockWidth, align: 'left', lineGap: 2 });
  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('black')
    .text('PARTIDA DE MATRIMONIO', { width: textBlockWidth, align: 'left', lineGap: 2 });
  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('black')
    .text('Huánuco - Perú', { width: textBlockWidth, align: 'left', lineGap: 4 });

  const lineY = headerY + Math.max(logoHeight, doc.y - headerY) + 10;
  doc.moveTo(leftMargin, lineY)
    .lineTo(pageWidth - rightMargin, lineY)
    .lineWidth(1)
    .strokeColor('#000')
    .stroke();

  doc.y = lineY + 20;
};

const agregarTituloCertificado = (doc: PDFDoc, tipo: string) => {
  const leftMargin = doc.page.margins.left;
  const rightMargin = doc.page.margins.right;
  const pageWidth = doc.page.width;
  const availableWidth = pageWidth - leftMargin - rightMargin;
  const titulo = `CERTIFICADO DE ${tipo.toUpperCase()}`;

  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('black')
    .text(titulo, leftMargin, doc.y, { align: 'left', width: availableWidth, lineGap: 4 });
  doc.moveDown(1);
};

const agregarInformacionIngeniero = (doc: PDFDoc, ingeniero: Ingeniero) => {
  const nombreCompleto = `${ingeniero.apellidos} ${ingeniero.nombres}`.toUpperCase();
  const textoDescriptivo = 'El Ingeniero (a): ';
  const initialX = doc.page.margins.left + 20;  // Alineación más a la izquierda

  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoDescriptivo, initialX, doc.y);

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(nombreCompleto, initialX + doc.widthOfString(textoDescriptivo), doc.y);

  doc.moveDown(1);

  const consejo = ingeniero.consejoDepartamental.toUpperCase();
  const textoConsejo = 'Adscrito al Consejo Departamental de: ';
  const consejoX = doc.page.margins.left + 20;  // Alineación más a la izquierda
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoConsejo, consejoX, doc.y);

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(consejo, consejoX + doc.widthOfString(textoConsejo), doc.y);

  doc.moveDown(1);

  const registro = ingeniero.registroCIP;
  const textoRegistro = 'Con Registro de Matrícula del CIP Nº. ';
  const registroX = doc.page.margins.left + 20;  // Alineación más a la izquierda
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoRegistro, registroX, doc.y);

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(registro, registroX + doc.widthOfString(textoRegistro), doc.y);

  doc.moveDown(1);

  const fechaInc = formatearFechaNumerica(ingeniero.fechaIncorporacion);
  const textoFecha = 'Fecha de Incorporación: ';
  const fechaX = doc.page.margins.left + 20;  // Alineación más a la izquierda
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoFecha, fechaX, doc.y);

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(fechaInc, fechaX + doc.widthOfString(textoFecha), doc.y);

  doc.moveDown(1);

  const especialidad = ingeniero.especialidad.toUpperCase();
  const textoEspecialidad = 'Especialidad: ';
  const especialidadX = doc.page.margins.left + 20;  // Alineación más a la izquierda
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text(textoEspecialidad, especialidadX, doc.y);

  doc.font('Helvetica-Bold')
    .fillColor('black')
    .text(especialidad, especialidadX + doc.widthOfString(textoEspecialidad), doc.y);

  doc.moveDown(1);
};

const agregarPieCertificado = async (doc: PDFDoc, certificadoId: string) => {
  const verificationUrl = `${process.env.FRONTEND_URL || ''}/certificados/verificar/${certificadoId}`;
  const qrDataUrl = await generarQR(verificationUrl);
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrBuffer = Buffer.from(base64Data, 'base64');

  const qrSize = 80;
  const qrX = (doc.page.width - qrSize) / 2;
  const qrY = doc.page.height - 160;
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  doc.font('Helvetica')
    .fontSize(10)
    .fillColor('#666')
    .text(certificadoId, qrX, qrY + qrSize + 5, { width: qrSize, align: 'center' });

  const sealY = doc.page.height - 140;
  doc.font('Helvetica')
    .fontSize(12)
    .fillColor('#000')
    .text('Firma del Párroco', doc.page.width - doc.page.margins.right - 140, sealY, { width: 150, align: 'center' })
    .text('________________________', doc.page.width - doc.page.margins.right - 140, sealY + 20, { width: 150, align: 'center' })
    .text('Sello de la Parroquia', doc.page.width - doc.page.margins.right - 140, sealY + 60, { width: 150, align: 'center' });
};

const agregarSeccionServicioProfesional = (doc: PDFDoc) => {
  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('black')
    .text('De conformidad con la Ley Nº 28858, Ley que complementa a la Ley Nº 16053 del Ejercicio Profesional y el Estatuto del Colegio de Ingenieros del Perú, SE ENCUENTRA COLEGIADO Y HÁBIL, en consecuencia está autorizado para ejercer la Profesión de Ingeniero (a).', {
      align: 'left',
      lineGap: 15
    });
  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('ASUNTO', {
      align: 'left',
      lineGap: 5
    });
};

const agregarVigencia = (doc: PDFDoc, fechaVigencia: Date) => {
  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text('EL PRESENTE DOCUMENTO TIENE VIGENCIA HÁBIL A:', {
      align: 'left',
      lineGap: 10
    });

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('black')
    .text(`DÍA ${fechaVigencia.getDate().toString().padStart(2, '0')}`, {
      align: 'left',
      lineGap: 5
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
    await agregarPieCertificado(doc, certificadoId);
  });

};

