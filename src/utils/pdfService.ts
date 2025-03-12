import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Alias para el tipo de instancia de PDFDocument
type PDFDoc = InstanceType<typeof PDFDocument>;

interface Usuario {
  nombre: string;
  apellido: string;
}

interface Certificado {
  fechaCompra?: Date; // Se utiliza la fecha de compra
  _id: string;
  // Datos comunes
  oficiante?: string;
  padrinos?: string;
  // Bautismo:
  padre?: string;
  madre?: string;
  distrito?: string;      // Nuevo campo
  provincia?: string;     // Nuevo campo
  departamento?: string;  // Nuevo campo
  fechaNacimiento?: Date;
  fechaBautismo?: Date;
  // Confirmación:
  // (El campo "nombreConfirmado" fue eliminado)
  // Matrimonio:
  esposo?: string;
  esposa?: string;
  lugarNacimientoEsposo?: string;
  papaEsposo?: string;
  mamaEsposo?: string;
  lugarNacimientoEsposa?: string;
  papaEsposa?: string;
  mamaEsposa?: string;
  fechaMatrimonio?: Date;
  testigos?: string;
}

// Función auxiliar para formatear fechas consistentemente
const formatearFecha = (fecha: Date | undefined): string => {
  if (!fecha) {
    return 'fecha no registrada';
  }
  
  // Configuramos específicamente para Perú
  return fecha.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Lima'
  });
};

// Función auxiliar para obtener la fecha de emisión usando únicamente la fecha de compra
const obtenerFechaEmision = (fechaCompra?: Date): Date => {
  if (fechaCompra) {
    return fechaCompra;
  }
  const now = new Date();
  const peruOffset = -5 * 60; // UTC-5 en minutos
  const utcOffset = now.getTimezoneOffset();
  return new Date(now.getTime() + (utcOffset + peruOffset) * 60 * 1000);
};

const logoPath = path.join(process.cwd(), 'src', 'assets', 'logo.png');

const generarQR = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text);
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
  const startX = (pageWidth - totalWidth) / 2;

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
    .text('DIÓCESIS DE HUÁNUCO', textX, textY, { width: textBlockWidth, align: 'center', lineGap: 2 });
  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('black')
    .text('PARTIDA DE MATRIMONIO', { width: textBlockWidth, align: 'center', lineGap: 2 });
  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('black')
    .text('Huánuco - Perú', { width: textBlockWidth, align: 'center', lineGap: 4 });

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
    .text(titulo, leftMargin, doc.y, { align: 'center', width: availableWidth, lineGap: 4 });
  doc.moveDown(1);
};

function escribirLineaConFormato(doc: PDFDoc, line: string, availableWidth: number) {
  const segments = line.split(/(\*\*.*?\*\*)/g);
  segments.forEach((segment, index) => {
    const isBold = segment.startsWith('**') && segment.endsWith('**');
    if (isBold) {
      segment = segment.slice(2, -2);
      doc.font('Helvetica-Bold');
    } else {
      doc.font('Helvetica');
    }
    doc.text(segment, {
      lineGap: 10,
      width: availableWidth,
      align: 'left',
      continued: index < segments.length - 1,
    });
  });
}

const agregarCuerpoCertificadoPersonalizado = (doc: PDFDoc, mensaje: string) => {
  const leftMargin = doc.page.margins.left;
  const availableWidth = doc.page.width - leftMargin - doc.page.margins.right;
  const lines = mensaje.split('\n');
  lines.forEach((line) => {
    escribirLineaConFormato(doc, line, availableWidth);
    doc.text('', { continued: false });
    doc.moveDown(0.5);
  });
  doc.moveDown(0.5);
};

const agregarPieCertificado = async (doc: PDFDoc, certificadoId: string) => {
  const verificationUrl = `${process.env.FRONTEND_URL || ''}/certificados/verificar/${certificadoId}`;
  const qrDataUrl = await generarQR(verificationUrl);
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrBuffer = Buffer.from(base64Data, 'base64');

  const qrSize = 80;
  const qrX = doc.page.margins.left;
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

/**  
 * Certificado de Confirmación.
 */
const generarPDFConfirmacion = async (usuario: Usuario, certificado: Certificado): Promise<string> => {
  const pdfPath = path.join(__dirname, `../../temp/certificado_confirmacion_${Date.now()}.pdf`);
  return generarPDF(pdfPath, async (doc) => {
    agregarEncabezado(doc);
    agregarTituloCertificado(doc, 'Confirmación');

    // Se utiliza la fecha de compra para la fecha de emisión
    const fechaEmision = obtenerFechaEmision(certificado.fechaCompra);
    const fechaConfirmacion = formatearFecha(fechaEmision);
    const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;

    const mensaje = 
`En el presente documento se certifica que **${nombreCompleto}** ha sido debidamente confirmado en esta Parroquia el día **${fechaConfirmacion}**. El sacramento fue oficiado por **${certificado.oficiante || 'el oficiante correspondiente'}** y contó con la presencia y compromiso de sus padrinos **${certificado.padrinos || 'no registrados'}**. Este acto representa un paso fundamental en su camino de fe, comprometiéndose a vivir conforme a los preceptos cristianos. Se expide el presente certificado a solicitud del interesado para los fines que estime convenientes.`;

    agregarCuerpoCertificadoPersonalizado(doc, mensaje);

    doc.font('Helvetica')
      .fontSize(10)
      .fillColor('black')
      .text(`Fecha de emisión: ${fechaConfirmacion}`, { align: 'right' });
      
    await agregarPieCertificado(doc, certificado._id);
  });
};

/**  
 * Certificado de Bautismo.
 */
const generarPDFBautizo = async (usuario: Usuario, certificado: Certificado): Promise<string> => {
  const pdfPath = path.join(__dirname, `../../temp/certificado_bautizo_${Date.now()}.pdf`);
  return generarPDF(pdfPath, async (doc) => {
    agregarEncabezado(doc);
    agregarTituloCertificado(doc, 'Bautizo');

    // Se utiliza la fecha de compra para la fecha de emisión
    const fechaEmision = obtenerFechaEmision(certificado.fechaCompra);
    const fechaNacimiento = certificado.fechaNacimiento ? formatearFecha(new Date(certificado.fechaNacimiento)) : 'desconocida';
    const fechaBautismo = certificado.fechaBautismo ? formatearFecha(new Date(certificado.fechaBautismo)) : 'desconocida';

    const mensaje = 
`Por medio del presente se hace constar que **${usuario.nombre} ${usuario.apellido}**, hijo(a) de **${certificado.padre || 'N/D'}** y **${certificado.madre || 'N/D'}**, nacido(a) en **${certificado.distrito || 'N/D'}, ${certificado.provincia || 'N/D'}, ${certificado.departamento || 'N/D'}** el día **${fechaNacimiento}**, recibió el Sacramento del Bautismo en esta Parroquia el día **${fechaBautismo}**. Además, el acto fue oficiado por **${certificado.oficiante || 'N/D'}** y contó con la participación de sus padrinos **${certificado.padrinos || 'N/D'}**. Este documento se expide a solicitud del interesado para efectos legales y de fe.`;

    agregarCuerpoCertificadoPersonalizado(doc, mensaje);

    doc.font('Helvetica')
      .fontSize(10)
      .fillColor('black')
      .text(`Fecha de emisión: ${formatearFecha(fechaEmision)}`, { align: 'right' });

    await agregarPieCertificado(doc, certificado._id);
  });
};

/**
 * Certificado de Matrimonio.
 */
const generarPDFMatrimonio = async (usuario: Usuario, certificado: Certificado): Promise<string> => {
  const pdfPath = path.join(__dirname, `../../temp/certificado_matrimonio_${Date.now()}.pdf`);
  return generarPDF(pdfPath, async (doc) => {
    agregarEncabezado(doc);
    agregarTituloCertificado(doc, 'Matrimonio');

    // Se utiliza la fecha de compra para la fecha de emisión
    const fechaEmision = obtenerFechaEmision(certificado.fechaCompra);
    const fechaMatrimonio = certificado.fechaMatrimonio
      ? formatearFecha(new Date(certificado.fechaMatrimonio))
      : 'desconocida';

    const mensaje =
`En este solemne día se hace constar el sagrado vínculo matrimonial celebrado entre **${certificado.esposo || 'N/D'}** y **${certificado.esposa || 'N/D'}** en esta Parroquia el día **${fechaMatrimonio}**.

Con profundo orgullo y emoción, se resalta que **${certificado.esposo || 'N/D'}**, hijo de **${certificado.papaEsposo || 'N/D'}** y **${certificado.mamaEsposo || 'N/D'}**, une su destino con el de **${certificado.esposa || 'N/D'}**, hija de **${certificado.papaEsposa || 'N/D'}** y **${certificado.mamaEsposa || 'N/D'}**. Esta unión no solo simboliza el encuentro de dos almas, sino también la fusión armoniosa de dos familias.

El acto sacramental fue oficiado por **${certificado.oficiante || 'N/D'}**, contando con la presencia de los testigos **${certificado.testigos || 'N/D'}** y el respaldo de sus padrinos **${certificado.padrinos || 'N/D'}**. Se expide el presente certificado a solicitud de los interesados para los fines que estimen convenientes.`;

    agregarCuerpoCertificadoPersonalizado(doc, mensaje);

    doc.font('Helvetica')
      .fontSize(10)
      .fillColor('black')
      .text(`Fecha de emisión: ${formatearFecha(fechaEmision)}`, { align: 'right' });

    await agregarPieCertificado(doc, certificado._id);
  });
};

/**
 * Función principal que, según el tipo de certificado, genera el PDF correspondiente.
 */
export const generarPDFPorTipo = async (
  tipo: string,
  usuario: Usuario,
  certificado: Certificado
): Promise<string> => {
  switch (tipo.toLowerCase()) {
    case 'bautizo':
      return generarPDFBautizo(usuario, certificado);
    case 'confirmacion':
      return generarPDFConfirmacion(usuario, certificado);
    case 'matrimonio':
      return generarPDFMatrimonio(usuario, certificado);
    default:
      return Promise.reject(new Error('Tipo de certificado no válido.'));
  }
};