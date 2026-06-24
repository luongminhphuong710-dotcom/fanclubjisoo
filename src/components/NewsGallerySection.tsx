import type { NewsData } from "@/lib/pageData";

export function NewsGallerySection({ news, databaseReady, newsMode }: NewsData) {
  const isLiveRss = newsMode === "live-rss-fallback";

  return (
    <div className="panel" id="news">
      <div className="panelHeader">
        <h2>Tin mới #JISOO</h2>
        <span>{isLiveRss ? "Đang lọc RSS" : `${news.length} bài`}</span>
      </div>
      {!databaseReady ? (
        <p className="sectionHint">Tin tức đang chạy ở chế độ RSS live vì chưa kết nối PostgreSQL.</p>
      ) : null}
      <div className="newsList">
        {news.map((article) => (
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
            </div>
          </a>
        ))}
        {news.length === 0 ? <p className="empty">Chưa có tin nào khớp với hashtag #JISOO.</p> : null}
      </div>
    </div>
  );
}
