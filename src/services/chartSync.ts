import { Prisma, Provider } from "@prisma/client";
import { db } from "@/lib/db";
import { toJsonValue } from "@/lib/http";
import { getArtistTopTracks, type SpotifyTopTrack } from "@/lib/providers/spotify";
import { getYouTubeVideoStatistics, type YouTubeVideoStat } from "@/lib/providers/youtube";

type SyncError = {
  provider: Provider;
  idolId: string;
  message: string;
};

function parseReleaseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date =
    value.length === 4
      ? new Date(`${value}-01-01T00:00:00.000Z`)
      : value.length === 7
        ? new Date(`${value}-01T00:00:00.000Z`)
        : new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function spotifyTrackData(idolId: string, track: SpotifyTopTrack): Prisma.TrackUncheckedCreateInput {
  const cover = track.album.images[0]?.url ?? null;

  return {
    idolId,
    spotifyId: track.id,
    title: track.name,
    artistName: track.artists.map((artist) => artist.name).join(", "),
    albumName: track.album.name,
    coverUrl: cover,
    releaseDate: parseReleaseDate(track.album.release_date),
    providerUrl: track.external_urls.spotify ?? null
  };
}

async function syncSpotifyForIdol(idol: { id: string; spotifyArtistId: string | null }, market: string) {
  if (!idol.spotifyArtistId) {
    return 0;
  }

  const topTracks = await getArtistTopTracks(idol.spotifyArtistId, market);
  const snapshot = await db.chartSnapshot.create({
    data: {
      provider: Provider.SPOTIFY,
      idolId: idol.id,
      market,
      sourceUrl: `https://open.spotify.com/artist/${idol.spotifyArtistId}`
    }
  });

  const entries: Prisma.ChartEntryCreateManyInput[] = [];

  for (const [index, track] of topTracks.entries()) {
    const savedTrack = await db.track.upsert({
      where: { spotifyId: track.id },
      update: spotifyTrackData(idol.id, track),
      create: spotifyTrackData(idol.id, track)
    });

    entries.push({
      snapshotId: snapshot.id,
      trackId: savedTrack.id,
      provider: Provider.SPOTIFY,
      providerItemId: track.id,
      title: track.name,
      artistName: track.artists.map((artist) => artist.name).join(", "),
      rank: index + 1,
      metricName: "spotify_popularity",
      metricValue: BigInt(track.popularity),
      metricText: String(track.popularity),
      raw: toJsonValue(track) as Prisma.InputJsonValue
    });
  }

  if (entries.length > 0) {
    await db.chartEntry.createMany({ data: entries, skipDuplicates: true });
  }

  return entries.length;
}

function compareVideoViews(a: YouTubeVideoStat, b: YouTubeVideoStat): number {
  if (a.viewCount === b.viewCount) {
    return 0;
  }

  return a.viewCount > b.viewCount ? -1 : 1;
}

async function syncYouTubeForIdol(idol: { id: string }) {
  const trackedVideos = await db.track.findMany({
    where: {
      idolId: idol.id,
      youtubeVideoId: { not: null }
    },
    select: {
      id: true,
      youtubeVideoId: true
    }
  });

  const videoIds = trackedVideos.map((track) => track.youtubeVideoId).filter(Boolean) as string[];
  if (videoIds.length === 0) {
    return 0;
  }

  const stats = (await getYouTubeVideoStatistics(videoIds)).sort(compareVideoViews);
  const trackByVideoId = new Map(trackedVideos.map((track) => [track.youtubeVideoId, track]));
  const snapshot = await db.chartSnapshot.create({
    data: {
      provider: Provider.YOUTUBE,
      idolId: idol.id,
      sourceUrl: "https://www.youtube.com/"
    }
  });

  const entries = stats.map((video, index): Prisma.ChartEntryCreateManyInput => {
    const track = trackByVideoId.get(video.id);

    return {
      snapshotId: snapshot.id,
      trackId: track?.id,
      provider: Provider.YOUTUBE,
      providerItemId: video.id,
      title: video.title,
      artistName: video.channelTitle,
      rank: index + 1,
      metricName: "youtube_view_count",
      metricValue: video.viewCount,
      metricText: video.viewCount.toString(),
      raw: toJsonValue({
        ...video,
        viewCount: video.viewCount.toString(),
        likeCount: video.likeCount?.toString() ?? null,
        commentCount: video.commentCount?.toString() ?? null
      }) as Prisma.InputJsonValue
    };
  });

  if (entries.length > 0) {
    await db.chartEntry.createMany({ data: entries, skipDuplicates: true });
  }

  return entries.length;
}

export async function syncAllCharts(options: { market?: string } = {}) {
  const market = options.market ?? process.env.SPOTIFY_MARKET ?? "US";
  const idols = await db.idol.findMany({
    where: { active: true },
    select: { id: true, spotifyArtistId: true }
  });
  const errors: SyncError[] = [];
  let spotifyEntries = 0;
  let youtubeEntries = 0;

  for (const idol of idols) {
    try {
      spotifyEntries += await syncSpotifyForIdol(idol, market);
    } catch (error) {
      errors.push({
        provider: Provider.SPOTIFY,
        idolId: idol.id,
        message: error instanceof Error ? error.message : "Unknown Spotify sync error"
      });
    }

    try {
      youtubeEntries += await syncYouTubeForIdol(idol);
    } catch (error) {
      errors.push({
        provider: Provider.YOUTUBE,
        idolId: idol.id,
        message: error instanceof Error ? error.message : "Unknown YouTube sync error"
      });
    }
  }

  return {
    market,
    idols: idols.length,
    spotifyEntries,
    youtubeEntries,
    errors,
    syncedAt: new Date().toISOString()
  };
}
