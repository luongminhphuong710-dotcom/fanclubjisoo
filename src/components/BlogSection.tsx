import Link from "next/link";
import type { BlogPostData } from "@/lib/blog";

type BlogTag = {
  label: string;
  count: number;
};

type BlogSectionProps = {
  posts: BlogPostData[];
  tags?: BlogTag[];
  selectedTag?: string | null;
  title?: string;
  showFilters?: boolean;
};

export function formatBlogDate(value: string | null) {
  if (!value) {
    return "Chưa xuất bản";
  }

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function postSummary(post: BlogPostData) {
  return post.excerpt ?? `${post.body.slice(0, 150)}${post.body.length > 150 ? "..." : ""}`;
}

export function BlogSection({
  posts,
  tags = [],
  selectedTag,
  title = "Blog JISOO Vietnam Fanclub",
  showFilters = false
}: BlogSectionProps) {
  const normalizedSelectedTag = selectedTag?.replace(/^#/, "").trim() || "";

  return (
    <section className="contentSection" id="blog">
      <div className="panelHeader blogHeader">
        <div>
          <p className="eyebrowDark">Blog</p>
          <h2>{title}</h2>
        </div>
      </div>
      <p className="sectionHint">
        Các bài viết được cập nhật về JISOO, âm nhạc, phim ảnh, hình ảnh và hoạt động fanclub.
      </p>

      {showFilters ? (
        <div className="blogFilters">
          <form action="/blog" className="hashtagSearch">
            <input defaultValue={normalizedSelectedTag} name="tag" placeholder="Tìm theo hashtag, ví dụ JISOO" />
            <button type="submit">Tìm</button>
          </form>
          <div className="tagFilterList">
            <Link className={!normalizedSelectedTag ? "active" : undefined} href="/blog">
              Tất cả
            </Link>
            {tags.map((tag) => (
              <Link
                className={tag.label.toLowerCase() === normalizedSelectedTag.toLowerCase() ? "active" : undefined}
                href={`/blog?tag=${encodeURIComponent(tag.label)}`}
                key={tag.label}
              >
                #{tag.label} <span>{tag.count}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="blogGrid">
        {posts.map((post) => (
          <article className="blogCard" key={post.id}>
            <Link className="blogCardLink" href={`/blog/${post.slug}`}>
              {post.imageUrl ? (
                <div className="blogImage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.imageUrl} alt="" />
                </div>
              ) : null}
              <div className="blogBody">
                <p className="blogMeta">
                  {formatBlogDate(post.publishedAt)} · {post.authorName}
                </p>
                <h3>{post.title}</h3>
                <p>{postSummary(post)}</p>
                <div className="blogTags">
                  {post.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
                <strong className="readMoreLink">Đọc full bài</strong>
              </div>
            </Link>
          </article>
        ))}
        {posts.length === 0 ? <p className="empty">Chưa có bài blog nào khớp hashtag này.</p> : null}
      </div>
    </section>
  );
}
