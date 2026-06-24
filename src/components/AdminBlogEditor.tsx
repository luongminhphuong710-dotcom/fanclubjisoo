"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import type { BlogPostData } from "@/lib/blog";

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

export function AdminBlogEditor() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<MessageState>({ type: "idle", text: "" });
  const [loading, setLoading] = useState(false);

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

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    setPosts([]);
    setEditingId(null);
    setForm(emptyForm);
    setMessage({ type: "idle", text: "" });
  }

  if (!loggedIn) {
    return (
      <section className="contentSection adminSection">
        <div className="sectionIntro">
          <p className="eyebrowDark">Admin</p>
          <h2>Đăng nhập để cập nhật Blog JISOO</h2>
          <p>Tài khoản admin dùng để đăng bài mới và sửa nội dung blog trên website.</p>
        </div>
        <form className="adminForm" onSubmit={handleLogin}>
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

  return (
    <section className="contentSection adminSection">
      <div className="panelHeader blogHeader">
        <div>
          <p className="eyebrowDark">Admin Blog</p>
          <h2>{editingId ? "Sửa bài viết" : "Đăng bài mới về JISOO"}</h2>
        </div>
        <button className="ghostButton" type="button" onClick={handleLogout}>
          Đăng xuất
        </button>
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
            rows={9}
            placeholder="Nhập nội dung bài viết về JISOO..."
          />
        </label>
        <label className="checkRow">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
          />
          Xuất bản bài viết
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

      {message.text ? <p className={`formMessage ${message.type}`}>{message.text}</p> : null}

      <div className="adminPostList">
        {posts.map((post) => (
          <article key={post.id}>
            <div>
              <h3>{post.title}</h3>
              <p>
                {post.published ? "Đã xuất bản" : "Bản nháp"} · {post.authorName}
              </p>
            </div>
            <button className="ghostButton" type="button" onClick={() => editPost(post)}>
              Sửa
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
