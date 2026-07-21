const nodemailer = require("nodemailer");

let transporterPromise = null;

/**
 * Crea (una sola vez) el transporter de nodemailer.
 * Si hay credenciales SMTP reales en variables de entorno las usa;
 * si no, crea una cuenta de prueba Ethereal automáticamente para que
 * el prototipo sea ejecutable sin configuración adicional.
 */
function getTransporter() {
  if (transporterPromise) return transporterPromise;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    );
  } else {
    console.warn(
      "[email] No hay credenciales SMTP en .env. Usando cuenta de prueba Ethereal (los correos no llegan a destinatarios reales, solo se generan previews)."
    );
    transporterPromise = nodemailer.createTestAccount().then((testAccount) =>
      nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      })
    );
  }

  return transporterPromise;
}

function buildSummaryHtml({ opsLeaderName, timestamp, employeeCount }) {
  return `
    <div style="font-family: Arial, sans-serif; color:#1e293b;">
      <h2 style="color:#1d4ed8;">Plantilla completada por ${opsLeaderName}</h2>
      <p><strong>Fecha/hora de envío:</strong> ${timestamp}</p>
      <p><strong>Empleados actualizados:</strong> ${employeeCount}</p>
      <p>Se adjunta el detalle completo (valor enviado y valor anterior por empleado y campo) en el Excel adjunto.</p>
    </div>
  `;
}

async function sendSubmissionEmail({ opsLeaderName, timestamp, employeeCount, attachmentPath, attachmentName }) {
  const transporter = await getTransporter();
  const to = process.env.EMAIL_DESTINO || "destino@empresa.com";

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Plantillas Ops" <no-reply@empresa.com>',
    to,
    subject: `Plantilla completada por ${opsLeaderName}`,
    html: buildSummaryHtml({ opsLeaderName, timestamp, employeeCount }),
    attachments: attachmentPath
      ? [{ filename: attachmentName, path: attachmentPath }]
      : [],
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[email] Vista previa (Ethereal) del correo enviado: ${previewUrl}`);
  }

  return { messageId: info.messageId, previewUrl };
}

module.exports = { sendSubmissionEmail };
