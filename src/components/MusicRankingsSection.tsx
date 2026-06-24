"use client";

import { useEffect, useMemo, useState } from "react";
import type { MusicRankingTrack } from "@/lib/musicRankings";

type RankingsApiResponse = {
  data: MusicRankingTrack[];
  updatedAt: string;
};

type MusicRankingsSectionProps = {
  tracks: MusicRankingTrack[];
  updatedAt?: string;
  limit?: number;
  pollMs?: number;
};

function formatClock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "đang cập nhật";
  }

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit"
  });
}

export function MusicRankingsSection({
  tracks,
  updatedAt = new Date().toISOString(),
  limit,
  pollMs = 60_000
}: MusicRankingsSectionProps) {
  const [items, setItems] = useState(tracks);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(updatedAt);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestLimit = useMemo(() => limit ?? Math.max(tracks.length, 8), [limit, tracks.length]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function refresh() {
      setIsRefreshing(true);
      try {
        const response = await fetch(`/api/music-rankings?limit=${requestLimit}`, {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as RankingsApiResponse;
        if (!active) {
          return;
        }

        setItems(payload.data);
        setLastUpdatedAt(payload.updatedAt);
      } catch {
        // Keep the previous ranking snapshot if a live refresh fails.
      } finally {
        if (active) {
          setIsRefreshing(false);
        }
      }
    }

    const timer = window.setInterval(refresh, pollMs);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [pollMs, requestLimit]);

  return (
    <div className="panel" id="rankings">
      <div className="panelHeader">
        <h2>Bảng xếp hạng bài hát JISOO</h2>
        <span>Deezer + Apple Music</span>
      </div>
      <p className="updateMeta">
        <span className={isRefreshing ? "liveDot refreshing" : "liveDot"} />
        Cập nhật lúc {formatClock(lastUpdatedAt)}
      </p>
      <p className="sectionHint">
        Xếp hạng theo chỉ số popularity/rank live từ Deezer. Bấm vào bài hát hoặc nút nền tảng để mở ở tab mới.
      </p>

      <div className="musicRankList">
        {items.map((track) => (
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
        {items.length === 0 ? (
          <p className="empty">Chưa lấy được dữ liệu xếp hạng nhạc JISOO. Hãy thử refresh lại sau.</p>
        ) : null}
      </div>
    </div>
  );
}
