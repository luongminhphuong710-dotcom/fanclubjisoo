import { HeroBanner } from "@/components/HeroBanner";
import { RegisterSection } from "@/components/RegisterSection";
import { SiteToolbar } from "@/components/SiteToolbar";

export default function RegisterPage() {
  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner
        compact
        eyebrow="Đăng ký"
        title="Đăng ký thành viên JISOO Fanclub"
        text="Tạo tài khoản thành viên để tham gia cộng đồng, bình luận, like và nhận cập nhật từ JISOO Vietnam Fanclub."
      />
      <RegisterSection />
    </main>
  );
}
