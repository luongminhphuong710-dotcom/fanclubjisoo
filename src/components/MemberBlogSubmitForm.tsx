"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";

type SubmitState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
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

export function MemberBlogSubmitForm() {
  const [state, setState] = useState<SubmitState>({ status: "idle", message: "" });
  const [imageUrl, setImageUrl] = useState("");

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setState({ status: "error", message: "Vui lòng chọn đúng file ảnh." });
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setState({ status: "error", message: "Ảnh tối đa 6MB. Hãy chọn ảnh nhẹ hơn." });
      return;
    }

    setState({ status: "loading", message: "Đang xử lý ảnh..." });

    try {
      const dataUrl = await resizeImage(file);

      if (dataUrl.length > MAX_IMAGE_DATA_CHARS) {
        setState({ status: "error", message: "Ảnh sau khi nén vẫn quá lớn. Hãy chọn ảnh nhỏ hơn." });
        return;
      }

      setImageUrl(dataUrl);
      setState({ status: "success", message: "Đã thêm ảnh vào bài gửi." });
    } catch {
      setState({ status: "error", message: "Chưa xử lý được ảnh này. Hãy thử ảnh khác." });
    } finally {
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading", message: "Đang gửi bài để admin duyệt..." });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      title: String(formData.get("title") ?? ""),
      excerpt: String(formData.get("excerpt") ?? ""),
      body: String(formData.get("body") ?? ""),
      imageUrl,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    };

    const response = await fetch("/api/members/blog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      setState({
        status: "error",
        message: result.message ?? "Chưa gửi được bài. Hãy đăng nhập thành viên rồi thử lại."
      });
      return;
    }

    form.reset();
    setImageUrl("");
    setState({
      status: "success",
      message: result.message ?? "Đã gửi bài. Admin sẽ duyệt trước khi hiển thị."
    });
  }

  return (
    <section className="contentSection adminSection">
      <div className="panelHeader blogHeader">
        <div>
          <p className="eyebrowDark">Bài cộng đồng</p>
          <h2>Gửi bài blog về JISOO</h2>
        </div>
        <Link className="adminLink" href="/login">
          Đăng nhập
        </Link>
      </div>
      <p className="sectionHint">Thành viên cần đăng nhập trước khi gửi bài. Bài sẽ ở trạng thái chờ admin duyệt.</p>

      <form className="adminForm blogEditorForm" onSubmit={handleSubmit}>
        <label>
          Tiêu đề bài viết
          <input name="title" required minLength={4} placeholder="Ví dụ: Khoảnh khắc JISOO khiến mình nhớ mãi" />
        </label>
        <label>
          Mô tả ngắn
          <input name="excerpt" placeholder="Tóm tắt ngắn hiển thị ngoài blog" />
        </label>
        <label className="fullRow">
          Hashtag
          <input name="tags" defaultValue="JISOO, Fanclub" placeholder="JISOO, BLACKPINK" />
        </label>
        <label className="fullRow uploadLabel">
          Tải ảnh trực tiếp
          <input accept="image/*" type="file" onChange={handleImageUpload} />
        </label>
        {imageUrl ? (
          <div className="imagePreview fullRow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" />
            <button className="ghostButton" type="button" onClick={() => setImageUrl("")}>
              Xóa ảnh
            </button>
          </div>
        ) : null}
        <label className="fullRow">
          Nội dung bài viết
          <textarea name="body" required minLength={20} rows={10} placeholder="Nhập nội dung bài viết..." />
        </label>
        <div className="adminActions">
          <button type="submit" disabled={state.status === "loading"}>
            {state.status === "loading" ? "Đang gửi..." : "Gửi bài chờ duyệt"}
          </button>
        </div>
      </form>

      {state.message ? <p className={`formMessage ${state.status}`}>{state.message}</p> : null}
    </section>
  );
}
