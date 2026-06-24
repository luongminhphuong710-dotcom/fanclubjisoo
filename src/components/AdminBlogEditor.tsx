"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import type { BlogPostData } from "@/lib/blog";
import type { BlogCommentData } from "@/lib/blogComments";
import type { PublicMember } from "@/lib/members";

type MessageState = {
  type: "idle" | "success" | "error";
  text: string;
};

const emptyForm = {
  title: "",
  excerpt: "",
  body: "",
  imageUrl: "",
  tags: "JISOO, Blog",
  published: true
};

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_DATA_CHARS = 1_500_000;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error("File ảnh chưa hợp lệ."));
      image.onload = () => {
        const maxWidth = 1400;
        const maxHeight = 900;
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Trình duyệt chưa hỗ trợ xử lý ảnh."));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.fillStyle = "#fff7fa";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };

      image.src = String(reader.result ?? "");
    };

    reader.readAsDataURL(file);
  });
}

function dateLabel(value: string | null | undefined) {
  if (!value) {
    return "Chưa xuất bản";
  }

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function postPayload(post: BlogPostData, published: boolean) {
  return {
    title: post.title,
    excerpt: post.excerpt ?? "",
    body: post.body,
    imageUrl: post.imageUrl ?? "",
    tags: post.tags,
    published
  };
}

export function AdminBlogEditor() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, BlogCommentData[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedPostIds, setExpandedPostIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<MessageState>({ type: "idle", text: "" });
  const [loading, setLoading] = useState(false);

  async function loadMembers() {
    const response = await fetch("/api/admin/members", { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const result = (await response.json()) as { data: PublicMember[] };
    setMembers(result.data);
  }

  async function loadPosts() {
    const response = await fetch("/api/admin/blog", { cache: "no-store" });

    if (response.status === 401) {
      setLoggedIn(false);
      return;
    }

    if (!response.ok) {
      setMessage({ type: "error", text: "Chưa tải được danh sách bài viết." });
      return;
    }

    const result = (await response.json()) as { data: BlogPostData[] };
    setPosts(result.data);
    setLoggedIn(true);
    void loadMembers();
  }

  async function loadComments(postId: string) {
    const response = await fetch(`/api/admin/blog/${postId}/comments`, { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const result = (await response.json()) as { data: BlogCommentData[] };
    setCommentsByPost((current) => ({ ...current, [postId]: result.data }));
  }

  useEffect(() => {
    void loadPosts();
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage({ type: "idle", text: "" });

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? "")
      })
    });

    const result = (await response.json()) as { message?: string };
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: result.message ?? "Đăng nhập chưa thành công." });
      return;
    }

    setMessage({ type: "success", text: result.message ?? "Đăng nhập admin thành công." });
    await loadPosts();
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Vui lòng chọn đúng file ảnh." });
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setMessage({ type: "error", text: "Ảnh tối đa 6MB. Hãy chọn ảnh nhẹ hơn." });
      return;
    }

    setMessage({ type: "idle", text: "Đang xử lý ảnh..." });

    try {
      const dataUrl = await resizeImage(file);

      if (dataUrl.length > MAX_IMAGE_DATA_CHARS) {
        setMessage({ type: "error", text: "Ảnh sau khi nén vẫn quá lớn. Hãy chọn ảnh nhỏ hơn." });
        return;
      }

      setForm((current) => ({ ...current, imageUrl: dataUrl }));
      setMessage({ type: "success", text: "Đã tải ảnh lên bản nháp bài viết." });
    } catch {
      setMessage({ type: "error", text: "Chưa xử lý được ảnh này. Hãy thử ảnh khác." });
    } finally {
      event.target.value = "";
    }
  }

  function editPost(post: BlogPostData) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? "",
      body: post.body,
      imageUrl: post.imageUrl ?? "",
      tags: post.tags.join(", "),
      published: post.published
    });
    setMessage({ type: "idle", text: "" });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage({ type: "idle", text: "" });

    const payload = {
      title: form.title,
      excerpt: form.excerpt,
      body: form.body,
      imageUrl: form.imageUrl,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      published: form.published
    };

    const response = await fetch(editingId ? `/api/admin/blog/${editingId}` : "/api/admin/blog", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = (await response.json()) as { message?: string };
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: result.message ?? "Chưa lưu được bài viết." });
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    setMessage({ type: "success", text: result.message ?? "Đã lưu bài viết." });
    await loadPosts();
  }

  async function handleTogglePublish(post: BlogPostData) {
    const response = await fetch(`/api/admin/blog/${post.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(postPayload(post, !post.published))
    });

    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      setMessage({ type: "error", text: result.message ?? "Chưa đổi được trạng thái bài." });
      return;
    }

    setMessage({ type: "success", text: post.published ? "Đã ẩn bài khỏi blog công khai." : "Đã duyệt bài." });
    await loadPosts();
  }

  async function handleDeletePost(post: BlogPostData) {
    const confirmed = window.confirm(`Xóa bài "${post.title}"? Hành động này không thể hoàn tác.`);

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/admin/blog/${post.id}`, { method: "DELETE" });
    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      setMessage({ type: "error", text: result.message ?? "Chưa xóa được bài viết." });
      return;
    }

    setMessage({ type: "success", text: result.message ?? "Đã xóa bài viết." });
    await loadPosts();
  }

  async function toggleComments(postId: string) {
    const expanded = expandedPostIds.includes(postId);

    setExpandedPostIds((current) =>
      expanded ? current.filter((id) => id !== postId) : [...new Set([...current, postId])]
    );

    if (!expanded && !commentsByPost[postId]) {
      await loadComments(postId);
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();

    const body = commentDrafts[postId]?.trim() ?? "";

    if (!body) {
      setMessage({ type: "error", text: "Nhập nội dung bình luận trước khi gửi." });
      return;
    }

    const response = await fetch(`/api/admin/blog/${postId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body })
    });

    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      setMessage({ type: "error", text: result.message ?? "Chưa gửi được bình luận." });
      return;
    }

    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    setMessage({ type: "success", text: result.message ?? "Đã thêm bình luận admin." });
    await loadComments(postId);
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    setPosts([]);
    setMembers([]);
    setCommentsByPost({});
    setExpandedPostIds([]);
    setEditingId(null);
    setForm(emptyForm);
    setMessage({ type: "idle", text: "" });
  }

  if (!loggedIn) {
    return (
      <section className="contentSection adminSection">
        <div className="sectionIntro">
          <p className="eyebrowDark">Admin</p>
          <h2>Đăng nhập để vào trang quản trị</h2>
          <p>Dashboard admin cho phép đăng blog, duyệt bài thành viên, xóa bài, bình luận và xem danh sách thành viên.</p>
        </div>
        <form className="adminForm loginForm" onSubmit={handleLogin}>
          <label>
            Email admin
            <input name="email" type="email" placeholder="admin@jisoo.vn" required />
          </label>
          <label>
            Mật khẩu
            <input name="password" type="password" required />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập admin"}
          </button>
        </form>
        {message.text ? <p className={`formMessage ${message.type}`}>{message.text}</p> : null}
      </section>
    );
  }

  const pendingPosts = posts.filter((post) => !post.published).length;

  return (
    <section className="contentSection adminSection">
      <div className="panelHeader blogHeader">
        <div>
          <p className="eyebrowDark">Admin Dashboard</p>
          <h2>Quản trị Blog JISOO</h2>
        </div>
        <button className="ghostButton" type="button" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>

      <div className="adminSummaryGrid">
        <div>
          <span>{posts.length}</span>
          <strong>Tổng bài</strong>
        </div>
        <div>
          <span>{pendingPosts}</span>
          <strong>Chờ duyệt</strong>
        </div>
        <div>
          <span>{members.length}</span>
          <strong>Thành viên</strong>
        </div>
      </div>

      <div className="adminManagementGrid">
        <div className="adminPanel">
          <div className="panelHeader blogHeader">
            <div>
              <p className="eyebrowDark">Soạn bài</p>
              <h2>{editingId ? "Sửa bài viết" : "Đăng bài mới"}</h2>
            </div>
          </div>

          <form className="adminForm blogEditorForm" onSubmit={handleSave}>
            <label>
              Tiêu đề bài viết
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                minLength={4}
                placeholder="Ví dụ: JISOO và khoảnh khắc đáng nhớ tuần này"
              />
            </label>
            <label>
              Mô tả ngắn
              <input
                value={form.excerpt}
                onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
                placeholder="Tóm tắt ngắn hiển thị ngoài blog"
              />
            </label>
            <label>
              Hashtag
              <input
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="JISOO, BLACKPINK"
              />
            </label>
            <label>
              Hoặc dán URL ảnh
              <input
                value={form.imageUrl.startsWith("data:image/") ? "" : form.imageUrl}
                onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                placeholder="/images/jisoo-vietnam-fanclub-cover.png hoặc URL ảnh"
              />
            </label>
            <label className="fullRow uploadLabel">
              Tải ảnh trực tiếp
              <input accept="image/*" type="file" onChange={handleImageUpload} />
            </label>
            {form.imageUrl ? (
              <div className="imagePreview fullRow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="" />
                <button
                  className="ghostButton"
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                >
                  Xóa ảnh
                </button>
              </div>
            ) : null}
            <label className="fullRow">
              Nội dung bài viết
              <textarea
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                required
                minLength={20}
                rows={10}
                placeholder="Nhập nội dung bài viết về JISOO..."
              />
            </label>
            <label className="checkRow">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
              />
              Xuất bản ngay
            </label>
            <div className="adminActions">
              <button type="submit" disabled={loading}>
                {loading ? "Đang lưu..." : editingId ? "Cập nhật bài viết" : "Đăng bài"}
              </button>
              {editingId ? (
                <button
                  className="ghostButton"
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Hủy sửa
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="adminPanel">
          <div className="panelHeader blogHeader">
            <div>
              <p className="eyebrowDark">Thành viên</p>
              <h2>Danh sách thành viên</h2>
            </div>
          </div>
          <div className="memberList">
            {members.map((member) => (
              <article key={member.id}>
                <strong>{member.displayName}</strong>
                <span>{member.email}</span>
                <p>
                  {member.fanName || "Chưa có biệt danh"} · {member.favoriteSong || "Chưa chọn bài yêu thích"}
                </p>
              </article>
            ))}
            {members.length === 0 ? <p className="empty">Chưa có thành viên đăng ký.</p> : null}
          </div>
        </div>
      </div>

      {message.text ? <p className={`formMessage ${message.type}`}>{message.text}</p> : null}

      <div className="adminPanel">
        <div className="panelHeader blogHeader">
          <div>
            <p className="eyebrowDark">Kiểm duyệt</p>
            <h2>Bài blog và bài thành viên gửi</h2>
          </div>
        </div>

        <div className="adminPostList">
          {posts.map((post) => {
            const expanded = expandedPostIds.includes(post.id);
            const comments = commentsByPost[post.id] ?? [];

            return (
              <article className="adminPostItem" key={post.id}>
                <div className="adminPostMain">
                  {post.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.imageUrl} alt="" />
                  ) : (
                    <div className="adminPostThumbFallback" />
                  )}
                  <div>
                    <span className={post.published ? "statusBadge approved" : "statusBadge pending"}>
                      {post.published ? "Đã duyệt" : "Chờ duyệt"}
                    </span>
                    <h3>{post.title}</h3>
                    <p>
                      {post.authorName}
                      {post.authorEmail ? ` · ${post.authorEmail}` : ""} · {dateLabel(post.publishedAt ?? post.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="adminPostActions">
                  <button className="ghostButton" type="button" onClick={() => editPost(post)}>
                    Sửa
                  </button>
                  <button className="ghostButton" type="button" onClick={() => handleTogglePublish(post)}>
                    {post.published ? "Ẩn" : "Duyệt"}
                  </button>
                  <button className="ghostButton dangerButton" type="button" onClick={() => handleDeletePost(post)}>
                    Xóa
                  </button>
                  <button className="ghostButton" type="button" onClick={() => toggleComments(post.id)}>
                    Bình luận
                  </button>
                </div>

                {expanded ? (
                  <div className="adminCommentPanel">
                    <div className="adminCommentList">
                      {comments.map((comment) => (
                        <div key={comment.id}>
                          <strong>{comment.authorName}</strong>
                          <span>{dateLabel(comment.createdAt)}</span>
                          <p>{comment.body}</p>
                        </div>
                      ))}
                      {comments.length === 0 ? <p className="empty">Chưa có bình luận.</p> : null}
                    </div>
                    <form onSubmit={(event) => handleCommentSubmit(event, post.id)}>
                      <textarea
                        value={commentDrafts[post.id] ?? ""}
                        onChange={(event) =>
                          setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))
                        }
                        placeholder="Nhập bình luận admin cho bài này..."
                        rows={3}
                      />
                      <button type="submit">Gửi bình luận</button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
          {posts.length === 0 ? <p className="empty">Chưa có bài blog nào.</p> : null}
        </div>
      </div>
    </section>
  );
}
