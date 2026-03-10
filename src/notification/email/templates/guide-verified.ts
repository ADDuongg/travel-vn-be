interface GuideVerifiedTemplateData {
  guideName: string;
  isVerified: boolean;
}

export function guideVerifiedTemplate(data: GuideVerifiedTemplateData) {
  const approved = data.isVerified;

  return {
    subject: approved
      ? '[VN Tours] Hồ sơ HDV đã được duyệt!'
      : '[VN Tours] Hồ sơ HDV chưa được duyệt',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${approved ? '#16a34a' : '#dc2626'};">
          ${approved ? 'Chúc mừng! Hồ sơ HDV đã được duyệt' : 'Hồ sơ HDV chưa được duyệt'}
        </h2>
        <p>Xin chào <strong>${data.guideName}</strong>,</p>
        ${
          approved
            ? `<p>Hồ sơ hướng dẫn viên du lịch của bạn đã được admin phê duyệt thành công. Bạn đã có thể nhận tour và hiển thị trên danh sách hướng dẫn viên.</p>`
            : `<p>Rất tiếc, hồ sơ hướng dẫn viên du lịch của bạn chưa được phê duyệt. Vui lòng liên hệ admin để biết thêm chi tiết hoặc cập nhật hồ sơ và thử lại.</p>`
        }
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">Email này được gửi tự động từ hệ thống VN Tours.</p>
      </div>
    `,
  };
}
