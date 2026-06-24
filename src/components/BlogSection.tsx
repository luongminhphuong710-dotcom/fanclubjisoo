import Link from "next/link";
import type { BlogPostData } from "@/lib/blog";

type BlogSectionProps = {
  posts: BlogPostData[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "Chưa xuất bản";
  }

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export function BlogSection({ posts }: BlogSectionProps) {
  return (
    <section className="contentSection" id="blog">
      <div className="panelHeader blogHeader">
        <div>
          <p className="eyebrowDark">Blog</p>
          <h2>Blog JISOO Vietnam Fanclub</h2>
        </div>
        <Link className="adminLink" href="/admin">
          Admin đăng bài
        </Link>
      </div>
      <p className="sectionHint">
        Các bài viết do admin Mia cập nhật về JISOO, âm nhạc, phim ảnh, hình ảnh và hoạt động fanclub.
      </p>

      <div className="blogGrid">
        {posts.map((post) => (
          <article className="blogCard" key={post.id}>
            {post.imageUrl ? (
              <div className="blogImage">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.imageUrl} alt="" />
              </div>
            ) : null}
            <div className="blogBody">
              <p className="blogMeta">
                {formatDate(post.publishedAt)} · {post.authorName}
              </p>
              <h3>{post.title}</h3>
              {post.excerpt ? <p>{post.excerpt}</p> : null}
              <div className="blogTags">
                {post.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              <div className="blogText">{post.body}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
