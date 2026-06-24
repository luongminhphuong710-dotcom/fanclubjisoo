import { HeroBanner } from "@/components/HeroBanner";
import { MusicRankingsSection } from "@/components/MusicRankingsSection";
import { SiteToolbar } from "@/components/SiteToolbar";
import { getMusicRankings } from "@/lib/musicRankings";

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const musicRankings = await getMusicRankings({ limit: 12 }).catch(() => []);
  const updatedAt = new Date().toISOString();

  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner
        compact
        eyebrow="Bảng xếp hạng"
        title="Bảng xếp hạng bài hát JISOO"
        text="Theo dõi các ca khúc JISOO trên Deezer, Apple Music, Spotify và YouTube Music."
      />
      <section className="singleColumn">
        <MusicRankingsSection limit={12} tracks={musicRankings} updatedAt={updatedAt} />
      </section>
    </main>
  );
}
