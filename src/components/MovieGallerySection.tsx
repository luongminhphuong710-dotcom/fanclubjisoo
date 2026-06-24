import { jisooMovies } from "@/lib/jisooMovies";

export function MovieGallerySection() {
  return (
    <section className="contentSection" id="movie">
      <div className="sectionIntro">
        <p className="eyebrowDark">Movie</p>
        <h2>Phim và series JISOO tham gia</h2>
        <p>Thư viện các phim, series và vai cameo của JISOO. Bấm vào poster để mở trang phim uy tín ở tab mới.</p>
      </div>
      <div className="movieGrid">
        {jisooMovies.map((movie) => (
          <a className="movieCard" href={movie.href} key={`${movie.title}-${movie.year}`} target="_blank" rel="noreferrer">
            <div className="moviePoster">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={movie.posterUrl} alt="" />
            </div>
            <div className="movieMeta">
              <span>
                {movie.type} · {movie.year}
              </span>
              <h3>{movie.title}</h3>
              <p className="movieRole">{movie.role}</p>
              <p>{movie.note}</p>
              <strong>Mở trên {movie.sourceLabel}</strong>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
