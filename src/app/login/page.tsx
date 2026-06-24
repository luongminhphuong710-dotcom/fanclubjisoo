import { HeroBanner } from "@/components/HeroBanner";
import { MemberLoginForm } from "@/components/MemberLoginForm";
import { SiteToolbar } from "@/components/SiteToolbar";

export default function LoginPage() {
  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner
        compact
        eyebrow="Thành viên"
        title="Đăng nhập JISOO Fanclub"
        text="Đăng nhập tài khoản thành viên để sẵn sàng dùng các tính năng cộng đồng của JISOO Vietnam Fanclub."
      />
      <section className="clubSection authSection">
        <div className="sectionIntro">
          <p className="eyebrowDark">Đăng nhập</p>
          <h2>Tài khoản thành viên</h2>
          <p>Dùng email và mật khẩu đã đăng ký để vào tài khoản thành viên fanclub.</p>
        </div>
        <MemberLoginForm />
      </section>
    </main>
  );
}
