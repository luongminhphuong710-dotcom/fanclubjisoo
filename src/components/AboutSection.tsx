export function AboutSection() {
  return (
    <section className="contentSection" id="about">
      <div className="sectionIntro">
        <p className="eyebrowDark">Giới thiệu chung</p>
        <h2>Về JISOO Fanclub</h2>
        <p>
          JISOO Fanclub là trang cộng đồng dành cho người hâm mộ ca sĩ JISOO, tập trung vào tin tức, bảng xếp hạng âm
          nhạc, thư viện nội dung và hoạt động fan.
        </p>
      </div>
      <div className="aboutGrid">
        <div>
          <strong>Cập nhật tự động</strong>
          <p>Lấy tin #JISOO và bảng xếp hạng nhạc từ các nguồn public/API.</p>
        </div>
        <div>
          <strong>Cộng đồng fan</strong>
          <p>Mở rộng thành diễn đàn, bình luận, like và phân quyền fan/mod/admin.</p>
        </div>
        <div>
          <strong>Media & Movie</strong>
          <p>Sẵn sàng kết nối album ảnh, video, trailer và các chuyên mục điện ảnh.</p>
        </div>
      </div>
    </section>
  );
}
