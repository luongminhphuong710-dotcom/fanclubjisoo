import type { MusicRankingTrack } from "@/lib/musicRankings";

type MusicRankingsSectionProps = {
  tracks: MusicRankingTrack[];
};

export function MusicRankingsSection({ tracks }: MusicRankingsSectionProps) {
  return (
    <div className="panel" id="rankings">
      <div className="panelHeader">
        <h2>Bảng xếp hạng bài hát JISOO</h2>
        <span>Deezer + Apple Music</span>
      </div>
      <p className="sectionHint">
        Xếp hạng theo chỉ số popularity/rank live từ Deezer. Bấm vào bài hát hoặc nút nền tảng để mở ở tab mới.
      </p>

      <div className="musicRankList">
        {tracks.map((track) => (
          <article className="musicRankCard" key={track.id}>
            <a className="musicRankMain" href={track.primaryUrl} target="_blank" rel="noreferrer">
              <span className="rank">#{track.rank}</span>
              {track.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.coverUrl} alt="" />
              ) : (
                <div className="coverFallback" />
              )}
              <div className="trackInfo">
                <h3>{track.title}</h3>
                <p>
                  {track.artistName} · {track.albumName} · {track.durationText}
                </p>
              </div>
              <strong>{track.score.toLocaleString("vi-VN")}</strong>
            </a>

            <div className="platformLinks" aria-label={`Mở ${track.title} trên nền tảng âm nhạc`}>
              {track.links.map((link) => (
                <a href={link.url} key={link.label} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          </article>
        ))}
        {tracks.length === 0 ? (
          <p className="empty">Chưa lấy được dữ liệu xếp hạng nhạc JISOO. Hãy thử refresh lại sau.</p>
        ) : null}
      </div>
    </div>
  );
}
