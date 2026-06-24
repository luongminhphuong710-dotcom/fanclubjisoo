import { HeroBanner } from "@/components/HeroBanner";
import { NewsGallerySection } from "@/components/NewsGallerySection";
import { SiteToolbar } from "@/components/SiteToolbar";
import { getNewsData } from "@/lib/pageData";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const newsData = await getNewsData(12);

  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner
        compact
        eyebrow="Tin mới"
        title="Tin mới #JISOO"
        text="Tin tức mới nhất về JISOO được lọc theo hashtag và từ khóa liên quan."
      />
      <section className="singleColumn">
        <NewsGallerySection {...newsData} />
      </section>
    </main>
  );
}
