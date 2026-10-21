# Rebiomed – Guest Demo update for Workers + D1

**Gói cập nhật mã nguồn, chưa triển khai lên Cloudflare.** Gói này dựa trên `web-for-laboratory.zip` và `Update Tool.zip` do chủ dự án cung cấp. Các file đã được đặt đúng đường dẫn trong repository (không thả `routers.ts` / `db.ts` ở thư mục gốc).

## Chức năng được giữ từ thiết kế

- Tài khoản demo dùng chung `Guest`; username `Guest`, mật khẩu demo `123456`, tự được tạo/phê duyệt khi backend truy cập lookup tài khoản lần đầu.
- Guest chỉ được xem nội dung demo (mỗi danh mục một protocol đã duyệt, các mẫu và công cụ theo logic ZIP), một số module bị khóa.
- Guest có thể dùng các calculator hiển thị và ghi nhật ký tạm thời. Nhật ký Guest cũ hơn 2 giờ được xóa **khi Guest gọi API nhật ký** (không phải một lịch dọn nền đúng 2 giờ).
- Guest không được ghi nội dung chung; backend Workers và backend Node đều xác thực trước khi cho phép mutation dữ liệu chung. API của Guest dùng tài khoản đang xác thực; account Guest không xuất hiện trong danh sách quản trị.
- Không thay Worker `protocol`, D1 `rebiomed-protocol`, hai secret cũ. Không tự tạo nhánh Git hoặc metadata Co-authored-by.

## Các file chính

- `client/src/pages/Home.tsx`: Guest UI, sửa TS2367 qua kiểu trả về `auth.me`; nút tính toán của Guest hoạt động; tải lại dữ liệu sau login/logout.
- `server/{db.ts,routers.ts,_core/trpc.ts}` + `drizzle/{schema.ts,0021_guest_role.sql,meta/_journal.json}`: backend Node/MySQL theo ZIP Guest, thêm middleware chặn ghi dữ liệu chung.
- `cloudflare/generated/{db.ts,routers.ts,schema.ts,trpc.ts}`: chuyển logic Guest qua backend Workers + D1.
- `cloudflare/migrations/0004_add_guest_role.sql`: mở rộng ràng buộc role trên D1. **Migration xây dựng lại bảng users; bắt buộc backup và đối chiếu schema production trước khi chạy.**

## Cách tích hợp trên Mac (không cần Python)

**Không dùng CapNhat-Rebiomed.command cho lần này:** bản tool trước được thiết kế để chặn và bỏ qua `cloudflare/migrations/`, nên không thể deploy thay đổi schema bằng tool đó.

1. Kiểm tra và giữ lại mọi thay đổi trên Mac trước khi giải nén. Nếu `git status --short` không rỗng, có thể lưu bằng `git stash push -u -m "Backup Guest WIP before guest patch"`; **không chạy `git stash pop` sau khi chép patch** nếu chưa đối chiếu, vì có thể ghi đè mã mới.
2. Giải nén ZIP **ngay vào thư mục gốc repository**; giữ nguyên cấu trúc `client/`, `cloudflare/`, `server/`, `drizzle/`. Ví dụ, khi ZIP ở Downloads:

   ```bash
   cd "$HOME/Desktop/Project/WebsiteLabRebiomed/website-source/web-for-laboratory"
   unzip -o "$HOME/Downloads/Rebiomed-Guest-Demo-Patch.zip" -d .
   git status --short
   ```

3. Kiểm tra code trên Mac (npm/pnpm đã có):

   ```bash
   pnpm install --frozen-lockfile
   pnpm check
   pnpm exec tsc --project cloudflare/tsconfig.json
   pnpm test
   pnpm exec vite build
   pnpm verify:public
   ```

   **Chưa push khi có lỗi.** Các kiểm tra này cần thực hiện trên máy bạn; môi trường tạo ZIP không có thể cài toàn bộ dependencies do không truy cập npm registry.

4. Kiểm tra D1 production: so sánh schema bảng `users` và indexes với SQL gốc, kiểm tra migration chưa áp dụng; xem khóa ngoại/triggers trước khi đổi bảng. Sao lưu:

   ```bash
   mkdir -p "$HOME/Documents/Rebiomed-Backups"
   pnpm exec wrangler d1 export rebiomed-protocol --remote --output "$HOME/Documents/Rebiomed-Backups/guest-before-migration.sql"
   pnpm exec wrangler d1 execute DB --remote --command "SELECT sql FROM sqlite_master WHERE type='table' AND name='users';"
   pnpm exec wrangler d1 execute DB --remote --command "SELECT type,name,sql FROM sqlite_master WHERE tbl_name='users' AND type IN ('index','trigger');"
   pnpm exec wrangler d1 migrations list DB --remote
   ```

   Nếu schema production không giống schema SQL trong ZIP gốc, **không áp dụng `0004`**. Cần điều chỉnh migration theo schema thực tế. Không chạy trong production khi đang có FK/triggers tham chiếu `users` chưa được kiểm tra.

5. Thử migration ở D1 local rồi mới tính đến remote:

   ```bash
   pnpm exec wrangler d1 migrations apply DB --local
   pnpm exec wrangler d1 execute DB --local --command "SELECT sql FROM sqlite_master WHERE name='users';"
   ```

6. Sau khi backup và thử nghiệm thành công, áp dụng D1 production *trước* khi deploy mã dùng role Guest:

   ```bash
   pnpm exec wrangler d1 migrations apply DB --remote
   ```

   Xác nhận không mất các tài khoản cũ. Chỉ thực hiện nếu mọi migration pending và schema đã được kiểm tra.

7. Xem diff và đưa thẳng lên `main`, không tạo nhánh mới:

   ```bash
   git diff --check
   git status --short
   git add client/src/pages/Home.tsx server drizzle cloudflare/generated cloudflare/migrations/0004_add_guest_role.sql
   git diff --cached --stat
   git commit -m "Add Guest Demo support on Cloudflare D1"
   git push origin main
   ```

   Git dùng danh tính author/committer cấu hình trên máy; kiểm tra `git log -1 --format=fuller`. Gói ZIP không chứa file `.git` hoặc commit metadata.

8. Theo dõi Cloudflare Builds đến `Ready`, kiểm tra `/api/health`, đăng nhập Guest, calculator, API ghi nhật ký và chặn tạo/sửa nội dung chung, sau đó thử tài khoản admin/user trước đây.

## Trạng thái xác minh gói

- Đã chạy kiểm tra **cú pháp TypeScript/TSX** bằng transpiler, không có lỗi parser.
- Đã chạy D1 SQL `0001` → `0004` trên database SQLite thử với tài khoản cũ: giữ nguyên dữ liệu account/hash/vault và chấp nhận role `guest`.
- **Chưa chạy pnpm check/test/build toàn bộ** do môi trường xây dựng file không có npm registry để cài dependencies.
- **Chưa kiểm tra schema production thật** và không thực thi migration/deploy trên Cloudflare của bạn.

Các giới hạn vận hành: vì tài khoản Guest dùng chung, nhật ký sẽ dùng chung và có thể xem bởi người khác đăng nhập Guest. Không nhập dữ liệu riêng tư thật vào tài khoản demo.
