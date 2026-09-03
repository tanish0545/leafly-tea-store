import SEO from "../components/SEO";
import Footer from "../components/Footer";
import { generateOrganizationSchema, generateWebSiteSchema } from "../lib/seoData";

import Hero from "../sections/Hero";
import BrandValues from "../sections/BrandValues";
import FeaturedTeaCollections from "../sections/FeaturedTeaCollections";
import Gifting from "../sections/Gifting";
import TeaRitual from "../sections/TeaRitual";

export default function Home() {
  const homeSchemas = [
    generateOrganizationSchema(),
    generateWebSiteSchema(),
  ];

  return (
    <div className="leafly-app">
      <SEO
        title="Leafly — Premium Single-Origin Indian Teas & Brewing Rituals"
        description="Discover rare single-origin Darjeeling, Assam, and Himalayan loose leaf green teas, black teas, white teas, and oolongs. Experience mindful brewing rituals and bespoke tea gifting."
        canonicalPath="/"
        schema={homeSchemas}
      />
      <main>

        <Hero />

        <BrandValues />

        <FeaturedTeaCollections />

        <Gifting />

        <TeaRitual />

      </main>

      <Footer />

    </div>
  );
}