"use client";

import { FormEvent, useState } from "react";

type SubmitState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

export function MemberSignupForm() {
  const [state, setState] = useState<SubmitState>({ status: "idle", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

    if (password !== passwordConfirm) {
      setState({ status: "error", message: "Mật khẩu xác nhận chưa khớp." });
      return;
    }

    setState({ status: "loading", message: "Đang tạo tài khoản thành viên..." });

    const payload = {
      displayName: String(formData.get("displayName") ?? ""),
      email: String(formData.get("email") ?? ""),
      password,
      fanName: String(formData.get("fanName") ?? ""),
      favoriteSong: String(formData.get("favoriteSong") ?? "")
    };

    const response = await fetch("/api/members/register", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      setState({
        status: "error",
        message: result.message ?? "Đăng ký chưa thành công. Hãy thử lại."
      });
      return;
    }

    form.reset();
    setState({
      status: "success",
      message: result.message ?? "Tài khoản thành viên JISOO Fanclub đã được tạo."
    });
  }

  return (
    <form className="signupForm" onSubmit={handleSubmit}>
      <label>
        Tên hiển thị
        <input name="displayName" placeholder="Ví dụ: Blink Jisoo" required minLength={2} />
      </label>
      <label>
        Email
        <input name="email" type="email" placeholder="you@example.com" required />
      </label>
      <label>
        Mật khẩu
        <input name="password" type="password" placeholder="Tối thiểu 8 ký tự" required minLength={8} />
      </label>
      <label>
        Nhập lại mật khẩu
        <input name="passwordConfirm" type="password" placeholder="Nhập lại mật khẩu" required minLength={8} />
      </label>
      <label>
        Tên fan / biệt danh
        <input name="fanName" placeholder="Ví dụ: Sooya" />
      </label>
      <label>
        Bài hát JISOO yêu thích
        <select name="favoriteSong" defaultValue="FLOWER">
          <option>FLOWER</option>
          <option>earthquake</option>
          <option>EYES CLOSED</option>
          <option>Your Love</option>
          <option>All Eyes On Me</option>
          <option>Hugs & Kisses</option>
        </select>
      </label>
      <button type="submit" disabled={state.status === "loading"}>
        {state.status === "loading" ? "Đang tạo..." : "Đăng ký tài khoản"}
      </button>
      {state.message ? <p className={`formMessage ${state.status}`}>{state.message}</p> : null}
    </form>
  );
}
