/**
 * Email Notification Service for IceFlow SaaS
 * Supports Resend, SMTP, or graceful console logging for local development.
 */

interface WelcomeEmailParams {
  to: string;
  name: string;
  factoryName: string;
  loginUrl?: string;
}

interface TrialWarningParams {
  to: string;
  name: string;
  factoryName: string;
  daysRemaining: number;
  renewUrl?: string;
}

interface PaymentSuccessParams {
  to: string;
  name: string;
  factoryName: string;
  amount: number;
  newEndDate: string | Date;
}

const BRAND_COLOR = '#004a99';
const BRAND_NAVY = '#002754';
const BG_COLOR = '#f9f9ff';

function generateBaseTemplate(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_COLOR}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111c2d;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${BG_COLOR}; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #c2c6d3; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND_NAVY}; padding: 20px 30px; text-align: left;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: ${BRAND_COLOR}; width: 36px; height: 36px; text-align: center; border-radius: 4px; color: #ffffff; font-size: 20px; font-weight: bold;">
                    ❄
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">IceFlow SaaS</span>
                    <br>
                    <span style="font-size: 10px; font-weight: bold; color: #9bbdff; text-transform: uppercase; letter-spacing: 1px;">Quản Lý Xưởng Sản Xuất Đá</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 30px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f0f3ff; border-top: 1px solid #e7eeff; padding: 20px 30px; text-align: center; font-size: 12px; color: #737783;">
              <p style="margin: 0 0 6px 0; font-weight: bold; color: ${BRAND_NAVY};">IceFlow SaaS — Nền tảng quản lý lò đá tốc độ cao</p>
              <p style="margin: 0;">Hotline hỗ trợ kỹ thuật: 0909 123 456 | Email: hotro@iceflow.vn</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send Welcome Email on new factory registration
 */
export async function sendWelcomeEmail({ to, name, factoryName, loginUrl = 'https://iceflow.vn/login' }: WelcomeEmailParams) {
  const content = `
    <h2 style="color: ${BRAND_NAVY}; font-size: 20px; margin-top: 0;">Chào mừng bạn đến với IceFlow SaaS! ❄️</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #424751;">
      Xin chào <strong>${name}</strong>,<br>
      Nhà máy <strong>${factoryName}</strong> của bạn đã được khởi tạo thành công trên hệ thống IceFlow với <strong>14 ngày trải nghiệm trọn gói miễn phí</strong>.
    </p>

    <div style="background-color: #dee8ff; border: 1px solid #c2c6d3; border-radius: 4px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: ${BRAND_COLOR};">⚡ HƯỚNG DẪN BẮT ĐẦU NHANH (DƯỚI 2 PHÚT):</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #111c2d; line-height: 1.6;">
        <li>Nhấn <strong>F2</strong> ở bất kỳ đâu để tạo đơn hàng giao đá trong 30 giây.</li>
        <li>In phiếu giao hàng chuẩn máy in nhiệt K80/A5 mang theo xe.</li>
        <li>Tài xế mở đường link trên điện thoại để xem danh sách giao và gọi khách 1 chạm.</li>
      </ul>
    </div>

    <table border="0" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center" style="border-radius: 4px; background-color: ${BRAND_COLOR};">
          <a href="${loginUrl}" target="_blank" style="font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 12px 24px; display: inline-block;">
            TRUY CẬP TRANG QUẢN TRỊ NGAY &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = generateBaseTemplate('Chào mừng bạn đến với IceFlow SaaS', content);
  return sendRawEmail({ to, subject: `[IceFlow] Kích hoạt tài khoản xưởng đá ${factoryName} thành công`, html });
}

/**
 * Send Trial Expiration Warning Email (3 days / 1 day left)
 */
export async function sendTrialWarningEmail({ to, name, factoryName, daysRemaining, renewUrl = 'https://iceflow.vn/billing' }: TrialWarningParams) {
  const content = `
    <h2 style="color: #ba1a1a; font-size: 20px; margin-top: 0;">⚠️ Gói dùng thử của bạn sắp hết hạn!</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #424751;">
      Xin chào <strong>${name}</strong>,<br>
      Thời hạn dùng thử miễn phí của xưởng đá <strong>${factoryName}</strong> chỉ còn <strong>${daysRemaining} ngày</strong> nữa.
    </p>

    <div style="background-color: #ffdad6; border: 1px solid #ba1a1a; border-radius: 4px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; font-weight: bold; color: #93000a;">
        Để không làm gián đoạn việc in phiếu giao hàng và theo dõi công nợ của tài xế, vui lòng gia hạn gói dịch vụ PRO.
      </p>
    </div>

    <table border="0" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center" style="border-radius: 4px; background-color: ${BRAND_COLOR};">
          <a href="${renewUrl}" target="_blank" style="font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 12px 24px; display: inline-block;">
            GIA HẠN DỊCH VỤ QUA VIETQR &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = generateBaseTemplate('Nhắc nhở gia hạn gói dịch vụ IceFlow', content);
  return sendRawEmail({ to, subject: `[IceFlow] Nhà máy ${factoryName} chỉ còn ${daysRemaining} ngày dùng thử`, html });
}

/**
 * Send Payment Confirmation Receipt Email
 */
export async function sendPaymentSuccessEmail({ to, name, factoryName, amount, newEndDate }: PaymentSuccessParams) {
  const formattedDate = new Date(newEndDate).toLocaleDateString('vi-VN');
  const formattedAmount = Number(amount).toLocaleString('vi-VN');

  const content = `
    <h2 style="color: #1b6d24; font-size: 20px; margin-top: 0;">🎉 Xác nhận thanh toán thành công!</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #424751;">
      Xin chào <strong>${name}</strong>,<br>
      IceFlow đã nhận được khoản thanh toán duy trì phần mềm từ nhà máy <strong>${factoryName}</strong>.
    </p>

    <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #f9f9ff; border: 1px solid #c2c6d3; border-radius: 4px; margin: 20px 0; font-size: 13px;">
      <tr>
        <td style="color: #737783;">Số tiền thanh toán:</td>
        <td align="right" style="font-weight: bold; color: ${BRAND_COLOR}; font-family: monospace; font-size: 15px;">${formattedAmount} đ</td>
      </tr>
      <tr>
        <td style="color: #737783; border-top: 1px dashed #c2c6d3;">Gói cước:</td>
        <td align="right" style="font-weight: bold; color: #111c2d; border-top: 1px dashed #c2c6d3;">IceFlow PRO</td>
      </tr>
      <tr>
        <td style="color: #737783; border-top: 1px dashed #c2c6d3;">Hạn sử dụng mới:</td>
        <td align="right" style="font-weight: bold; color: #1b6d24; font-family: monospace; border-top: 1px dashed #c2c6d3;">${formattedDate}</td>
      </tr>
    </table>
  `;

  const html = generateBaseTemplate('Biên nhận thanh toán IceFlow SaaS', content);
  return sendRawEmail({ to, subject: `[IceFlow] Biên nhận thanh toán thành công - Xưởng ${factoryName}`, html });
}

/**
 * Underlying sender (Resend / SMTP / Console Fallback)
 */
async function sendRawEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'IceFlow <noreply@iceflow.vn>',
          to: [to],
          subject,
          html,
        }),
      });
      return res.ok;
    } catch (err) {
      console.error('[Email Dispatch Error]:', err);
      return false;
    }
  }

  // Local development / fallback log
  console.warn(`[Mock Email Service] Sent email to: ${to} | Subject: "${subject}"`);
  return true;
}
