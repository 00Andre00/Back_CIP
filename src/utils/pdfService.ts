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

// Función para formatear la fecha numérica (día/mes/año)
const formatearFechaNumerica = (fecha: Date): string => {
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const año = fecha.getFullYear();
  return `${dia}/${mes}/${año}`;
};

// Función para calcular la fecha de vigencia (un año después de la fecha de emisión)
const calcularFechaVigencia = (): Date => {
  const fechaEmision = new Date(); // Fecha de emisión del certificado (fecha actual)
  const fechaVigencia = new Date(fechaEmision);
  fechaVigencia.setFullYear(fechaEmision.getFullYear() + 1); // Sumar un año
  return fechaVigencia;
};

// Función para generar el código QR
const generarQR = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text);  // Genera el QR a partir de la URL
  } catch (error) {
    console.error('Error al generar el QR:', error);
    throw error;
  }
};

// Función para generar el PDF
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

// Función para agregar el encabezado al PDF
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
  const startX = leftMargin;

  const logoPath = path.join(process.cwd(), 'src', 'assets', 'logo2.png');
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
    .text('COLEGIO DE INGENIEROS DEL PERÚ', textX, textY, { width: textBlockWidth, align: 'center', lineGap: 2 });
  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('black')
    .text('Certificado de Habilidad', { width: textBlockWidth, align: 'center', lineGap: 2 });

  const lineY = headerY + Math.max(logoHeight, doc.y - headerY) + 10;
  doc.moveTo(leftMargin, lineY)
    .lineTo(pageWidth - rightMargin, lineY)
    .lineWidth(1)
    .strokeColor('#000')
    .stroke();

  doc.y = lineY + 20;
};

// Función para agregar la sección de vigencia con el cuadro rojo
const agregarVigencia = (doc: PDFDoc) => {
  const fechaVigencia = calcularFechaVigencia(); // Calcula la vigencia con base en la fecha actual

  const leftMargin = doc.page.margins.left;
  const topMargin = doc.y;
  const redBoxHeight = 25; // Altura del cuadro rojo
  const boxPadding = 5; // Espaciado dentro del cuadro

  // --- Dibuja el cuadro rojo con borde ---
  doc.rect(leftMargin, topMargin, 200, redBoxHeight)  // Cuadro rojo
     .fillColor('red')
     .fill();

  // --- Agrega el texto dentro del cuadro ---
  doc.fillColor('white')  // Texto blanco dentro del cuadro
     .font('Helvetica-Bold')
     .fontSize(11)
     .text(`DÍA ${fechaVigencia.getDate().toString().padStart(2, '0')}`, leftMargin + boxPadding, topMargin + boxPadding);

  doc.fillColor('white')  // Texto blanco dentro del cuadro
     .font('Helvetica-Bold')
     .fontSize(11)
     .text(`MES ${fechaVigencia.getMonth() + 1}`, leftMargin + boxPadding, topMargin + boxPadding + 12);

  doc.fillColor('white')  // Texto blanco dentro del cuadro
     .font('Helvetica-Bold')
     .fontSize(11)
     .text(`AÑO ${fechaVigencia.getFullYear()}`, leftMargin + boxPadding, topMargin + boxPadding + 24);

  // Avanzamos la posición del cursor después del cuadro para evitar solapamiento con el contenido siguiente
  doc.y = topMargin + redBoxHeight + 5; // Ajusta la posición después del cuadro
};

// Función para agregar la información del ingeniero
const agregarInformacionIngeniero = (doc: PDFDoc, ingeniero: Ingeniero) => {
  const left  = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const fs    = 11;
  const gap   = 0;
  const lineH = 0.7;

  // Dibuja “Etiqueta: VALOR _____” con subrayado hasta el margen derecho
  const drawField = (label: string, value: string) => {
    const y = doc.y;
    const lineOffset = 2; // Ajusta el valor según el desplazamiento deseado

    // Etiqueta
    doc.font('Helvetica').fontSize(fs).text(label, left, y);
    const labelW = doc.widthOfString(label);

    // Valor en negrita
    const valX = left + labelW;
    doc.font('Helvetica-Bold').text(value, valX, y);
    const valW = doc.widthOfString(value);

    // Línea de relleno
    const lineStart = valX + valW + gap;
    if (lineStart < right) {
      doc.moveTo(lineStart, y + fs + lineOffset)
         .lineTo(right,      y + fs + lineOffset)
         .lineWidth(lineH)
         .strokeColor('#000')
         .stroke();
    }
    doc.moveDown(1.3);
  };

  doc.font('Helvetica').fontSize(fs)
     .text('Los que suscriben certifican que:')
     .moveDown(0.8);

  drawField('El Ingeniero (a): ', `${ingeniero.apellidos} ${ingeniero.nombres}`.toUpperCase());
  drawField('Adscrito al Consejo Departamental de: ', ingeniero.consejoDepartamental.toUpperCase());
  drawField('Con Registro de Matrícula del CIP Nº: ', ingeniero.registroCIP);
  drawField('Fecha de Incorporación: ', formatearFechaNumerica(ingeniero.fechaIncorporacion));
  drawField('Especialidad: ', ingeniero.especialidad.toUpperCase());
};

// Función para generar el certificado en PDF
export const generarPDFCertificadoHabilidad = async (
  ingeniero: Ingeniero,
  certificadoId: string
): Promise<string> => {
  const pdfPath = path.join(tempDir, `certificado_habilidad_${Date.now()}.pdf`);

  return generarPDF(pdfPath, async (doc) => {
    doc.info.Title = 'Certificado de Habilidad - CIP';
    agregarEncabezado(doc);
    agregarInformacionIngeniero(doc, ingeniero);
    agregarVigencia(doc);  // Llamada para agregar la vigencia calculada
  });
};
