type DeezerSearchResponse = {
  data?: DeezerTrack[];
};

type DeezerTrack = {
  id: number;
  title: string;
  link: string;
  rank: number;
  duration: number;
  preview?: string;
  artist: {
    name: string;
  };
  album: {
    title: string;
    cover_medium?: string;
    cover_big?: string;
    cover_xl?: string;
  };
};

type ItunesSearchResponse = {
  results?: ItunesTrack[];
};

type ItunesTrack = {
  artistName: string;
  trackName: string;
  trackViewUrl: string;
  artworkUrl100?: string;
};

export type PlatformLink = {
  label: string;
  url: string;
  exact: boolean;
};

export type MusicRankingTrack = {
  id: string;
  rank: number;
  title: string;
  artistName: string;
  albumName: string;
  coverUrl: string | null;
  score: number;
  durationText: string;
  primaryUrl: string;
  platform: string;
  links: PlatformLink[];
};

function normalizeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function musicSearchUrl(platform: "spotify" | "youtube", title: string): string {
  const query = encodeURIComponent(`JISOO ${title}`);

  if (platform === "spotify") {
    return `https://open.spotify.com/search/${query}`;
  }

  return `https://music.youtube.com/search?q=${query}`;
}

function durationText(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

async function getDeezerTracks(limit: number): Promise<DeezerTrack[]> {
  const url = new URL("https://api.deezer.com/search/track");
  url.searchParams.set("q", 'artist:"JISOO"');
  url.searchParams.set("limit", String(Math.max(limit * 2, 12)));

  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) {
    throw new Error(`Deezer ranking request failed: ${response.status}`);
  }

  const payload = (await response.json()) as DeezerSearchResponse;

  return (payload.data ?? [])
    .filter((track) => track.artist.name.toUpperCase().includes("JISOO"))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);
}

async function getAppleTracks(): Promise<Map<string, ItunesTrack>> {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", "JISOO");
  url.searchParams.set("entity", "song");
  url.searchParams.set("country", "VN");
  url.searchParams.set("limit", "30");

  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) {
    return new Map();
  }

  const payload = (await response.json()) as ItunesSearchResponse;
  const tracks = (payload.results ?? []).filter((track) => track.artistName.toUpperCase().includes("JISOO"));

  return new Map(tracks.map((track) => [normalizeTitle(track.trackName), track]));
}

export async function getMusicRankings(options: { limit?: number } = {}): Promise<MusicRankingTrack[]> {
  const limit = Math.min(options.limit ?? 8, 20);
  const [deezerTracks, appleTracks] = await Promise.all([getDeezerTracks(limit), getAppleTracks()]);

  return deezerTracks.map((track, index) => {
    const appleTrack = appleTracks.get(normalizeTitle(track.title));
    const coverUrl = track.album.cover_xl ?? track.album.cover_big ?? track.album.cover_medium ?? appleTrack?.artworkUrl100 ?? null;

    return {
      id: `deezer-${track.id}`,
      rank: index + 1,
      title: track.title,
      artistName: track.artist.name,
      albumName: track.album.title,
      coverUrl,
      score: track.rank,
      durationText: durationText(track.duration),
      primaryUrl: track.link,
      platform: "Deezer",
      links: [
        { label: "Deezer", url: track.link, exact: true },
        ...(appleTrack ? [{ label: "Apple Music", url: appleTrack.trackViewUrl, exact: true }] : []),
        { label: "Spotify", url: musicSearchUrl("spotify", track.title), exact: false },
        { label: "YouTube Music", url: musicSearchUrl("youtube", track.title), exact: false }
      ]
    };
  });
}
