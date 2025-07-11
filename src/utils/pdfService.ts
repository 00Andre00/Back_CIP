import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

const tempDir = path.join(__dirname, "../../temp");
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
  const dia = fecha.getDate().toString().padStart(2, "0");
  const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
  const año = fecha.getFullYear();
  return `${dia}/${mes}/${año}`;
};

const formatearFechaTexto = (fecha: Date): string => {
  const meses = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SETIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];
  const dia = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  const año = fecha.getFullYear().toString().slice(-2); // Solo últimos dos dígitos
  return `${dia} de ${mes} del ${año}`;
};

const generarQR = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text); // Genera el QR a partir de la URL
  } catch (error) {
    console.error("Error al generar el QR:", error);
    throw error;
  }
};

const generarPDF = (
  pdfPath: string,
  generarContenido: (doc: PDFDoc) => void | Promise<void>
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "portrait",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    Promise.resolve(generarContenido(doc))
      .then(() => {
        doc.end();
      })
      .catch((err) => {
        reject(err);
      });

    writeStream.on("finish", () => resolve(pdfPath));
    writeStream.on("error", (error) => {
      console.error("Error al escribir el archivo PDF:", error);
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
  const startX = leftMargin; // Cambiar la posición del logo y texto para alinearlos a la izquierda.

  const logoPath = path.join(process.cwd(), "src", "assets", "logo2.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, startX - offsetX, headerY - offsetY, {
      width: logoWidth,
      height: logoHeight,
    });
  } else {
    console.error("Logo no encontrado en la ruta:", logoPath);
  }

  const textX = startX + logoWidth + gap - offsetX;
  const textBlockHeight = 52;
  const textY = headerY + (logoHeight - textBlockHeight) / 2;

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor("black")
    .text("COLEGIO DE INGENIEROS DEL PERÚ", textX, textY, {
      width: textBlockWidth,
      align: "center",
      lineGap: 2,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("black")
    .text("Certificado de Habilidad", {
      width: textBlockWidth,
      align: "center",
      lineGap: 2,
    });

  const lineY = headerY + Math.max(logoHeight, doc.y - headerY) + 10;
  doc
    .moveTo(leftMargin, lineY)
    .lineTo(pageWidth - rightMargin, lineY)
    .lineWidth(1)
    .strokeColor("#000")
    .stroke();

  doc.y = lineY + 20;
};

const agregarTituloCertificado = (doc: PDFDoc, tipo: string) => {
  const leftMargin = doc.page.margins.left;
  const rightMargin = doc.page.margins.right;
  const pageWidth = doc.page.width;
  const availableWidth = pageWidth - leftMargin - rightMargin;
  const titulo = `CERTIFICADO DE ${tipo.toUpperCase()}`;

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("black")
    .text(titulo, leftMargin, doc.y, {
      align: "left",
      width: availableWidth,
      lineGap: 4,
    });
  doc.moveDown(1);
};

const agregarInformacionIngeniero = (doc: PDFDoc, ingeniero: Ingeniero) => {
  const left = doc.page.margins.left; // margen izquierdo
  const right = doc.page.width - doc.page.margins.right;
  const fs = 11; // font-size base
  const gap = 0; // hueco antes de la línea
  const lineH = 0.7; // grosor línea
  const lineOffset = 0; // ↓ distancia línea-texto

  const top = doc.y; // Usa doc.y para obtener la posición vertical actual

  /** Dibuja “Etiqueta: VALOR _____” con subrayado hasta el margen derecho */
  const drawField = (label: string, value: string) => {
    const y = doc.y; // coordenada actual

    // Etiqueta
    doc.font("Helvetica").fontSize(fs).text(label, left, y);
    const labelW = doc.widthOfString(label);

    // Valor en negrita
    const valX = left + labelW;
    doc.font("Helvetica-Bold").text(value, valX, y);
    const valW = doc.widthOfString(value);

    // Línea de relleno
    const lineStart = valX + valW + gap;
    if (lineStart < right) {
      doc
        .moveTo(lineStart, y + fs + lineOffset)
        .lineTo(right, y + fs + lineOffset)
        .lineWidth(lineH)
        .strokeColor("#000")
        .stroke();
    }
    doc.moveDown(1.3); // espaciado vertical
  };

  // ——— 1. Encabezado ————————————————————————————
  doc
    .font("Helvetica")
    .fontSize(fs)
    .text("Los que suscriben certifican que:", left, top) // Usar top que ahora está definido
    .moveDown(0.8);

  // ——— 2. Campos simples —————————————————————————
  drawField(
    "El Ingeniero (a): ",
    `${ingeniero.apellidos} ${ingeniero.nombres}`.toUpperCase()
  );
  drawField(
    "Adscrito al Consejo Departamental de: ",
    ingeniero.consejoDepartamental.toUpperCase()
  );

  // ——— 3. Línea con DOBLE campo (registro + fecha) —
  const yBefore = doc.y;

  // • 1er campo: registro CIP
  const label1 = "Con Registro de Matrícula del CIP Nº: ";
  doc.font("Helvetica").fontSize(fs).text(label1, left, yBefore);
  const label1W = doc.widthOfString(label1);

  const val1 = ingeniero.registroCIP;
  const val1X = left + label1W;
  doc.font("Helvetica-Bold").text(val1, val1X, yBefore);
  const val1W = doc.widthOfString(val1);

  const midX = (right - left) * 0.58 + left; // “columna” 2ª mitad
  doc
    .moveTo(val1X + val1W + gap, yBefore + fs + lineOffset)
    .lineTo(midX - 10, yBefore + fs + lineOffset)
    .lineWidth(lineH)
    .stroke();

  // • 2º campo: fecha incorporación
  const label2 = "Fecha de Incorporación: ";
  doc.font("Helvetica").fontSize(fs).text(label2, midX, yBefore);
  const label2W = doc.widthOfString(label2);

  const val2 = formatearFechaNumerica(ingeniero.fechaIncorporacion);
  const val2X = midX + label2W;
  doc.font("Helvetica-Bold").text(val2, val2X, yBefore);
  const val2W = doc.widthOfString(val2);

  doc
    .moveTo(val2X + val2W + gap, yBefore + fs + lineOffset)
    .lineTo(right, yBefore + fs + lineOffset)
    .lineWidth(lineH)
    .stroke();

  doc.moveDown(1.3);

  // ——— 4. Especialidad ————————————————————————
  drawField("Especialidad: ", ingeniero.especialidad.toUpperCase());
};

const agregarPieCertificado = async (doc: PDFDoc, certificadoId: string) => {
  // --- 1. Generar QR ---------------------------------------------------------
  const verificationUrl = `${
    process.env.FRONTEND_URL || ""
  }/certificados/verificar/${certificadoId}`;
  const qrDataUrl = await generarQR(verificationUrl);
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBuffer = Buffer.from(base64Data, "base64");

  // --- 2. Coordenadas: QR a la derecha ---------------------------------------
  const qrSize = 80;
  const qrX = doc.page.width - doc.page.margins.right - qrSize; // pegado al margen derecho
  const qrY = doc.page.height - 160; // misma altura que antes

  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#666")
    .text(certificadoId, qrX, qrY + qrSize + 5, {
      width: qrSize,
      align: "center",
    });

  // --- Firma al centro (modificada) --------------------------
  const sealWidth = 200;
  const sealX = (doc.page.width - sealWidth) / 2;
  const sealY = doc.page.height - 140; // donde empieza el bloque

  // Línea de firma (vector) (ahora encima del nombre)
  const lineY = sealY - 10; // ajustamos la línea un poco arriba
  doc
    .moveTo(sealX, lineY) // coloca la línea en "lineY"
    .lineTo(sealX + sealWidth, lineY) // línea de izquierda a derecha
    .lineWidth(1)
    .strokeColor("#000")
    .stroke();

  // Nombre de la autoridad (ahora va debajo de la línea)
  doc
    .font("Helvetica")
    .fontSize(12)
    .text("Ing. María del Carmen Ponce Mejía", sealX, lineY + 10, {
      width: sealWidth,
      align: "center",
    });

  // Cargo y entidad
  doc
    .text("Decana Nacional", sealX, lineY + 30, {
      width: sealWidth,
      align: "center",
    })
    .text("Colegio de Ingenieros del Perú", sealX, lineY + 50, {
      width: sealWidth,
      align: "center",
    });
};

const agregarSeccionServicioProfesional = (doc: PDFDoc) => {
  // Texto de servicio profesional
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("black")
    .text(
      "De conformidad con la Ley Nº 28858, Ley que complementa a la Ley Nº 16053 del Ejercicio Profesional y el Estatuto del Colegio de Ingenieros del Perú, SE ENCUENTRA COLEGIADO Y HÁBIL, en consecuencia está autorizado para ejercer la Profesión de Ingeniero (a).",
      doc.page.margins.left,
      doc.y
    );

  // Título "ASUNTO"
  doc.font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("black")
    .text("ASUNTO", {
      align: "left",
      lineGap: 5,
    });

  // Agregar la nueva sección
  doc.moveDown(1); // Para dar espacio entre el texto de "ASUNTO" y la nueva sección

  // Nuevo campo: "Servicio Profesional"
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("black")
    .text("Servicio Profesional: ", doc.page.margins.left, doc.y);
  doc.font("Helvetica-Bold").text("Público y/o Privado", doc.x + 150, doc.y);

  doc.moveDown(1); // Espacio entre campos

  // Nuevo campo: "Entidad o Propietario"
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("black")
    .text("Entidad o Propietario: ", doc.page.margins.left, doc.y);
  doc.font("Helvetica-Bold").text("Público y/o Privado", doc.x + 150, doc.y);

  doc.moveDown(1); // Espacio entre campos

  // Nuevo campo: "Lugar"
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("black")
    .text("Lugar: ", doc.page.margins.left, doc.y);
  doc.font("Helvetica-Bold").text("A nivel nacional", doc.x + 150, doc.y);
};
const agregarVigenciaYUbicacion = (doc: PDFDoc, fechaGeneracion: Date) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;

  // Título: "El presente Documento tiene vigencia hasta"
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("black")
    .text("El presente Documento tiene vigencia hasta", left, doc.y)
    .moveDown(1); // Deja un espacio

  // Calcular la fecha de vigencia (sumar un año a la fecha de generación)
  const fechaVigencia = new Date(fechaGeneracion);
  fechaVigencia.setFullYear(fechaVigencia.getFullYear() + 1);

  // Extraer día, mes y año de la fecha de vigencia
  const diaVigencia = fechaVigencia.getDate().toString().padStart(2, '0');
  const mesVigencia = fechaVigencia.getMonth() + 1; // Los meses en JavaScript son de 0 a 11
  const añoVigencia = fechaVigencia.getFullYear();

  // Mostrar la fecha de vigencia en el formato: DIA MES AÑO
  doc.font("Helvetica")
    .fontSize(11)
    .fillColor("black")
    .text(`${diaVigencia}       ${mesVigencia.toString().padStart(2, '0')}       ${añoVigencia}`, left, doc.y)
    .moveDown(2); // Deja espacio entre la vigencia y el siguiente bloque

  // Agregar el texto "Huánuco DIA de MES DEL 2025" alineado a la derecha
  const fechaHoy = new Date();
  const diaHoy = fechaHoy.getDate().toString().padStart(2, '0');
  const mesHoy = fechaHoy.getMonth() + 1; // Los meses en JavaScript son de 0 a 11
  const añoHoy = fechaHoy.getFullYear();

  doc.font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("black")
    .text(
      `Huánuco ${diaHoy} de ${mesHoy.toString().padStart(2, '0')} del ${añoHoy}`,
      right - 200, // Ajuste la posición horizontal a la derecha
      doc.y
    );
};


export const generarPDFCertificadoHabilidad = async (
  ingeniero: Ingeniero,
  fechaVigencia: Date,
  certificadoId: string
): Promise<string> => {
  const pdfPath = path.join(tempDir, `certificado_habilidad_${Date.now()}.pdf`);

  return generarPDF(pdfPath, async (doc) => {
    doc.info.Title = "Certificado de Habilidad - CIP";
    agregarEncabezado(doc);
    agregarInformacionIngeniero(doc, ingeniero);
    agregarSeccionServicioProfesional(doc);
    agregarVigenciaYUbicacion(doc, new Date());
    
    await agregarPieCertificado(doc, certificadoId);
  });
};
