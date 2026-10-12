const nodemailer = require('nodemailer');

// ─── Transporter ────────────────────────────────────────────────────────────
// Uses Gmail with an App Password (set SMTP_USER + SMTP_PASS in .env).
// You can swap the service/host for any other free SMTP (Brevo, Mailjet, etc.)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,   // Gmail App Password (not your account password)
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Banjara Match';
const FROM_EMAIL = process.env.SMTP_USER || 'noreply@banjaramatch.com';

// ─── Generic send helper ─────────────────────────────────────────────────────
async function sendMail({ to, subject, html, text }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[emailService] SMTP_USER / SMTP_PASS not set – skipping email to:', to);
    return;
  }
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`[emailService] ✅ Email sent to ${to} – messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    // Email failure should never break a primary flow
    console.error('[emailService] ❌ Failed to send email:', err.message);
  }
}

// ─── Email Templates ─────────────────────────────────────────────────────────
const baseWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #e91e8c 0%, #c2185b 100%); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 30px; color: #333333; }
    .body h2 { color: #e91e8c; font-size: 20px; margin-top: 0; }
    .body p { line-height: 1.6; color: #555; }
    .btn { display: inline-block; background: linear-gradient(135deg, #e91e8c 0%, #c2185b 100%); color: #ffffff !important; padding: 12px 28px; border-radius: 25px; text-decoration: none; font-weight: bold; margin-top: 16px; }
    .footer { background: #f9f9f9; padding: 18px 30px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
    .profile-card { background: #fef9fc; border: 1px solid #f0d6e8; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .profile-card .name { font-size: 18px; font-weight: bold; color: #333; }
    .profile-card .detail { color: #777; font-size: 13px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💑 Banjara Match</h1>
      <p>Your Trusted Banjara Matrimony Platform</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div style="background:#fff3f8;border:1px solid #f0d6e8;border-radius:8px;padding:18px 20px;margin:24px 0 0;text-align:center;">
      <p style="margin:0 0 6px;font-size:15px;font-weight:bold;color:#e91e8c;">📱 Get Real-Time Updates on Your Phone!</p>
      <p style="margin:0 0 12px;font-size:13px;color:#555;">Never miss a match request, message, or profile visit — get instant notifications with the <strong>Banjara Match app</strong>.</p>
      <a href="https://api.banjaramatch.com/api/download-apk" style="display:inline-block;background:linear-gradient(135deg,#e91e8c,#c2185b);color:#ffffff;padding:10px 24px;border-radius:22px;text-decoration:none;font-weight:bold;font-size:13px;">⬇️ Download App Now</a>
      <p style="margin:8px 0 0;font-size:11px;color:#aaa;">Available directly from our website &middot; Google Play Store coming soon</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Banjara Match. All rights reserved.</p>
      <p>You received this email because you are registered on BanjaraMatch.com</p>
    </div>
  </div>
</body>
</html>`;

// ─── 1. Interest Request Received ────────────────────────────────────────────
/**
 * Notify the recipient that someone sent them a match interest.
 * @param {Object} recipient - user who received the request { full_name, email }
 * @param {Object} sender    - user who sent the request    { full_name }
 */
async function sendInterestRequestEmail(recipient, sender) {
  if (!recipient?.email) return;

  const subject = `💌 ${sender.full_name} has shown interest in your profile`;

  const html = baseWrapper(`
    <h2>You have a new Interest Request! 💕</h2>
    <p>Hi <strong>${recipient.full_name || 'there'}</strong>,</p>
    <p>Great news! Someone has shown interest in your profile on Banjara Match.</p>
    <div class="profile-card">
      <div class="name">💛 ${sender.full_name}</div>
      <div class="detail">has sent you a match interest request</div>
    </div>
    <p>Log in to view their profile, learn more about them, and decide whether to accept or decline.</p>
    <a href="https://www.banjaramatch.com/" class="btn">View Profile &amp; Respond</a>
    <p style="margin-top:20px;font-size:13px;color:#888;">Don't keep them waiting — respond today and start your journey together! 🌟</p>
  `);

  const text = `Hi ${recipient.full_name || 'there'},\n\n${sender.full_name} has shown interest in your profile on Banjara Match.\n\nLog in at https://www.banjaramatch.com to view and respond.\n\nBanjara Match Team`;

  return sendMail({ to: recipient.email, subject, html, text });
}

// ─── 2. Interest Request Accepted ────────────────────────────────────────────
/**
 * Notify the original sender that their request was accepted.
 * @param {Object} originalSender - user who sent the original request { full_name, email }
 * @param {Object} acceptor       - user who accepted { full_name }
 */
async function sendInterestAcceptedEmail(originalSender, acceptor) {
  if (!originalSender?.email) return;

  const subject = `🎉 ${acceptor.full_name} accepted your interest request!`;

  const html = baseWrapper(`
    <h2>Your Interest was Accepted! 🎊</h2>
    <p>Hi <strong>${originalSender.full_name || 'there'}</strong>,</p>
    <p>Wonderful news! Your interest request has been accepted.</p>
    <div class="profile-card">
      <div class="name">💚 ${acceptor.full_name}</div>
      <div class="detail">has accepted your match interest request</div>
    </div>
    <p>You can now chat with each other on Banjara Match. A chat room has been created for you both — say hello!</p>
    <a href="https://www.banjaramatch.com/" class="btn">Start Chatting 💬</a>
    <p style="margin-top:20px;font-size:13px;color:#888;">Wishing you both a beautiful journey ahead! 💑</p>
  `);

  const text = `Hi ${originalSender.full_name || 'there'},\n\n${acceptor.full_name} has accepted your interest request on Banjara Match.\n\nYou can now start chatting at https://www.banjaramatch.com\n\nBanjara Match Team`;

  return sendMail({ to: originalSender.email, subject, html, text });
}

// ─── 3. Profile Viewed ────────────────────────────────────────────────────────
/**
 * Notify a user that someone viewed their profile (rate-limited by caller).
 * @param {Object} viewedUser - user whose profile was viewed { full_name, email }
 * @param {Object} viewer     - user who viewed the profile  { full_name }
 */
async function sendProfileViewEmail(viewedUser, viewer) {
  if (!viewedUser?.email) return;

  const subject = `👀 ${viewer.full_name || 'Someone'} viewed your profile on Banjara Match`;

  const html = baseWrapper(`
    <h2>Someone Viewed Your Profile! 👀</h2>
    <p>Hi <strong>${viewedUser.full_name || 'there'}</strong>,</p>
    <p>Your profile is getting attention! <strong>${viewer.full_name || 'A member'}</strong> just visited your profile on Banjara Match.</p>
    <div class="profile-card">
      <div class="name">👁️ ${viewer.full_name || 'A Banjara Match member'}</div>
      <div class="detail">checked out your profile</div>
    </div>
    <p>They might be interested — log in to view their profile and make the first move!</p>
    <a href="https://www.banjaramatch.com/" class="btn">View Their Profile 💕</a>
    <p style="margin-top:20px;font-size:13px;color:#888;">Don't miss this chance — reach out and start a conversation today! 🌟</p>
  `);

  const text = `Hi ${viewedUser.full_name || 'there'},\n\n${viewer.full_name || 'Someone'} just viewed your profile on Banjara Match.\n\nLog in at https://www.banjaramatch.com to view their profile and connect!\n\nBanjara Match Team`;

  return sendMail({ to: viewedUser.email, subject, html, text });
}

// ─── 4. Shortlisted ─────────────────────────────────────────────────────────
/**
 * Notify a user that someone shortlisted their profile.
 * @param {Object} shortlistedUser - user whose profile was shortlisted { full_name, email }
 * @param {Object} lister          - user who did the shortlisting      { full_name }
 */
async function sendShortlistEmail(shortlistedUser, lister) {
  if (!shortlistedUser?.email) return;

  const subject = `⭐ ${lister.full_name || 'Someone'} shortlisted your profile on Banjara Match`;

  const html = baseWrapper(`
    <h2>You've Been Shortlisted! ⭐</h2>
    <p>Hi <strong>${shortlistedUser.full_name || 'there'}</strong>,</p>
    <p>Great news! <strong>${lister.full_name || 'A member'}</strong> has added your profile to their shortlist on Banjara Match — they're seriously interested in connecting with you!</p>
    <div class="profile-card">
      <div class="name">⭐ ${lister.full_name || 'A Banjara Match member'}</div>
      <div class="detail">shortlisted your profile</div>
    </div>
    <p>Don't keep them waiting — visit their profile and send an interest request!</p>
    <a href="https://www.banjaramatch.com/" class="btn">View Their Profile 💕</a>
    <p style="margin-top:20px;font-size:13px;color:#888;">The perfect match could be just one click away! 🌟</p>
  `);

  const text = `Hi ${shortlistedUser.full_name || 'there'},\n\n${lister.full_name || 'Someone'} has shortlisted your profile on Banjara Match.\n\nLog in at https://www.banjaramatch.com to view their profile and connect!\n\nBanjara Match Team`;

  return sendMail({ to: shortlistedUser.email, subject, html, text });
}

// ─── 5. Profile Verified by Admin ──────────────────────────────────────────────
/**
 * Notify a user that their profile has been verified by the admin team.
 * @param {Object} user - { full_name, email }
 */
async function sendProfileVerifiedEmail(user) {
  if (!user?.email) return;

  const subject = `✅ Your Banjara Match profile has been verified!`;

  const html = baseWrapper(`
    <h2>Your Profile is Now Verified! ✅</h2>
    <p>Hi <strong>${user.full_name || 'there'}</strong>,</p>
    <p>Great news — your profile on <strong>Banjara Match</strong> has been <strong>verified</strong> by our team. 🎉</p>
    <div class="profile-card">
      <div class="name">🏅 Verified Member</div>
      <div class="detail">Your profile now carries a verification badge, giving other members more confidence in connecting with you.</div>
    </div>
    <p>Verified profiles receive more match requests and higher visibility on the platform. Make sure your profile is complete to attract the best matches!</p>
    <a href="https://www.banjaramatch.com/" class="btn">View My Profile 💕</a>
    <p style="margin-top:20px;font-size:13px;color:#888;">Thank you for being a trusted member of the Banjara Match community! 🌟</p>
  `);

  const text = `Hi ${user.full_name || 'there'},\n\nYour profile on Banjara Match has been verified by our team.\nVerified profiles receive more match requests and higher visibility.\n\nLog in at https://www.banjaramatch.com to explore your matches!\n\nBanjara Match Team`;

  return sendMail({ to: user.email, subject, html, text });
}

// ─── 6. Admin Broadcast Email ─────────────────────────────────────────────────
/**
 * Send a broadcast email to a list of users.
 * @param {Array}  users    - array of { email, full_name }
 * @param {String} subject  - email subject
 * @param {String} bodyHtml - custom HTML body (inserted inside template)
 * @param {String} bodyText - plain text fallback
 * @returns {{ sent: number, failed: number, errors: string[] }}
 */
async function sendBroadcastEmail(users, subject, bodyHtml, bodyText) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP credentials not configured. Set SMTP_USER and SMTP_PASS in .env');
  }

  const transporter = createTransporter();
  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const user of users) {
    if (!user.email) { failed++; continue; }

    // Personalise the body per user
    const personalBody = bodyHtml.replace(/\{\{name\}\}/g, user.full_name || 'there');
    const html = baseWrapper(personalBody);
    const text = bodyText ? bodyText.replace(/\{\{name\}\}/g, user.full_name || 'there') : '';

    try {
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: user.email,
        subject,
        html,
        text,
      });
      sent++;
    } catch (err) {
      failed++;
      errors.push(`${user.email}: ${err.message}`);
      console.error(`[emailService] Broadcast failed for ${user.email}:`, err.message);
    }
  }

  console.log(`[emailService] Broadcast complete – sent: ${sent}, failed: ${failed}`);
  return { sent, failed, errors };
}

module.exports = {
  sendMail,
  sendInterestRequestEmail,
  sendInterestAcceptedEmail,
  sendProfileViewEmail,
  sendShortlistEmail,
  sendProfileVerifiedEmail,
  sendBroadcastEmail,
};
