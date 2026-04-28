# Tổng quan dự án

## Dự án làm về gì

Đây là một **nền tảng du lịch và đặt chỗ trực tuyến** hướng tới người dùng muốn khám phá Việt Nam: tìm chỗ ở, lên lịch tour, gợi ý trải nghiệm ẩm thực địa phương, và mua sắm sản phẩm liên quan chuyến đi. Sản phẩm kết nối người du lịch với **khách sạn & phòng**, **tour**, **món ăn / điểm ăn**, **hướng dẫn viên**, đồng thời có khu vực **khám phá điểm đến theo tỉnh thành** (mô tả, hình ảnh, điểm nổi bật, phường/xã…).

Trọng tâm là **trải nghiệm người dùng mượt**: tìm kiếm—lọc—xem chi tiết—đặt—thanh toán—theo dõi đơn hàng và tương tác sau chuyến (đánh giá, danh sách yêu thích). Có luồng **tài khoản cá nhân** để quản lý hồ sơ, đặt phòng, đặt tour, tra cứu đơn tour công khai, và khu vực **đã lưu** (đánh giá & wishlist). Một phần nội dung thương hiệu (giới thiệu, dịch vụ, đội ngũ, thư viện ảnh, liên hệ) giúp người dùng hiểu độ tin cậy và cách hoạt động của nền tảng.

---

## Đối tượng và bối cảnh sử dụng

- **Khách du lịch / người đi công tác** cần đặt phòng, book tour, đọc review và lưu địa điểm yêu thích.
- **Người tò mò về vùng miền** muốn xem tỉnh thành dưới dạng “cẩm nang” (thời điểm lý tưởng, điểm nhấn, số liệu tham khảo).
- **Người quan tâm hướng dân địa phương** có thể xem danh sách và hồ sơ hướng dẫn viên; luồng riêng cho **đăng ký / quản lý hồ sơ hướng dẫn viên** trong khu vực tài khoản.

Ngôn ngữ giao diện được thiết kế **đa ngôn ngữ** (ví dụ tiếng Việt và tiếng Anh), phù hợp cả khách trong nước và quốc tế.

---

## Các nhóm nội dung & chức năng chính (theo trải nghiệm)

| Khu vực | Ý nghĩa |
|--------|---------|
| **Trang chủ** | Giới thiệu nhanh: khám phá theo vùng, điểm đến nổi bật, khách sạn gợi ý, ẩm thực, cẩm nang / blog gợi ý, phản hồi khách hàng, ưu đãi. |
| **Danh mục** | Danh sách và chi tiết **phòng**, **khách sạn**, **tour**, **món ăn**, kênh **mua sắm** (sản phẩm du lịch). |
| **Điểm đến & tỉnh thành** | Tìm kiếm điểm đến; trang **tỉnh/thành** với mô tả, ảnh, highlight, thông tin tham khảo và (ở trang chi tiết) phường/xã. |
| **Hướng dẫn viên** | Danh sách và chi tiết hồ sơ hướng dẫn viên. |
| **Đặt chỗ & thanh toán** | Đặt phòng / tour, tiến hành thanh toán theo luồng sản phẩm, xem **kết quả thanh toán**; tra cứu **mã đặt tour** công khai khi cần. |
| **Tài khoản** | Tổng quan, chỉnh sửa hồ sơ, đổi mật khẩu; quản lý **đặt tour**, **đặt phòng**; mục **đã lưu** (đánh giá & wishlist); đăng ký hồ sơ hướng dẫn viên. |
| **Thông tin thương hiệu** | Về chúng tôi, dịch vụ, đội ngũ, thư viện ảnh, liên hệ. |
| **Đăng nhập** | Đăng ký, đăng nhập, quên mật khẩu (gửi yêu cầu và xác nhận đặt lại). |

Một số phần trợ lý trên giao diện (ví dụ hội thoại gợi ý) hỗ trợ người dùng **hỏi nhanh** mà không cần tìm thủ công toàn bộ trang.

---

## Phong cách sản phẩm (trải nghiệm & hình thức)

- **Giao diện**: phong cách **hiện đại, sạch**, gần với ứng dụng dịch vụ (SaaS) — ưu tiên **đọc dễ**, **thứ bậc thông tin rõ** (tiêu đề, đoạn, khối nội dung, khoảng cách đều đặn), tránh rối mắt.
- **Hình ảnh & layout**: bố cục nhất quán giữa các trang; ảnh bìa và thẻ nội dung phục vụ quét nhanh (tên địa điểm, giá, tag, vùng miền).
- **Hành vi người dùng**: mọi luồng chính đều nghĩ tới **đang tải**, **không có dữ liệu**, và **lỗi** — tránh “trang trắng” hoặc cảm giác bị kẹt.
- **Tính mở rộng nội dung**: tỉnh thành, mô tả tour, món ăn… có thể mở rộng theo **ngôn ngữ** và theo dữ liệu từ vận hành, không gắn chặt vào một màn hình cố định.

Tóm lại, dự án hướng tới cảm giác **chuyên nghiệp, dễ tin**, **tập trung chuyến đi tại Việt Nam** (địa phương, ẩm thực, lộ trình, con người), với hành trình từ **tò mò** → **lựa chọn** → **đặt chỗ** → **sau chuyến** được nối liền trên cùng một nền tảng.
