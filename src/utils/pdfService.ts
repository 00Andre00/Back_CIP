import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

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

/* ---------- utilidades de fecha ---------- */
const formatearFechaNumerica = (f: Date) =>
  `${f.getDate().toString().padStart(2, '0')}/${(f.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${f.getFullYear()}`;

const formatearFechaTexto = (f: Date) => {
  const meses = [
    'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
    'JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
  ];
  return `${f.getDate()} de ${meses[f.getMonth()]} del ${f
    .getFullYear()
    .toString()
    .slice(-2)}`;
};
/* ----------------------------------------- */

const generarQR = async (texto: string) => QRCode.toDataURL(texto);

/* ---------- generador base ---------- */
const generarPDF = (
  ruta: string,
  contenido: (doc: PDFDoc) => void | Promise<void>
) =>
  new Promise<string>((ok, fail) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    const ws = fs.createWriteStream(ruta);
    doc.pipe(ws);

    Promise.resolve(contenido(doc))
      .then(() => doc.end())
      .catch(fail);

    ws.on('finish', () => ok(ruta));
    ws.on('error', fail);
  });
/* ------------------------------------- */

/* ---------- encabezado ---------- */
const agregarEncabezado = (doc: PDFDoc) => {
  const m = doc.page.margins;
  const logoPath = path.join(process.cwd(), 'src', 'assets', 'logo2.png');

  /* logo */
  if (fs.existsSync(logoPath)) doc.image(logoPath, m.left, m.top, { width: 100 });

  /* texto */
  const textX = m.left + 100 + 8;
  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('COLEGIO DE INGENIEROS DEL PERÚ', textX, m.top, { align: 'left' })
    .moveDown(0.3)
    .fontSize(14)
    .text('Certificado de Habilidad', { align: 'left' });

  /* línea horizontal */
  const y = doc.y + 10;
  doc
    .moveTo(m.left, y)
    .lineTo(doc.page.width - m.right, y)
    .strokeColor('#000')
    .lineWidth(1)
    .stroke();

  doc.moveDown(1.5);
};
/* ---------------------------------- */

/* ---------- cuerpo ---------- */
const agregarInformacionIngeniero = (doc: PDFDoc, ing: Ingeniero) => {
  const x = doc.page.margins.left + 20;

  const pares: [string, string][] = [
    ['El Ingeniero (a): ', `${ing.apellidos} ${ing.nombres}`.toUpperCase()],
    [
      'Adscrito al Consejo Departamental de: ',
      ing.consejoDepartamental.toUpperCase()
    ],
    ['Con Registro de Matrícula del CIP Nº. ', ing.registroCIP],
    ['Fecha de Incorporación: ', formatearFechaNumerica(ing.fechaIncorporacion)],
    ['Especialidad: ', ing.especialidad.toUpperCase()]
  ];

  pares.forEach(([label, valor]) => {
    doc
      .font('Helvetica')
      .fontSize(11)
      .text(label, x, doc.y, { continued: true })
      .font('Helvetica-Bold')
      .text(valor)
      .moveDown(0.8);
  });
};

const agregarSeccionServicioProfesional = (doc: PDFDoc) => {
  doc
    .font('Helvetica')
    .fontSize(11)
    .text(
      'De conformidad con la Ley Nº 28858, Ley que complementa a la Ley Nº 16053 del ' +
        'Ejercicio Profesional y el Estatuto del Colegio de Ingenieros del Perú, SE ENCUENTRA COLEGIADO Y HÁBIL, ' +
        'en consecuencia está autorizado para ejercer la Profesión de Ingeniero (a).',
      { align: 'left', lineGap: 15 }
    )
    .font('Helvetica-Bold')
    .text('ASUNTO')
    .moveDown();
};

const agregarVigencia = (doc: PDFDoc, fecha: Date) => {
  const x = doc.page.margins.left + 20;
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('EL PRESENTE DOCUMENTO TIENE VIGENCIA HÁBIL A:', x)
    .moveDown(0.5)
    .text(`DÍA ${fecha.getDate().toString().padStart(2, '0')}`, x)
    .moveDown();
};
/* ---------------------------------- */

/* ---------- pie (firma + QR) ---------- */
const agregarPieCertificado = async (doc: PDFDoc, id: string) => {
  /* --- firma centrada --- */
  const selloW = 150;
  const selloX = (doc.page.width - selloW) / 2;
  const selloY = doc.page.height - 140;

  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor('#000')
    .text('__________________________________', selloX, selloY, {
      width: selloW,
      align: 'center'
    })
    .text('Ing. María del Carmen Ponce Mejía', selloX, selloY + 20, {
      width: selloW,
      align: 'center'
    })
    .text('Decana Nacional', selloX, selloY + 40, {
      width: selloW,
      align: 'center'
    })
    .text('Colegio de Ingenieros del Perú', selloX, selloY + 60, {
      width: selloW,
      align: 'center'
    });

  /* --- QR al costado derecho (cámbialo a izquierdo usando m.left) --- */
  const qrSize = 80;
  const qrX = doc.page.width - doc.page.margins.right - qrSize; // derecho
  // const qrX = doc.page.margins.left; // ↖ para colocarlo a la izquierda
  const qrY = doc.page.height - 160;

  const qrBuffer = Buffer.from(
    (await generarQR(
      `${process.env.FRONTEND_URL || ''}/certificados/verificar/${id}`
    )).replace(/^data:image\/png;base64,/, ''),
    'base64'
  );

  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#666')
    .text(id, qrX, qrY + qrSize + 5, { width: qrSize, align: 'center' });
};
/* -------------------------------------- */

/* ---------- export principal ---------- */
export const generarPDFCertificadoHabilidad = async (
  ingeniero: Ingeniero,
  fechaVigencia: Date,
  certificadoId: string
) => {
  const ruta = path.join(tempDir, `certificado_habilidad_${Date.now()}.pdf`);

  return generarPDF(ruta, async doc => {
    doc.info.Title = 'Certificado de Habilidad - CIP';
    agregarEncabezado(doc);
    agregarInformacionIngeniero(doc, ingeniero);
    agregarSeccionServicioProfesional(doc);
    agregarVigencia(doc, fechaVigencia);
    await agregarPieCertificado(doc, certificadoId);
  });
};
/* -------------------------------------- */
