REBIOMED GUEST DEMO — BẢN SỬA LỖI 7 UNIT TEST

Gói này chỉ gồm 2 file cần thay thế trong repository Rebiomed:
  server/db.ts
  cloudflare/generated/db.ts

Nguyên nhân đã xác định từ log:
  - Hàm getUserById/getUserByOpenId trước đó gọi ensureGuestIdentity gây ghi database dù chỉ đọc tài khoản.
  - Backend Node nhận dạng Supporter dựa trên username, trái với quy tắc test đã dùng.

Cách sửa:
  - Guest Demo vẫn là tài khoản dùng chung; tự khởi tạo/cập nhật khi tra cứu username Guest tại luồng login, không ghi khi đọc User/Admin/Supporter.
  - Khôi phục hàm nhận diện Supporter theo role; chỉ chấp nhận tài khoản role=admin username=admin trong kiểm tra Dedicated Supporter.
  - Không sửa API frontend, migration, D1 hoặc secrets.

CÀI TRÊN MAC (KHÔNG PYTHON):
  cd "$HOME/Desktop/Project/WebsiteLabRebiomed/website-source/web-for-laboratory"
  mkdir -p "$HOME/Desktop/Project/WebsiteLabRebiomed/BackupGuestFix"
  cp server/db.ts "$HOME/Desktop/Project/WebsiteLabRebiomed/BackupGuestFix/server-db.ts"
  cp cloudflare/generated/db.ts "$HOME/Desktop/Project/WebsiteLabRebiomed/BackupGuestFix/cloudflare-db.ts"
  unzip -o "$HOME/Downloads/Rebiomed-Guest-Demo-Test-Fix.zip" -d .
  pnpm check
  pnpm exec tsc --project cloudflare/tsconfig.json
  pnpm test
  pnpm exec vite build
  pnpm verify:public

Nếu tất cả lệnh thành công, mới xem git status và giải quyết những file Guest khác chưa commit. Không tự push hoặc chạy D1 production migration trước khi đối chiếu schema / backup.

TRẠNG THÁI KIỂM TRA:
  - Kiểm tra cú pháp TypeScript trên 2 file: PASS.
  - Kiểm tra tĩnh Guest bootstrap không nằm trong getUserById/getUserByOpenId: PASS.
  - Kiểm tra hành vi 5 trường hợp phân quyền Supporter dạng hàm thuần: PASS.
  - CHƯA thể chạy vitest nguyên bộ trong container (không có node_modules, npm registry không truy cập được).

Giữ nguyên Worker protocol, D1 rebiomed-protocol, SESSION_SECRET và REBIOMED_PASSWORD_VAULT_KEY.
