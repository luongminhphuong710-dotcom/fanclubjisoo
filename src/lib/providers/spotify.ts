type SpotifyImage = {
  url: string;
  height: number | null;
  width: number | null;
};

export type SpotifyTopTrack = {
  id: string;
  name: string;
  popularity: number;
  album: {
    name: string;
    release_date: string;
    images: SpotifyImage[];
  };
  artists: Array<{ name: string }>;
  external_urls: {
    spotify?: string;
  };
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getSpotifyAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${credentials}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ grant_type: "client_credentials" })
  });

  if (!response.ok) {
    throw new Error(`Spotify token request failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  };

  return cachedToken.accessToken;
}

export async function getArtistTopTracks(
  artistId: string,
  market = process.env.SPOTIFY_MARKET ?? "US"
): Promise<SpotifyTopTrack[]> {
  const accessToken = await getSpotifyAccessToken();
  const url = new URL(`https://api.spotify.com/v1/artists/${artistId}/top-tracks`);
  url.searchParams.set("market", market);

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`Spotify top tracks request failed: ${response.status}`);
  }

  const data = (await response.json()) as { tracks?: SpotifyTopTrack[] };
  return data.tracks ?? [];
}
