# IDEA-inspired Workspace

Giao diện theo ảnh IntelliJ do người dùng cung cấp, giữ navbar, thao tác và hành vi gốc của VS Code. Bản 0.4.2 chỉ thay đổi appearance: theme, file icons, product icons và CSS/logo NhpDev.

## Cài đặt

Cài `idea-workspace-0.4.2.vsix`. Khi extension kích hoạt:

1. Theme và hai bộ icons tự áp dụng, không cần chạy Apply hay script.
2. Extension tự cài CSS và logo nếu có quyền ghi bản VS Code.
3. Với bản Linux trong thư mục hệ thống, extension tự mở hộp thoại xác thực quản trị qua PolicyKit. Bạn nhập mật khẩu tại hộp thoại hệ điều hành, không gõ lệnh terminal. Dùng runtime có sẵn của VS Code, không cần cài Node riêng.
4. Sau khi CSS/logo được cài, thoát hoàn toàn tất cả cửa sổ VS Code rồi mở lại để nạp workbench mới. Theme/icons có hiệu lực ngay.

Nếu hủy xác thực, theme và icons vẫn hoạt động. Extension không hỏi mật khẩu lặp lại ở mỗi lần mở. Dùng **IDEA Workspace: Apply UI and Logo** khi muốn thử lại; đây là lệnh khôi phục tùy chọn, không phải bước cài bắt buộc.

## Appearance, giữ nguyên workflow

- Nền editor xám đen `#242424` đúng ảnh tham chiếu; header gradient teal nhẹ chuyển về xám đen.
- Product icon font WOFF gồm 24 glyph tự vẽ; các icon còn lại dùng fallback VS Code.
- Header dùng cỡ chữ 14px, footer 13px. Chiều cao và vùng tương tác vẫn do layout engine của VS Code quản lý, tránh tràn/che nội dung.
- Logo NhpDev cho nền tối: biểu tượng kèm chữ NhpDev, nét xám sáng + cam, nền trong suốt; giữ đường nét gốc và màu cam, ngay trước File khi custom titlebar có phần tử app icon.
- Không thêm nút Run/Debug/Terminal vào navbar, không cung cấp keymap thay thế.
- Không đổi minimap, breadcrumbs, thứ tự/vị trí panel, chế độ tab, command center hay setting Experimental Modern UI.
- Khi nâng cấp từ 0.2, các setting workflow mà extension từng đổi được hoàn lại theo journal nếu người dùng chưa sửa tiếp. Theme và palette vẫn được giữ.

Không thay icon taskbar hoặc logo Activity Bar. Navbar/menu vẫn là thành phần gốc của VS Code. Native titlebar không có phần tử app icon tương ứng; extension giữ nguyên lựa chọn titlebar của người dùng.

## Logo và hoàn tác

**IDEA Workspace: Choose Logo (SVG or PNG)** tự áp dụng logo sau khi chọn. Logo phải là file local SVG tĩnh tự chứa hoặc PNG hợp lệ, tối đa 1MB. Để trống `ideaWorkspace.logoPath` dùng bản biểu tượng + chữ NhpDev dành cho nền tối. File logo navy/cam gốc vẫn được giữ trong `media/logo.svg`.

**IDEA Workspace: Restore UI and Settings** tự gỡ CSS và khôi phục appearance; có thể mở xác thực hệ điều hành nếu cần. Sau Restore, tự áp dụng được dừng cho tới khi người dùng chủ động Apply lại. Gỡ extension sau khi Restore.

Restore chỉ xóa khối CSS có marker, giữ chỉnh sửa khác trong workbench. Settings/màu được phục hồi theo từng mục, giữ thay đổi người dùng thêm sau đó. Backup gắn version/hash nằm trong storage của extension. Helper quản trị ghim hash cho Apply và giữ ownership/mode; không chmod thư mục cài đặt, không ghi đè toàn bộ HTML bằng backup cũ, không vô hiệu CSP hay kiểm tra toàn vẹn.

## Giới hạn

VS Code không có API theme cho logo hệ thống hoặc CSS workbench. Phần deep UI sửa file cài đặt, dùng chung các profile và có thể hiện cảnh báo toàn vẹn. Sau cập nhật VS Code, extension tự thử áp dụng lại một lần. Sau hủy xác thực, có thể dùng lệnh Apply để thử lại. Xác thực quản trị tự động hiện triển khai trên Linux có `pkexec`; Windows/macOS vẫn tự áp dụng theme/icons, chưa có luồng nâng quyền tương đương được kiểm thử.

## Build

```sh
npm ci
npm test
npm run package
```

Runtime extension không có dependency bên ngoài. Tạo lại font (tùy chọn): Python + fonttools 4.60.1, chạy `scripts/build-product-icons.py`. Source và tài nguyên do project cung cấp; không tải tài nguyên mạng hoặc gửi telemetry.

## Màu code trong 0.4.0

| Thành phần | Màu |
| --- | --- |
| Datatype / primitive | Cyan `#76C7E7` |
| Class / record | Vàng nhạt `#E2C077` |
| Interface | Xanh ngọc `#7DCFC1` |
| Method / function | Xanh dương `#61AFEF` |
| Tên biến, field, parameter | Xám sáng `#D4D4D4` |
| Java constant `final` + `UPPER_CASE` | Tím `#C792EA` |

Nhận diện constant Java dùng semantic token `readonly` của language server, rồi lọc tên `UPPER_CASE`. Áp dụng cả khai báo và các chỗ sử dụng. Biến mutable viết hoa và biến `final` camelCase vẫn xám sáng; enum viết hoa được coi là constant vì Java có final ngầm định. Không dùng regex đoán mọi tên viết hoa là constant.

Extension chỉ đọc token của provider hiện có và thêm text decorations; không đăng ký provider Java thay thế, không sửa JDK/Maven/PATH hoặc setting Java. Cần Java Language Server hoạt động và semantic highlighting bật để phân loại chính xác. Khi server chưa sẵn sàng, dùng màu theme cơ bản; việc cập nhật semantic có thể mất một nhịp sau khi server khởi tạo.

Logo header 0.4.1: [xem ảnh thực tế](docs/screenshots/logo-dark-0.4.1.png).

## Icon theme 0.4.2

38 SVG file/folder assets nét mảnh, 50 liên kết đuôi file và 30 tên file đặc biệt. Java dạng C trong vòng tròn xanh; folder mở/đóng riêng, source/resources/build folder có dấu hiệu màu. JS/TS/Kotlin tách riêng; có Maven, Gradle, XML, JSON, properties, YAML, Docker, SQL, Markdown và các loại file phổ biến.

24 product glyphs gồm Project dạng folder và các biểu tượng class/interface/enum/method/field trong Outline/breadcrumbs. Các icon riêng do extension khác cung cấp vẫn có thể dùng kiểu riêng hoặc fallback. Đây là bộ tự vẽ theo style tham chiếu, chưa phải bản sao toàn bộ icons IntelliJ.

File icon theme của VS Code phân loại theo tên/đuôi file và language ID; không đọc nội dung Java để thay class/interface/enum icon. Vì vậy file `.java` trong Explorer dùng C chung, còn biểu tượng semantic theo loại được áp dụng ở Outline khi language provider cung cấp symbol kind. [API icon theme](https://code.visualstudio.com/api/extension-guides/file-icon-theme).

[Ảnh Explorer thực tế 0.4.2](docs/screenshots/icons-0.4.2.png). Có thể dựng lại các SVG bằng `python3 scripts/build-file-icons.py` (không cần thư viện ngoài). Phần icons dùng API chính thức; bản này không thay đổi CSS chrome so với 0.4.1.
