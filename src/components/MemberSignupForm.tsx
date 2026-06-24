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
    setState({ status: "loading", message: "Đang gửi đăng ký..." });

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      displayName: String(formData.get("displayName") ?? ""),
      email: String(formData.get("email") ?? ""),
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
      message: result.message ?? "Bạn đã đăng ký thành viên JISOO Fanclub."
    });
  }

  return (
    <form className="signupForm" onSubmit={handleSubmit}>
      <label>
        Tên hiển thị
        <input name="displayName" placeholder="Vi du: Blink Jisoo" required minLength={2} />
      </label>
      <label>
        Email
        <input name="email" type="email" placeholder="you@example.com" required />
      </label>
      <label>
        Tên fan / biệt danh
        <input name="fanName" placeholder="Vi du: Sooya" />
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
        {state.status === "loading" ? "Đang gửi..." : "Đăng ký thành viên"}
      </button>
      {state.message ? <p className={`formMessage ${state.status}`}>{state.message}</p> : null}
    </form>
  );
}
