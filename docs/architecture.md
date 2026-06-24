# Thiết kế Website Fanclub Idol

## 1. Kiến trúc tổng quan

Ứng dụng nên đi theo mô hình "content + automation + community":

```txt
Browser
  -> Next.js App Router
    -> Server Components đọc dữ liệu SEO-friendly
    -> Route Handlers cung cấp REST API và cron endpoints
      -> Prisma ORM
        -> PostgreSQL
      -> Provider APIs: Spotify, YouTube, X, RSS
      -> Object Storage: Cloudinary/S3/Firebase Storage
```

Lý do chọn stack:

- Next.js render được cả SSR/SSG/ISR nên tốt cho SEO trang idol, album, bài viết.
- PostgreSQL phù hợp dữ liệu quan hệ: user, role, post, comment, chart snapshot, media metadata.
- Prisma giúp schema rõ ràng, migration dễ quản lý.
- Cron endpoint tách biệt với giao diện, dễ chạy bằng Vercel Cron, GitHub Actions, Cloud Scheduler hoặc server riêng.

## 2. Module Bảng xếp hạng tự động

### Luồng dữ liệu

1. Admin tạo `Idol` với `spotifyArtistId`.
2. Admin thêm `Track.youtubeVideoId` cho MV cần theo dõi view YouTube.
3. Cron gọi `/api/cron/charts` mỗi 30 phút.
4. Service tạo `ChartSnapshot`.
5. Mỗi bài hát/video được ghi thành `ChartEntry`.
6. Frontend đọc snapshot mới nhất qua `/api/charts`.

### Vì sao dùng snapshot?

Không ghi đè rank hiện tại trực tiếp vào `Track`. Mỗi lần sync tạo snapshot mới để:

- xem lịch sử biến động;
- tính tăng/giảm hạng;
- debug dữ liệu sai từ provider;
- cache frontend theo mốc `capturedAt`.

### API tích hợp

- Spotify: `GET /v1/artists/{id}/top-tracks?market=US`.
- YouTube: `GET /youtube/v3/videos?part=snippet,statistics&id=...`.
- Billboard: nên dùng provider có giấy phép hoặc nhập CSV định kỳ, vì public scraping dễ vi phạm điều khoản và kém ổn định.

## 3. Module Media Gallery

### Thiết kế lưu trữ

Database chỉ lưu metadata:

- album/concept/time: `MediaAlbum`;
- file URL/storage key: `MediaAsset`;
- kích thước ảnh/video: `width`, `height`, `durationSec`;
- placeholder tải nhanh: `blurHash`;
- phân loại: `type`, `takenAt`, `sortOrder`.

File thật nên lưu ngoài database:

- Cloudinary: tốt cho ảnh, resize, format auto, CDN nhanh.
- S3 + CloudFront: tốt cho kiểm soát chi phí/quyền truy cập lớn.
- Firebase Storage: tiện nếu app dùng Firebase Auth/Realtime.

### Tối ưu tải trang

- Dùng `coverUrl` cho album list, không tải toàn bộ asset.
- Paginate theo `albumId`, `takenAt`, `sortOrder`.
- Tạo nhiều kích thước ảnh ở storage/CDN, frontend dùng responsive images.
- Lưu `blurHash` hoặc dominant color để tránh layout shift.

## 4. Module News Aggregator

### Luồng dữ liệu

1. Admin tạo `NewsSource`: RSS URL hoặc X query.
2. Cron gọi `/api/cron/news` mỗi giờ.
3. Service lấy candidate articles/posts.
4. Bộ lọc keyword so sánh title + excerpt với `Idol.keywords` và `NewsSource.keywords`.
5. Candidate khớp keyword được upsert vào `NewsArticle` với status `PUBLISHED`.

### Chiến lược lọc

Tối thiểu:

- match tên idol;
- match biệt danh, tên fandom, hashtag;
- loại bỏ bài thiếu URL/title;
- unique theo URL.

Production nên thêm:

- allowlist domain nguồn tin;
- moderation queue `DRAFT` cho nguồn chưa tin cậy;
- dedupe theo canonical URL và similarity title;
- blocklist từ khóa gây nhiễu;
- job retry và logging.

## 5. Module Community Hub

Schema hiện có:

- `User.role`: `FAN`, `MODERATOR`, `ADMIN`.
- `CommunityPost`: tiêu đề, body, category, tag, pinned, locked.
- `Comment`: hỗ trợ reply dạng thread qua `parentId`.
- `PostLike`, `CommentLike`: khóa kép chống like trùng.

Phân quyền đề xuất:

- Fan: đọc, tạo post/comment, like.
- Moderator: ẩn/xóa post/comment, pin topic, khóa thread.
- Admin: quản lý idol, nguồn tin, media, role, cấu hình cron.

Auth có thể dùng Auth.js nếu muốn self-host hoặc Clerk nếu muốn triển khai nhanh. Khi tạo session, map role từ `User.role` vào token để kiểm tra ở API route/server action.

## 6. API routes quan trọng

### Cron charts

`GET /api/cron/charts`

- Kiểm tra `Authorization: Bearer <CRON_SECRET>`.
- Gọi `syncAllCharts()`.
- Trả số entry đã insert/update và lỗi theo provider.

### Cron news

`GET /api/cron/news`

- Kiểm tra `Authorization`.
- Gọi `syncNews()`.
- Trả số bài đã publish, skipped và lỗi nguồn.

### Public read APIs

`GET /api/charts?provider=spotify&limit=20`

Trả snapshot mới nhất và entries đã chuyển `BigInt` thành string để JSON không lỗi.

`GET /api/news?limit=20`

Trả bài có `status=PUBLISHED`, đã include nguồn và idol.

## 7. Các bước triển khai production

1. Tạo PostgreSQL database trên Neon, Supabase, RDS hoặc Cloud SQL.
2. Điền `.env`: `DATABASE_URL`, `CRON_SECRET`, API keys.
3. Chạy migration: `npm run db:migrate`.
4. Seed dữ liệu idol, track YouTube, news source.
5. Deploy lên Vercel.
6. Cấu hình env vars trên Vercel.
7. Kiểm tra `vercel.json` có cron:
   - `/api/cron/charts`: 30 phút/lần.
   - `/api/cron/news`: 1 giờ/lần.
8. Gọi thủ công cron endpoint một lần để xác nhận dữ liệu.
9. Bật logging/alerting cho lỗi provider và quota.
10. Thêm admin UI để quản lý idol, track, media, news source và moderation.

## 8. Mở rộng khi cộng đồng lớn

- Thêm Redis cache cho `/api/charts` và `/api/news`.
- Đưa job sync sang BullMQ nếu số idol/video lớn hơn timeout serverless.
- Tách read replica cho trang public traffic cao.
- Thêm full-text search PostgreSQL hoặc Meilisearch cho media/news/community.
- Dùng WebSocket hoặc Pusher cho notification/comment realtime.
- Thêm audit log cho thao tác moderator/admin.
