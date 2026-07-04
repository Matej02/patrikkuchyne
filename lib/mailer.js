const nodemailer = require('nodemailer');

let smtpTransporter = null;
let smtpChecked = false;

function getSmtp() {
  if (smtpChecked) return smtpTransporter;
  smtpChecked = true;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  smtpTransporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: /^(true|1)$/i.test(process.env.SMTP_SECURE || ''),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
  return smtpTransporter;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function buildContent({ name, email, phone, message }) {
  const text =
`Nová zpráva z kontaktního formuláře webu Kuchyně Čihovský.

Jméno:   ${name}
E-mail:  ${email}
Telefon: ${phone || '—'}

Zpráva:
${message}
`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2b1e12;background:#efe4d0;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#fdf6e6;border:1.5px solid #2b1e12;padding:32px">
        <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#8b5a2b;margin-bottom:8px">Nová poptávka z webu</div>
        <h1 style="font-family:Georgia,serif;font-size:28px;margin:0 0 24px;color:#2b1e12">${escapeHtml(name)}</h1>
        <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;margin-bottom:24px">
          <tr><td style="padding:6px 0;color:#8b5a2b;width:100px">E-mail</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#8b5a2b">Telefon</td><td>${escapeHtml(phone || '—')}</td></tr>
        </table>
        <div style="border-top:1px solid #d9c298;padding-top:20px">
          <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#8b5a2b;margin-bottom:12px">Zpráva</div>
          <div style="white-space:pre-wrap;font-size:15px;line-height:1.6">${escapeHtml(message)}</div>
        </div>
      </div>
    </div>
  `;
  return { text, html };
}

async function sendViaResend({ from, to, replyTo, subject, text, html }) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, reply_to: replyTo, subject, text, html })
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Resend API ${resp.status}: ${body}`);
  }
  const data = await resp.json();
  return { sent: true, provider: 'resend', messageId: data.id };
}

async function sendViaSmtp({ from, to, replyTo, subject, text, html }) {
  const t = getSmtp();
  if (!t) return { sent: false, reason: 'no-transport' };
  const info = await t.sendMail({ from, to, replyTo, subject, text, html });
  return { sent: true, provider: 'smtp', messageId: info.messageId };
}

async function sendContactMail(payload) {
  const to = process.env.MAIL_TO || process.env.CONTACT_EMAIL;
  if (!to) return { sent: false, reason: 'no-recipient' };
  const from = process.env.MAIL_FROM || `Web <${to}>`;
  const subject = `Nová poptávka z webu — ${payload.name}`;
  const { text, html } = buildContent(payload);
  const args = { from, to, replyTo: payload.email, subject, text, html };

  // Priorita: Resend > SMTP > fallback (jen do DB)
  if (process.env.RESEND_API_KEY) {
    return await sendViaResend(args);
  }
  if (process.env.SMTP_HOST) {
    return await sendViaSmtp(args);
  }
  return { sent: false, reason: 'no-provider-configured' };
}

module.exports = { sendContactMail };
