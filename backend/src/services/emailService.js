import nodemailer from 'nodemailer';
import config from '../config/env.js';

class EmailService {
    constructor() {
        this.transporter = null;
        this.initTransporter();
    }

    initTransporter() {
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass }
            });
            console.log(`[EmailService] Production SMTP transporter initialized (${host}:${port})`);
        } else {
            // Development fallback transporter that logs cleanly without failing
            this.transporter = nodemailer.createTransport({
                streamTransport: true,
                newline: 'windows'
            });
            console.log('[EmailService] SMTP credentials not set; using local streaming email transporter.');
        }
    }

    getLuxuryEmailTemplate({ title, preheader, content, callToAction = null }) {
        return `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #0b0f19; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid rgba(200, 169, 81, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); }
        .header { background: linear-gradient(180deg, #182234 0%, #111827 100%); padding: 36px 40px; text-align: center; border-bottom: 1px solid rgba(200, 169, 81, 0.2); }
        .logo-badge { display: inline-block; padding: 6px 16px; background: rgba(200, 169, 81, 0.12); border: 1px solid rgba(200, 169, 81, 0.35); border-radius: 30px; color: #c8a951; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
        .brand-title { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px; color: #ffffff; }
        .brand-gold { color: #c8a951; }
        .content { padding: 40px; color: #e2e8f0; line-height: 1.6; font-size: 15px; }
        .headline { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 18px; }
        .cta-container { text-align: center; margin: 32px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #c8a951 0%, #ebb637 100%); color: #000000 !important; font-weight: 800; font-size: 15px; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 14px rgba(200, 169, 81, 0.35); }
        .footer { background-color: #0b0f19; padding: 24px 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.06); }
        .footer a { color: #c8a951; text-decoration: none; }
        .gold-pill { background: rgba(200, 169, 81, 0.15); color: #c8a951; padding: 3px 10px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block; }
    </style>
</head>
<body>
    <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${preheader || title}
    </div>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <div class="logo-badge">Haute Parfumerie GCC</div>
                <h1 class="brand-title">PERFUME<span class="brand-gold">HUB</span></h1>
                <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 12px; letter-spacing: 1px;">DOHA &bull; DUBAI &bull; RIYADH</p>
            </div>
            <div class="content">
                ${content}
                ${callToAction ? `
                    <div class="cta-container">
                        <a href="${callToAction.url}" class="cta-button" target="_blank">${callToAction.label}</a>
                    </div>
                ` : ''}
            </div>
            <div class="footer">
                <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} PerfumeHub Luxury Marketplace. Lusail Marina, Doha, Qatar.</p>
                <p style="margin: 0;">Need concierge support? <a href="mailto:support@perfumehubqa.com">support@perfumehubqa.com</a> | WhatsApp: +974 5555 1234</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * 1. Send Password Reset Email with signed link & 1-hour expiry
     */
    async sendPasswordResetEmail(email, resetToken, resetUrl) {
        const fromAddress = process.env.SMTP_FROM || 'PerfumeHub Concierge <no-reply@perfumehubqa.com>';
        const title = 'Reset Your PerfumeHub Password';
        const content = `
            <h2 class="headline">Secure Password Reset Request</h2>
            <p>Dear Client,</p>
            <p>We received a request to reset the password for your <strong>PerfumeHub</strong> luxury account associated with <code>${email}</code>.</p>
            <p>To protect your account, this security link will remain active for strictly <span class="gold-pill">60 minutes</span>.</p>
            <p>If you made this request, please click the button below to choose your new secure password:</p>
            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #94a3b8;">
                <strong>Security Notice:</strong> If you did not request this password reset, please disregard this email. Your credentials remain safe and no changes will be made.
            </div>
        `;

        const html = this.getLuxuryEmailTemplate({
            title,
            preheader: 'Secure link to reset your PerfumeHub password (valid 1 hour)',
            content,
            callToAction: {
                label: 'RESET PASSWORD',
                url: resetUrl
            }
        });

        try {
            const info = await this.transporter.sendMail({
                from: fromAddress,
                to: email,
                subject: `🔒 ${title}`,
                html
            });
            console.log(`[EmailService] Password reset email dispatched to ${email}. MessageId: ${info.messageId || 'local'}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('[EmailService] Failed to send password reset email:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 2. Send Customer Order Confirmation with itemized invoice
     */
    async sendOrderConfirmationEmail(order) {
        if (!order || !order.email) return;
        const fromAddress = process.env.SMTP_FROM || 'PerfumeHub Orders <orders@perfumehubqa.com>';
        const title = `Order Confirmation #${order.id || 'N/A'}`;

        const itemsList = (order.items || []).map(item => `
            <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                    <strong style="color: #ffffff;">${item.name || item.product_name || 'Luxury Fragrance'}</strong>
                    ${item.size ? `<span style="font-size: 12px; color: #94a3b8; display: block;">Size: ${item.size}</span>` : ''}
                </td>
                <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); color: #94a3b8;">
                    ${item.quantity || 1}
                </td>
                <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid rgba(255, 255, 255, 0.06); color: #c8a951; font-weight: 700;">
                    ${parseFloat(item.price || item.unit_price || 0).toFixed(2)} QAR
                </td>
            </tr>
        `).join('');

        const content = `
            <h2 class="headline">Thank you for your order, ${order.customer_name || 'Valued Client'}</h2>
            <p>Your bespoke fragrance order has been accepted and is now being prepared with meticulous white-glove packaging.</p>
            
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(200, 169, 81, 0.25); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                    <div>
                        <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Order Number</span>
                        <div style="font-size: 16px; font-weight: 800; color: #ffffff;">#${order.id}</div>
                    </div>
                    <div>
                        <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Payment Method</span>
                        <div style="font-size: 14px; font-weight: 700; color: #c8a951;">${(order.payment_method || 'Card').toUpperCase()}</div>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(200, 169, 81, 0.2); text-align: left; font-size: 11px; color: #c8a951; text-transform: uppercase;">
                            <th style="padding-bottom: 8px;">Item</th>
                            <th style="padding-bottom: 8px; text-align: center;">Qty</th>
                            <th style="padding-bottom: 8px; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsList}
                    </tbody>
                </table>

                <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: right;">
                    <span style="color: #94a3b8; font-size: 13px;">Total Amount:</span>
                    <span style="font-size: 20px; font-weight: 800; color: #c8a951; margin-left: 8px;">${parseFloat(order.total || 0).toFixed(2)} QAR</span>
                </div>
            </div>

            <p style="font-size: 13px; color: #94a3b8;">
                <strong>Shipping Address:</strong><br/>
                ${order.shipping_address || 'As specified during checkout'}
            </p>
        `;

        const html = this.getLuxuryEmailTemplate({
            title,
            preheader: `Itemized invoice for order #${order.id} on PerfumeHub`,
            content,
            callToAction: {
                label: 'TRACK ORDER STATUS',
                url: `${config.server.frontendUrl || 'http://localhost:5173'}/track-order?id=${order.id}`
            }
        });

        try {
            await this.transporter.sendMail({
                from: fromAddress,
                to: order.email,
                subject: `✨ ${title}`,
                html
            });
            console.log(`[EmailService] Order confirmation sent to ${order.email}`);
        } catch (err) {
            console.error('[EmailService] Order confirmation error:', err.message);
        }
    }

    /**
     * 3. Send Click & Collect 6-digit VIP pickup pass
     */
    async sendClickAndCollectVIPPassEmail(reservation) {
        if (!reservation || !reservation.customer_email) return;
        const fromAddress = process.env.SMTP_FROM || 'PerfumeHub Concierge <boutique@perfumehubqa.com>';
        const title = `VIP Pickup Pass #${reservation.id || 'N/A'}`;
        const pin = reservation.verification_pin || reservation.pin || Math.floor(100000 + Math.random() * 900000);

        const content = `
            <h2 class="headline">Your Luxury Fragrance Awaits</h2>
            <p>Dear ${reservation.customer_name || 'VIP Client'},</p>
            <p>Your Click & Collect reservation has been secured at boutique partner <strong>${reservation.shop_name || 'PerfumeHub Boutique'}</strong>.</p>
            
            <div style="background: linear-gradient(135deg, rgba(200, 169, 81, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%); border: 2px solid #c8a951; border-radius: 14px; padding: 28px; text-align: center; margin: 28px 0;">
                <span style="font-size: 11px; letter-spacing: 2px; color: #c8a951; font-weight: 800; text-transform: uppercase;">Official 6-Digit VIP Pickup Pass</span>
                <div style="font-size: 40px; font-weight: 900; letter-spacing: 8px; color: #ffffff; margin: 12px 0; font-family: monospace;">
                    ${pin}
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin: 0;">Present this verification code upon arrival at the boutique counter.</p>
            </div>

            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 18px; font-size: 13px; line-height: 1.5;">
                <strong style="color: #ffffff;">Boutique Destination:</strong><br/>
                <span style="color: #c8a951;">${reservation.shop_name || 'PerfumeHub Flagship Boutique'}</span><br/>
                <span style="color: #94a3b8;">${reservation.shop_address || 'Lusail Promenade, Doha, Qatar'}</span><br/>
                <span style="color: #94a3b8;">WhatsApp: ${reservation.whatsapp_number || '+974 5555 1234'}</span>
            </div>
        `;

        const html = this.getLuxuryEmailTemplate({
            title,
            preheader: `Your VIP Pickup Pass Code: ${pin}`,
            content,
            callToAction: {
                label: 'VIEW RESERVATION DETAILS',
                url: `${config.server.frontendUrl || 'http://localhost:5173'}/track-order?id=${reservation.id}`
            }
        });

        try {
            await this.transporter.sendMail({
                from: fromAddress,
                to: reservation.customer_email,
                subject: `🎟️ ${title} - PIN: ${pin}`,
                html
            });
            console.log(`[EmailService] VIP pickup pass emailed to ${reservation.customer_email}`);
        } catch (err) {
            console.error('[EmailService] VIP pass error:', err.message);
        }
    }

    /**
     * 4. Send Vendor Application Approval & Welcome Pack
     */
    async sendVendorApprovalEmail(vendor, shop) {
        if (!vendor || !vendor.email) return;
        const fromAddress = process.env.SMTP_FROM || 'PerfumeHub Onboarding <partners@perfumehubqa.com>';
        const title = `Welcome to PerfumeHub: ${shop?.name || 'Your Boutique'} is Active`;

        const content = `
            <h2 class="headline">Congratulations & Welcome to PerfumeHub</h2>
            <p>Dear ${vendor.name || 'Partner'},</p>
            <p>We are delighted to inform you that your boutique partnership application for <strong>${shop?.name || 'your boutique'}</strong> has been officially <span class="gold-pill">APPROVED & ACTIVATED</span> by Super Admin review.</p>
            
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(200, 169, 81, 0.25); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h4 style="margin: 0 0 12px 0; color: #c8a951; font-size: 15px;">Your Merchant Details</h4>
                <ul style="padding-left: 20px; margin: 0; color: #e2e8f0; font-size: 14px; line-height: 1.8;">
                    <li><strong>Boutique Name:</strong> ${shop?.name}</li>
                    <li><strong>Territory:</strong> Qatar & GCC Central</li>
                    <li><strong>Assigned Tier:</strong> ${(shop?.tier || 'Standard').toUpperCase()}</li>
                    <li><strong>Merchant Portal:</strong> Activated with full multi-branch inventory control</li>
                </ul>
            </div>

            <p>You can now manage your boutique stock, process customer click & collect pickups, and receive direct regional orders.</p>
        `;

        const html = this.getLuxuryEmailTemplate({
            title,
            preheader: `Boutique partnership activated for ${shop?.name}`,
            content,
            callToAction: {
                label: 'ACCESS VENDOR PORTAL',
                url: `${config.server.frontendUrl || 'http://localhost:5173'}/vendor`
            }
        });

        try {
            await this.transporter.sendMail({
                from: fromAddress,
                to: vendor.email,
                subject: `👑 ${title}`,
                html
            });
            console.log(`[EmailService] Vendor welcome pack sent to ${vendor.email}`);
        } catch (err) {
            console.error('[EmailService] Vendor welcome pack error:', err.message);
        }
    }

    /**
     * 5. Send Platform Announcement Broadcast Email
     */
    async sendAnnouncementBroadcastEmail(recipients, subject, message) {
        if (!recipients || recipients.length === 0) return { success: false, error: 'No recipients provided' };
        const fromAddress = process.env.SMTP_FROM || 'PerfumeHub Executive Notice <executive@perfumehubqa.com>';

        const content = `
            <h2 class="headline">${subject}</h2>
            <div style="font-size: 15px; color: #e2e8f0; line-height: 1.8; white-space: pre-line;">
                ${message}
            </div>
            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; margin-top: 24px; font-size: 12px; color: #94a3b8;">
                This executive broadcast was transmitted to all authorized PerfumeHub merchant partners and stakeholders.
            </div>
        `;

        const html = this.getLuxuryEmailTemplate({
            title: subject,
            preheader: subject,
            content,
            callToAction: {
                label: 'GO TO DASHBOARD',
                url: `${config.server.frontendUrl || 'http://localhost:5173'}/vendor`
            }
        });

        let sentCount = 0;
        for (const recipient of recipients) {
            try {
                await this.transporter.sendMail({
                    from: fromAddress,
                    to: recipient,
                    subject: `📢 PerfumeHub Announcement: ${subject}`,
                    html
                });
                sentCount++;
            } catch (err) {
                console.error(`[EmailService] Failed to send broadcast to ${recipient}:`, err.message);
            }
        }

        return { success: true, sentCount, total: recipients.length };
    }
}

export const emailService = new EmailService();
export default emailService;
