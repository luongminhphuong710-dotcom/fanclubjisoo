"use client";

import { useEffect, useMemo, useState } from "react";
import type { NewsCardData, NewsData } from "@/lib/pageData";

type NewsApiResponse = {
  data: NewsCardData[];
  databaseReady: boolean;
  mode: NewsData["newsMode"];
  updatedAt: string;
};

type NewsGallerySectionProps = NewsData & {
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

function relativeTime(value: string | null, nowMs: number): string {
  if (!value) {
    return "chưa rõ thời gian";
  }

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return "chưa rõ thời gian";
  }

  const diffSeconds = Math.max(0, Math.floor((nowMs - time) / 1000));
  if (diffSeconds < 60) {
    return `${Math.max(diffSeconds, 1)} giây trước`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

export function NewsGallerySection({
  news,
  databaseReady,
  newsMode,
  updatedAt,
  limit,
  pollMs = 60_000
}: NewsGallerySectionProps) {
  const [items, setItems] = useState(news);
  const [ready, setReady] = useState(databaseReady);
  const [mode, setMode] = useState(newsMode);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(updatedAt);
  const [nowMs, setNowMs] = useState(() => new Date(updatedAt).getTime() || Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLiveRss = mode === "live-rss-fallback";
  const requestLimit = useMemo(() => limit ?? Math.max(news.length, 6), [limit, news.length]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function refresh() {
      setIsRefreshing(true);
      try {
        const response = await fetch(`/api/news?hashtag=JISOO&limit=${requestLimit}`, {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as NewsApiResponse;
        if (!active) {
          return;
        }

        setItems(payload.data);
        setReady(payload.databaseReady);
        setMode(payload.mode);
        setLastUpdatedAt(payload.updatedAt);
        setNowMs(Date.now());
      } catch {
        // Keep the previous data if a live refresh fails.
      } finally {
        if (active) {
          setIsRefreshing(false);
        }
      }
    }

    const refreshTimer = window.setInterval(refresh, pollMs);
    const clockTimer = window.setInterval(() => setNowMs(Date.now()), 60_000);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, [pollMs, requestLimit]);

  return (
    <div className="panel" id="news">
      <div className="panelHeader">
        <h2>Tin mới #JISOO</h2>
        <span>{isLiveRss ? "Đang lọc RSS" : `${items.length} bài`}</span>
      </div>
      <p className="updateMeta">
        <span className={isRefreshing ? "liveDot refreshing" : "liveDot"} />
        Cập nhật lúc {formatClock(lastUpdatedAt)}
      </p>
      {!ready ? (
        <p className="sectionHint">Tin tức đang chạy ở chế độ RSS live vì chưa kết nối PostgreSQL.</p>
      ) : null}
      <div className="newsList">
        {items.map((article) => (
          <a className="newsItem" href={article.url} key={article.id} target="_blank" rel="noreferrer">
            <div className="newsThumb">
              {article.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={article.imageUrl} alt="" />
              ) : (
                <div className="newsThumbFallback" />
              )}
            </div>
            <div className="newsBody">
              <h3>{article.title}</h3>
              <p>{article.source?.name ?? "Nguồn tin"}</p>
              <time dateTime={article.publishedAt ?? undefined}>{relativeTime(article.publishedAt, nowMs)}</time>
            </div>
          </a>
        ))}
        {items.length === 0 ? <p className="empty">Chưa có tin nào khớp với hashtag #JISOO.</p> : null}
      </div>
    </div>
  );
}
