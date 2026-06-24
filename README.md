# Fanclub Idol Platform

Starter full-stack cho website fanclub idol với 4 module chính:

- Bảng xếp hạng tự động từ Spotify/YouTube và các provider khác.
- Media Gallery dùng metadata trong PostgreSQL, file thật lưu ở Cloudinary/S3/Firebase Storage.
- News Aggregator từ RSS và X API, có lọc keyword trước khi publish.
- Community Hub với user role, bài đăng, bình luận và like.

## Tech stack đề xuất

- Frontend/Backend: Next.js App Router + Route Handlers.
- Database: PostgreSQL + Prisma ORM.
- Cron: Vercel Cron hoặc scheduler riêng gọi `/api/cron/*`.
- Storage: Cloudinary cho ảnh tối ưu nhanh; AWS S3 + CloudFront nếu cần kiểm soát chi phí/quyền truy cập lớn.
- Auth: Auth.js/NextAuth hoặc Clerk; schema đã có role `FAN`, `MODERATOR`, `ADMIN`.
- Cache/Queue khi scale: Redis + BullMQ cho job dài, Upstash Redis cho rate-limit và cache API.

## Cấu trúc chính

```txt
prisma/schema.prisma              # Lược đồ dữ liệu toàn hệ thống
src/services/chartSync.ts         # Đồng bộ Spotify/YouTube vào ChartSnapshot
src/services/newsSync.ts          # Đồng bộ RSS/X và lọc keyword
src/app/api/cron/charts/route.ts  # Cron endpoint cho bảng xếp hạng
src/app/api/cron/news/route.ts    # Cron endpoint cho tin tức
src/app/api/charts/route.ts       # API đọc chart mới nhất
src/app/api/news/route.ts         # API đọc tin đã publish
docs/architecture.md              # Thiết kế chi tiết và hướng dẫn triển khai
```

## Chạy local

1. Cài dependencies:

```bash
npm install
```

2. Tạo `.env` từ `.env.example`, điền `DATABASE_URL`, `CRON_SECRET`, API key cần dùng.

3. Tạo database và Prisma client:

```bash
npm run db:migrate
npm run db:generate
```

4. Tạo dữ liệu nền trong Prisma Studio hoặc migration seed:

- `Idol`: điền `slug`, `name`, `keywords`, `spotifyArtistId`.
- `Track`: thêm các bài có `youtubeVideoId` nếu muốn lấy view YouTube.
- `NewsSource`: thêm RSS URL hoặc query X, ví dụ endpoint RSS là `https://example.com/rss`.

5. Chạy dev server:

```bash
npm run dev
```

6. Gọi cron local:

```bash
curl -H "Authorization: Bearer replace-with-a-random-secret" http://localhost:3000/api/cron/charts
curl -H "Authorization: Bearer replace-with-a-random-secret" http://localhost:3000/api/cron/news
```

## API mẫu

- `GET /api/charts?provider=spotify&limit=20`
- `GET /api/news?limit=20`
- `GET /api/news?idol=my-idol-slug`
- `GET /api/community/posts`

## Ghi chú tích hợp

- Spotify yêu cầu attribution và không được dùng content để tải xuống trái phép. Khi hiển thị cover/metadata, hãy link ngược về Spotify.
- YouTube quota có giới hạn; nên gom tối đa 50 `videoIds` mỗi request và cache kết quả theo lịch.
- X recent search chỉ trả dữ liệu gần đây theo quyền truy cập của app; dùng RSS cho báo chí chính thống để ổn định hơn.
- Billboard không có public API chính thức ổn định cho mọi use case; nên dùng nguồn được cấp phép, CSV nội bộ, hoặc provider thương mại trước khi đưa vào production.

Nguồn tham khảo chính thức: Spotify Web API, YouTube Data API, X API v2, Next.js Route Handlers, Vercel Cron.
