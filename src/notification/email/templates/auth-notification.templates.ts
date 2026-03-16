interface ResetPasswordTemplateData {
  username: string;
  confirmUrl: string;
}

interface OtpTemplateBaseData {
  code: string;
  expiresAt: string;
  confirmUrl: string;
}

interface VerifyEmailOtpTemplateData extends OtpTemplateBaseData {
  purpose: 'VERIFY_EMAIL';
}

interface GenericOtpTemplateData extends OtpTemplateBaseData {
  purpose: string;
}

export function resetPasswordTemplate(data: ResetPasswordTemplateData) {
  return {
    subject: '[VN Tours] Đặt lại mật khẩu của bạn',
    html: `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #2563eb; margin-bottom: 16px;">Yêu cầu đặt lại mật khẩu</h2>
      <p>Chào ${data.username || 'bạn'},</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>Nhấn vào nút bên dưới để đặt lại mật khẩu. Liên kết này sẽ hết hạn sau <strong>15 phút</strong>:</p>
      <a href="${data.confirmUrl}"
         style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;margin:12px 0;">
        Đặt lại mật khẩu
      </a>
      <p style="word-break: break-all; font-size: 12px; color: #64748b;">
        Nếu nút không hoạt động, hãy sao chép và dán đường dẫn sau vào trình duyệt của bạn:<br/>
        <span>${data.confirmUrl}</span>
      </p>
      <p style="color: #64748b; font-size: 13px;">
        Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        Email này được gửi tự động từ hệ thống VN Tours.
      </p>
    </div>
  `,
  };
}

export function verifyEmailOtpTemplate(data: VerifyEmailOtpTemplateData) {
  return {
    subject: '[VN Tours] Xác minh email đăng ký tài khoản',
    html: `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #2563eb; margin-bottom: 16px;">Xác minh email đăng ký</h2>
      <p>Chào bạn,</p>
      <p>Sử dụng mã OTP dưới đây để xác minh email và hoàn tất đăng ký tài khoản VN Tours:</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 0.4em; padding: 12px 16px; background: #eff6ff; border-radius: 8px; text-align: center; margin: 12px 0;">
        ${data.code}
      </div>
      <p style="margin-bottom: 8px;">
        Mã sẽ hết hạn vào: <strong>${new Date(data.expiresAt).toLocaleString('vi-VN')}</strong>
      </p>

      <a href="${data.confirmUrl}"
         style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;margin:12px 0;">
        Xác minh email
      </a>

      <p style="color: #64748b; font-size: 13px;">
        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        Email này được gửi tự động từ hệ thống VN Tours.
      </p>
    </div>
  `,
  };
}

export function genericOtpTemplate(data: GenericOtpTemplateData) {
  return {
    subject: '[VN Tours] Mã OTP của bạn',
    html: `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #2563eb; margin-bottom: 16px;">Mã OTP</h2>
      <p>Chào bạn,</p>
      <p>Mã OTP của bạn là:</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 0.4em; padding: 12px 16px; background: #eff6ff; border-radius: 8px; text-align: center; margin: 12px 0;">
        ${data.code}
      </div>
      <p style="margin-bottom: 8px;">
        Mã sẽ hết hạn vào: <strong>${new Date(data.expiresAt).toLocaleString('vi-VN')}</strong>
      </p>

      <a href="${data.confirmUrl}"
         style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;margin:12px 0;">
        Tiếp tục
      </a>

      <p style="color: #64748b; font-size: 13px;">
        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        Email này được gửi tự động từ hệ thống VN Tours.
      </p>
    </div>
  `,
  };
}
