"use client";

import { FormEvent, useState } from "react";

type SubmitState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

export function MemberLoginForm() {
  const [state, setState] = useState<SubmitState>({ status: "idle", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading", message: "Đang đăng nhập..." });

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/members/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? "")
      })
    });

    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      setState({
        status: "error",
        message: result.message ?? "Đăng nhập chưa thành công."
      });
      return;
    }

    setState({
      status: "success",
      message: result.message ?? "Đăng nhập thành viên thành công."
    });
  }

  return (
    <form className="signupForm loginForm" onSubmit={handleSubmit}>
      <label>
        Email
        <input name="email" type="email" placeholder="you@example.com" required />
      </label>
      <label>
        Mật khẩu
        <input name="password" type="password" required />
      </label>
      <button type="submit" disabled={state.status === "loading"}>
        {state.status === "loading" ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      {state.message ? <p className={`formMessage ${state.status}`}>{state.message}</p> : null}
    </form>
  );
}
