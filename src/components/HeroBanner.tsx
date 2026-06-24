type HeroBannerProps = {
  compact?: boolean;
  eyebrow?: string;
  title?: string;
  text?: string;
};

export function HeroBanner({
  compact = false,
  eyebrow = "Fanclub của ca sĩ JISOO",
  title = "JISOO Fanclub",
  text = "Tin tức #JISOO, bảng xếp hạng âm nhạc, phim ảnh, khoảnh khắc sân khấu và cộng đồng fan được cập nhật mỗi ngày."
}: HeroBannerProps) {
  return (
    <section className={compact ? "hero heroCompact" : "hero"}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="heroText">{text}</p>
      </div>
    </section>
  );
}
