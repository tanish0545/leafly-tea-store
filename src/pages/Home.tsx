import { Helmet } from "react-helmet-async";
import Footer from "../components/Footer";

import Hero from "../sections/Hero";
import BrandValues from "../sections/BrandValues";
import FeaturedTeaCollections from "../sections/FeaturedTeaCollections";
import Gifting from "../sections/Gifting";
import TeaRitual from "../sections/TeaRitual";

export default function Home() {
  return (
    <div className="leafly-app">
      <Helmet>
        <title>Premium Green Tea & Artisan Blends | Leafly</title>
        <meta name="description" content="Discover India's finest single-origin green teas, white teas, and artisan blends. Shop fresh, organic, and expertly curated teas." />
      </Helmet>
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