/* ----------------- pdfService.ts  ----------------- */
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

/* ---------- utilidades y tipos ---------- */
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

type PDFDoc = InstanceType<typeof PDFDocument>;

interface Ingeniero {
  nombres: string;
  apellidos: string;
  registroCIP: string;
  fechaIncorporacion: Date;
  consejoDepartamental: string;
  especialidad: string;
}

const fechaNum = (d: Date) =>
  `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;

const qrData = (t: string) =>
  QRCode.toDataURL(t).then(b64 => Buffer.from(b64.replace(/^data:image.+;base64,/, ''), 'base64'));
/* ----------------------------------------- */

/* ---------- generador base ---------- */
const crearPDF = (ruta: string, fn: (doc: PDFDoc) => void | Promise<void>) =>
  new Promise<string>((ok, err) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    const ws = fs.createWriteStream(ruta);
    doc.pipe(ws);

    Promise.resolve(fn(doc))
      .then(() => doc.end())
      .catch(err);

    ws.on('finish', () => ok(ruta));
    ws.on('error', err);
  });
/* ------------------------------------- */

/* ---------- bloques ---------- */
const encabezado = (doc: PDFDoc) => {
  const m = doc.page.margins;
  const logo = path.join(process.cwd(), 'src', 'assets', 'logo2.png');

  if (fs.existsSync(logo)) doc.image(logo, m.left, m.top, { width: 100 });

  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('COLEGIO DE INGENIEROS DEL PERÚ', m.left + 108, m.top, { align: 'left' })
    .moveDown(0.3)
    .fontSize(14)
    .text('Certificado de Habilidad', { align: 'left' });

  const y = doc.y + 10;
  doc
    .moveTo(m.left, y)
    .lineTo(doc.page.width - m.right, y)
    .lineWidth(1)
    .stroke();
  doc.moveDown(1.5);
};

/* dibuja linea subrayada desde fin del texto hasta margen derecho */
const subrayar = (doc: PDFDoc, xIni: number, y: number) => {
  const m = doc.page.margins;
  doc
    .moveTo(xIni, y + 12) // 12 px aprox por debajo de baseline
    .lineTo(doc.page.width - m.right, y + 12)
    .lineWidth(0.7)
    .strokeColor('#000')
    .stroke();
};

/* cuerpo maquetado como en la imagen */
const infoIngeniero = (doc: PDFDoc, ing: Ingeniero) => {
  const m = doc.page.margins;
  const x = m.left + 2;          // un pequeño margen interno
  const gap = 3;                 // espacio vertical entre líneas

  const drawCampo = (label: string, valor: string) => {
    doc
      .font('Helvetica')
      .fontSize(11)
      .text(label, x, doc.y, { continued: true });
    const xVal = doc.x;
    doc.font('Helvetica-Bold').text(valor);
    subrayar(doc, xVal, doc.y - 11);
    doc.moveDown(gap / 10);
  };

  drawCampo('El Ingeniero (a): ', `${ing.apellidos} ${ing.nombres}`.toUpperCase());
  drawCampo('Adscrito al Consejo Departamental de: ', ing.consejoDepartamental.toUpperCase());

  /* línea mixta CIP + fecha */
  doc.font('Helvetica').text('Con Registro de Matrícula del CIP Nº: ', x, doc.y, { continued: true });
  const xCip = doc.x;
  doc.font('Helvetica-Bold').text(ing.registroCIP, { continued: true });
  subrayar(doc, xCip, doc.y - 11);

  doc.font('Helvetica').text('    Fecha de Incorporación: ', { continued: true });
  const xFecha = doc.x;
  doc.font('Helvetica-Bold').text(fechaNum(ing.fechaIncorporacion));
  subrayar(doc, xFecha, doc.y - 11);
  doc.moveDown(gap / 10);

  drawCampo('Especialidad: ', ing.especialidad.toUpperCase());
  doc.moveDown(0.5);

  /* párrafo legal */
  doc
    .font('Helvetica')
    .fontSize(11)
    .text(
      'De conformidad con la Ley Nº 28858, Ley que complementa a la Ley Nº 16053 ' +
        'del Ejercicio Profesional y el Estatuto del Colegio de Ingenieros del Perú, ' +
        'SE ENCUENTRA COLEGIADO Y HÁBIL, en consecuencia está autorizado para ' +
        'ejercer la Profesión de Ingeniero (a).',
      { lineGap: 2 }
    )
    .moveDown(0.8)
    .font('Helvetica-Bold')
    .text('ASUNTO')
    .moveDown();
};

/* vigencia */
const vigencia = (doc: PDFDoc, fecha: Date) => {
  const x = doc.page.margins.left + 2;
  doc
    .font('Helvetica-Bold')
    .text('EL PRESENTE DOCUMENTO TIENE VIGENCIA HÁBIL A:', x)
    .moveDown(0.2)
    .text(`DÍA ${fecha.getDate().toString().padStart(2, '0')}`, x)
    .moveDown();
};

/* firma centrada + qr costado */
const pieCertificado = async (doc: PDFDoc, id: string) => {
  /* firma */
  const ancho = 160;
  const yFirma = doc.page.height - 140;
  const xFirma = (doc.page.width - ancho) / 2;

  doc
    .font('Helvetica')
    .fontSize(12)
    .text('__________________________________', xFirma, yFirma, { width: ancho, align: 'center' })
    .text('Ing. María del Carmen Ponce Mejía', xFirma, yFirma + 18, { width: ancho, align: 'center' })
    .text('Decana Nacional', xFirma, yFirma + 36, { width: ancho, align: 'center' })
    .text('Colegio de Ingenieros del Perú', xFirma, yFirma + 54, { width: ancho, align: 'center' });

  /* QR */
  const qrSize = 80;
  // const qrX = doc.page.width - doc.page.margins.right - qrSize;   // lado derecho
  const qrX = doc.page.margins.left;                            // ↖ descomenta para lado izquierdo
  const qrY = doc.page.height - 160;

  doc.image(await qrData(`${process.env.FRONTEND_URL || ''}/certificados/verificar/${id}`), qrX, qrY, {
    width: qrSize,
    height: qrSize
  });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#666')
    .text(id, qrX, qrY + qrSize + 4, { width: qrSize, align: 'center' });
};
/* -------------------------------------- */

/* ---------- export principal ---------- */
export const generarPDFCertificadoHabilidad = async (
  ingeniero: Ingeniero,
  fechaVigencia: Date,
  certificadoId: string
) => {
  const ruta = path.join(tempDir, `certificado_habilidad_${Date.now()}.pdf`);
  return crearPDF(ruta, async doc => {
    doc.info.Title = 'Certificado de Habilidad - CIP';
    encabezado(doc);
    infoIngeniero(doc, ingeniero);
    vigencia(doc, fechaVigencia);
    await pieCertificado(doc, certificadoId);
  });
};
/* ------------------------------------------------ */
export const generarPDFCertificadoHabilidadPorId = async (certificadoId: string) => {
  const ruta = path.join(tempDir, `certificado_habilidad_${certificadoId}.pdf`);
  return crearPDF(ruta, async doc => {
    doc.info.Title = 'Certificado de Habilidad - CIP';
    encabezado(doc);
    doc.font('Helvetica').fontSize(12).text(`Certificado ID: ${certificadoId}`, { align: 'center' });
    await pieCertificado(doc, certificadoId);
  });
};