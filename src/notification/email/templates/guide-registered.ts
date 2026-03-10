interface GuideRegisteredTemplateData {
  guideName: string;
  guideId: string;
}

export function guideRegisteredTemplate(data: GuideRegisteredTemplateData) {
  return {
    subject: `[VN Tours] Đơn đăng ký HDV mới: ${data.guideName}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Đơn đăng ký hướng dẫn viên mới</h2>
        <p>Xin chào Admin,</p>
        <p>Người dùng <strong>${data.guideName}</strong> vừa gửi đơn đăng ký làm hướng dẫn viên du lịch và đang chờ duyệt.</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0;"><strong>ID hồ sơ:</strong> ${data.guideId}</p>
        </div>
        <p>Vui lòng đăng nhập vào trang quản trị để xem chi tiết và phê duyệt.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">Email này được gửi tự động từ hệ thống VN Tours.</p>
      </div>
    `,
  };
}
