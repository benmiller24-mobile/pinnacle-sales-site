// Outbound email via the Google Workspace mailbox (SMTP + app password) so the
// auto-reply comes from a real pinnaclesales.biz address and threads in Gmail.

import nodemailer from 'nodemailer';

/**
 * Builds a transport from environment variables. Returns null when SMTP is not configured,
 * so the function degrades to "HubSpot only" instead of failing.
 *
 * SMTP_HOST      default smtp.gmail.com
 * SMTP_PORT      default 465 (implicit TLS)
 * SMTP_USER      mailbox login, e.g. ben@pinnaclesales.biz
 * SMTP_PASS      Google app password (Google Account → Security → 2-Step Verification → App passwords)
 * MAIL_FROM      display address, default SMTP_USER (Gmail rewrites From unless it is the login or a verified alias)
 * MAIL_FROM_NAME default "Ben Miller · Pinnacle Sales"
 * MAIL_REPLY_TO  default ben@pinnaclesales.biz
 */
export function createMailer(env = process.env) {
  if (env.DRY_RUN === '1') {
    return { transport: nodemailer.createTransport({ jsonTransport: true }), from: fromHeader(env), replyTo: replyTo(env), dryRun: true };
  }
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;
  const port = Number(env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return { transport, from: fromHeader(env), replyTo: replyTo(env), dryRun: false };
}

function fromHeader(env) {
  const address = env.MAIL_FROM || env.SMTP_USER || 'ben@pinnaclesales.biz';
  const name = env.MAIL_FROM_NAME || 'Ben Miller · Pinnacle Sales';
  return { name, address };
}

function replyTo(env) {
  return env.MAIL_REPLY_TO || 'ben@pinnaclesales.biz';
}

/**
 * @param {object} mailer  From createMailer()
 * @param {object} msg     { to, subject, text, html, bcc?, replyTo? }
 */
export async function sendMail(mailer, msg) {
  const info = await mailer.transport.sendMail({
    from: mailer.from,
    replyTo: msg.replyTo || mailer.replyTo,
    to: msg.to,
    bcc: msg.bcc || undefined,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
    headers: { 'X-Pinnacle-Lead': msg.tag || 'dealer-lead' },
  });
  return info;
}
