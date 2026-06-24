type HeroBannerProps = {
  compact?: boolean;
  eyebrow?: string;
  title?: string;
  text?: string;
};

export function HeroBanner({
  compact = false,
  eyebrow = "Fanclub của ca sĩ JISOO",
  title = "JISOO Vietnam Fanclub",
  text = "Tin tức #JISOO, bảng xếp hạng âm nhạc, phim ảnh, khoảnh khắc sân khấu và cộng đồng fan được cập nhật mỗi ngày."
}: HeroBannerProps) {
  return (
    <section className={compact ? "hero heroCompact" : "hero"} aria-label={title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="heroCover" src="/images/jisoo-vietnam-fanclub-cover.png" alt="" />
      {compact ? (
        <div className="heroContent">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="heroText">{text}</p>
        </div>
      ) : (
        <h1 className="srOnly">{title}</h1>
      )}
    </section>
  );
}
