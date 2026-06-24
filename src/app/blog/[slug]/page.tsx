import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBlogDate } from "@/components/BlogSection";
import { HeroBanner } from "@/components/HeroBanner";
import { SiteToolbar } from "@/components/SiteToolbar";
import { getBlogPostBySlug, listHotBlogPosts } from "@/lib/blog";
import { listBlogComments } from "@/lib/blogComments";

export const dynamic = "force-dynamic";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const [hotPosts, comments] = await Promise.all([
    listHotBlogPosts({ excludeSlug: post.slug, limit: 5 }),
    listBlogComments(post.id)
  ]);

  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner compact eyebrow="Blog" title={post.title} text="Đọc full bài viết từ JISOO Vietnam Fanclub." />

      <section className="blogDetailLayout">
        <article className="blogArticle">
          {post.imageUrl ? (
            <div className="blogArticleImage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.imageUrl} alt="" />
            </div>
          ) : null}
          <div className="blogArticleBody">
            <p className="blogMeta">
              {formatBlogDate(post.publishedAt)} · {post.authorName}
            </p>
            <h1>{post.title}</h1>
            {post.excerpt ? <p className="blogLead">{post.excerpt}</p> : null}
            <div className="blogTags">
              {post.tags.map((tag) => (
                <Link href={`/blog?tag=${encodeURIComponent(tag)}`} key={tag}>
                  #{tag}
                </Link>
              ))}
            </div>
            <div className="blogFullText">{post.body}</div>
          </div>

          <div className="blogComments">
            <h2>Bình luận</h2>
            {comments.map((comment) => (
              <article key={comment.id}>
                <p>
                  <strong>{comment.authorName}</strong>
                  <span>{formatBlogDate(comment.createdAt)}</span>
                </p>
                <div>{comment.body}</div>
              </article>
            ))}
            {comments.length === 0 ? <p className="empty">Chưa có bình luận cho bài này.</p> : null}
          </div>
        </article>

        <aside className="hotPosts" aria-label="Bài hot">
          <div className="panelHeader">
            <h2>Bài hot</h2>
          </div>
          <div className="hotPostList">
            {hotPosts.map((item) => (
              <Link href={`/blog/${item.slug}`} key={item.id}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" />
                ) : null}
                <span>{formatBlogDate(item.publishedAt)}</span>
                <strong>{item.title}</strong>
              </Link>
            ))}
            {hotPosts.length === 0 ? <p className="empty">Chưa có bài hot khác.</p> : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
