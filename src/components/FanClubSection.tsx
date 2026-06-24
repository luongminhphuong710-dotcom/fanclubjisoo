import { MemberSignupForm } from "@/components/MemberSignupForm";

export function FanClubSection() {
  return (
    <section className="clubSection" id="fanclub">
      <div className="sectionIntro">
        <p className="eyebrowDark">Fan club</p>
        <h2>Cộng đồng BLINK yêu JISOO</h2>
        <p>
          Đăng ký thành viên để tham gia các hoạt động bình chọn, cập nhật tin mới, chia sẻ khoảnh khắc yêu thích và
          nhận lịch sự kiện của fanclub.
        </p>
      </div>
      <MemberSignupForm />
    </section>
  );
}
