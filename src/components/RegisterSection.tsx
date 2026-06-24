import { MemberSignupForm } from "@/components/MemberSignupForm";

export function RegisterSection() {
  return (
    <section className="clubSection registerSection" id="register">
      <div className="sectionIntro">
        <p className="eyebrowDark">Đăng ký</p>
        <h2>Đăng ký tài khoản thành viên</h2>
        <p>
          Mọi fan đều có thể tạo tài khoản thành viên để tham gia cộng đồng JISOO Vietnam Fanclub, lưu thông tin fan và
          sẵn sàng dùng cho các tính năng bình luận, like, blog và sự kiện sau này.
        </p>
      </div>
      <MemberSignupForm />
    </section>
  );
}
