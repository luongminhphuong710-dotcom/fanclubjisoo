import { FanClubSection } from "@/components/FanClubSection";
import { HeroBanner } from "@/components/HeroBanner";
import { SiteToolbar } from "@/components/SiteToolbar";

export default function FanClubPage() {
  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner
        compact
        eyebrow="Fan club"
        title="Thành viên JISOO Fanclub"
        text="Đăng ký thành viên để tham gia cộng đồng BLINK yêu JISOO và nhận cập nhật fanclub."
      />
      <FanClubSection />
    </main>
  );
}
