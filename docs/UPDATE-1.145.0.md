# Kiểm tra cập nhật VS Code 1.144.0 → 1.145.0

Ngày: 2026-11-06 (Asia/Ho_Chi_Minh). Extension: IDEA Workspace 0.4.0.

## Kết quả

Đã chạy chính archive người dùng tải về trong thư mục riêng, với profile và extension directory riêng. Nạp đúng VSIX 0.4.0; không sửa runtime extension để chạy trên 1.145.0. Profile thử được gieo trạng thái lần patch cuối là 0.4.0@1.144.0 để mô phỏng cập nhật.

- Extension kích hoạt trên 1.145.0, tự áp dụng lại CSS vào workbench sạch, không cần gọi Apply.
- Theme, file icons, product icons được giữ.
- Settings kiểm tra minimap=true, breadcrumbs=false, sidebar=right, commandCenter=false đều giữ nguyên. Sidebar phải trong ảnh là lựa chọn cố ý của profile thử để xác nhận extension không chuyển bố cục về trái.
- Bỏ riêng khối CSS của extension trong bộ nhớ cho hash HTML trùng archive gốc; không có thay đổi HTML ngoài khối sở hữu.
- Java Language Server Red Hat 1.58.0 và bộ nhận diện constant hoạt động trên bản mới.
- Khởi động lại bản thử: nền #242424, gradient header, logo trong suốt trước File, font icons và màu Java đều được kiểm tra qua DOM và xem ảnh. Các field/local uppercase mutable và final camelCase vẫn xám sáng.
- Node runtime đi kèm bản mới hoạt động ở chế độ Electron RunAsNode (24.22.1).

[Ảnh sau cập nhật và restart](screenshots/idea-workspace-vscode-1.145.0.png) · [Số liệu DOM](screenshots/update-1.145.0-visual.json).

Bản hệ thống vẫn là code 1.144.0-1793133881. Chưa chạy apt update/upgrade thật, chưa đổi file cài đặt/profile đang dùng, chưa thử hộp thoại quyền quản trị trên bản cập nhật hệ thống. Bản thử user-owned dùng --no-sandbox trong môi trường thử riêng; đây không phải hướng dẫn chạy IDE thường ngày. Không suy rộng kết quả này thành tương thích mọi bản VS Code tương lai hoặc mọi extension khác.

## Cập nhật bản đang dùng trên Ubuntu

Máy này cài Code bằng gói Debian và đã có Microsoft APT repository. Gói ứng viên kiểm tra được là 1.145.0-1793749366, cùng phiên bản ứng dụng với archive code-stable-x64-1793749246.tar.gz. APT dry-run xác nhận chỉ nâng cấp gói code, không thêm/xóa gói khác.

1. Lưu công việc rồi đóng tất cả cửa sổ VS Code.
2. Mở Terminal của Ubuntu (Ctrl+Alt+T), không dùng terminal bên trong VS Code.
3. Chạy:

```sh
sudo apt update
sudo apt install --only-upgrade code=1.145.0-1793749366
```

4. Mở VS Code. Extension tự nhận phiên bản mới và áp dụng lại phần logo/gradient; có thể xuất hiện xác thực quyền quản trị của hệ điều hành.
5. Sau khi có thông báo CSS đã cài, thoát hoàn toàn và mở lại một lần để nạp CSS.
6. Kiểm tra:

```sh
code --version
```

Kết quả mong đợi: 1.145.0. Theme/icons không cần cài lại. Cảnh báo toàn vẹn có thể trở lại sau khi patch; đó vẫn là giới hạn đã biết.

Không chép đè archive tar.gz lên /usr/share/code vì bản hiện tại đang do trình quản lý gói quản lý.
