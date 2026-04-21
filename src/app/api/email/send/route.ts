import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, pdfBase64, fileName, smtpEmail, smtpPassword, smtpHost, smtpPort, senderName } = await req.json();

    if (!smtpEmail || !smtpPassword) {
      return NextResponse.json({ error: 'Falta la configuración de email en Ajustes.' }, { status: 400 });
    }
    if (!to) {
      return NextResponse.json({ error: 'Falta el email del destinatario.' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost || 'smtp.gmail.com',
      port: parseInt(smtpPort) || 587,
      secure: parseInt(smtpPort) === 465, // True for 465, false for other ports
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });

    const mailOptions: any = {
      from: `"${senderName || 'GestiónPro'}" <${smtpEmail}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1f2937; font-size: 22px; margin-bottom: 8px;">${subject}</h2>
          <p style="color: #6b7280; line-height: 1.6;">${body || 'Adjuntamos el documento solicitado. No dude en contactarnos ante cualquier consulta.'}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Enviado con GestiónPro · Sistema de Gestión Profesional</p>
        </div>
      `,
    };

    if (pdfBase64 && fileName) {
      mailOptions.attachments = [
        {
          filename: fileName,
          content: pdfBase64,
          encoding: 'base64',
          contentType: 'application/pdf',
        },
      ];
    }

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error sending email:', err);
    let userMessage = err.message || 'Error al enviar el email.';
    if (err.code === 'EAUTH') userMessage = 'Error de autenticación: El email o la contraseña son incorrectos.';
    else if (err.code === 'ESOCKET') userMessage = 'Error de conexión: No se pudo conectar al servidor SMTP.';
    else if (err.code === 'ETIMEDOUT') userMessage = 'Tiempo de espera agotado. Revisa el host y el puerto.';
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
