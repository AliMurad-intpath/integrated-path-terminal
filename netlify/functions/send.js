'use strict';
// Netlify Function: sends the website forms (enquiry / support / application) through the GoDaddy cPanel mailbox.
// Applications are also created in Odoo Recruitment (hr.applicant) when the ODOO_* variables are set.
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Busboy = require('busboy');
const odoo = require('../lib/odoo');

const MAX_FILE = 4 * 1024 * 1024; // Netlify Functions accept ~6 MB requests, so keep attachments under 4 MB
const LIMITS = { name: 120, company: 180, email: 254, phone: 60, subject: 160, message: 4000, linkedin: 200, job_title: 160 };
const KINDS = ['enquiry', 'support', 'application'];

const reply = (status, code, extra = {}) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  body: JSON.stringify({ ok: status === 200, code, ...extra }),
});

const secret = () => process.env.FORM_SECRET || process.env.SMTP_PASS || '';
const sign = (ts) => crypto.createHmac('sha256', secret()).update(ts).digest('hex');
const makeToken = () => { const ts = Date.now().toString(36); return ts + '.' + sign(ts); };
function checkToken(token) {
  if (typeof token !== 'string') return false;
  const [ts, sig] = token.split('.');
  if (!ts || !sig) return false;
  const age = Date.now() - parseInt(ts, 36);
  if (!(age >= 0 && age < 2 * 3600 * 1000)) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(ts));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sniff(buf) {
  if (buf.slice(0, 4).toString('latin1') === '%PDF') return ['pdf', 'application/pdf'];
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ['jpg', 'image/jpeg'];
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ['png', 'image/png'];
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return ['webp', 'image/webp'];
  if (buf.slice(4, 8).toString('latin1') === 'ftyp') return ['mp4', 'video/mp4'];
  return null;
}

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!/multipart\/form-data/i.test(contentType)) return reject(new Error('validation'));
    const bb = Busboy({ headers: { 'content-type': contentType }, limits: { fileSize: MAX_FILE, files: 1, fields: 20, fieldSize: 20000 } });
    const fields = {}; let file = null;
    bb.on('field', (name, value) => { fields[name] = value; });
    bb.on('file', (name, stream, info) => {
      const chunks = []; let truncated = false;
      stream.on('data', (d) => chunks.push(d));
      stream.on('limit', () => { truncated = true; });
      stream.on('end', () => { if (name === 'attachment' && info.filename) file = { buffer: Buffer.concat(chunks), truncated }; });
    });
    bb.on('close', () => resolve({ fields, file }));
    bb.on('error', reject);
    bb.end(Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8'));
  });
}

exports.handler = async (event) => {
  const env = process.env;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return reply(503, 'unconfigured');

  // Same-origin check: the browser's Origin must match the host serving this site.
  const origin = event.headers.origin || '';
  if (origin) {
    let originHost = '';
    try { originHost = new URL(origin).host; } catch (e) { return reply(403, 'origin'); }
    const host = event.headers['x-forwarded-host'] || event.headers.host || '';
    const extra = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (originHost !== host && !extra.includes(origin)) return reply(403, 'origin');
  }
  if ((event.headers['sec-fetch-site'] || '') === 'cross-site') return reply(403, 'origin');

  if (event.httpMethod === 'GET') return reply(200, 'ready', { token: makeToken() });
  if (event.httpMethod !== 'POST') return reply(405, 'method');

  let parsed;
  try { parsed = await parseMultipart(event); } catch (e) { return reply(422, 'validation'); }
  const { fields: raw, file } = parsed;

  if (!checkToken(raw.token)) return reply(403, 'token');
  if (raw.website) return reply(422, 'validation'); // honeypot
  const kind = raw.kind;
  if (!KINDS.includes(kind)) return reply(422, 'validation');
  const isApplication = kind === 'application';

  const fields = {};
  for (const [key, limit] of Object.entries(LIMITS)) {
    const value = String(raw[key] ?? '').trim();
    if (value.length > limit || (key !== 'message' && /[\r\n\0]/.test(value))) return reply(422, 'validation');
    fields[key] = value;
  }
  // Applications mirror Odoo's website form: name, email and phone are required; the rest is optional.
  const required = isApplication ? ['name', 'email', 'phone'] : ['name', 'email', 'subject', 'message'];
  for (const key of required) if (!fields[key]) return reply(422, 'validation');
  if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(fields.email)) return reply(422, 'validation');
  if (fields.linkedin && !/^https?:\/\//i.test(fields.linkedin)) fields.linkedin = 'https://' + fields.linkedin;
  const rawJobId = String(raw.job_id ?? '').trim();
  if (rawJobId && !/^\d{1,9}$/.test(rawJobId)) return reply(422, 'validation');
  const jobId = isApplication && rawJobId ? Number(rawJobId) : 0;

  let attachment = null;
  if (file) {
    if (file.truncated || file.buffer.length === 0) return reply(422, 'attachment');
    const type = sniff(file.buffer);
    const allowed = isApplication ? ['pdf'] : ['pdf', 'jpg', 'png', 'webp', 'mp4'];
    if (!type || !allowed.includes(type[0])) return reply(422, 'attachment');
    attachment = { filename: (isApplication ? 'CV' : 'attachment') + '.' + type[0], content: file.buffer, contentType: type[1] };
  }

  // 1) Odoo Recruitment: create the applicant (applications only).
  let odooNote = 'not configured';
  let odooOk = false;
  let jobName = '';
  if (isApplication && odoo.isConfigured(env)) {
    try {
      const result = await odoo.createApplication(env, {
        jobId, name: fields.name, email: fields.email, phone: fields.phone, linkedin: fields.linkedin, message: fields.message,
        file: attachment ? attachment.content : null,
        fileName: 'Resume - ' + (fields.name.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60) || 'applicant') + '.pdf',
      });
      odooOk = true;
      jobName = result.jobName;
      odooNote = 'applicant #' + result.id + ' created' + (attachment && !result.attached ? ' (resume NOT attached, see logs)' : '');
    } catch (error) {
      if (error && error.code === 'job') return reply(422, 'job');
      odoo.reset();
      odooNote = 'NOT created, see function logs';
      console.error('Integrated Path application: Odoo request failed:', error && error.message);
    }
  }

  // 2) Email to the team (also the safety net when Odoo is unavailable).
  const port = Number(env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 6000, greetingTimeout: 6000, socketTimeout: 10000,
  });
  const to = env['MAIL_TO_' + kind.toUpperCase()] || env.MAIL_TO || 'info@int-path.com';
  const position = jobName || fields.job_title || 'General application';
  const labels = { linkedin: 'LinkedIn profile', message: isApplication ? 'Short introduction' : 'Message' };
  let text = 'Form: ' + kind + '\n\n';
  if (isApplication) text += 'Position: ' + position + '\n\n';
  for (const [key, value] of Object.entries(fields)) {
    if (!value || key === 'job_title') continue;
    text += (labels[key] || key.charAt(0).toUpperCase() + key.slice(1)) + ': ' + value + '\n\n';
  }
  if (isApplication) text += 'Odoo Recruitment: ' + odooNote + '\n';
  const subject = isApplication
    ? '[Application] ' + position + ' - ' + fields.name
    : '[' + kind.charAt(0).toUpperCase() + kind.slice(1) + '] ' + fields.subject;

  try {
    await transporter.sendMail({
      from: { name: 'Integrated Path Website', address: env.SMTP_FROM || env.SMTP_USER },
      to,
      replyTo: { name: fields.name.replace(/["<>]/g, ''), address: fields.email },
      subject,
      text,
      attachments: attachment ? [attachment] : [],
    });
    return reply(200, 'accepted');
  } catch (error) {
    console.error('Integrated Path form: SMTP delivery failed:', error && error.code, error && error.message);
    return odooOk ? reply(200, 'accepted') : reply(502, 'delivery');
  }
};
