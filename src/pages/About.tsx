import "./About.css";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateOrganizationSchema, generateBreadcrumbSchema } from "../lib/seoData";
import mainImage from "../assets/main.webp";
import image2 from "../assets/image2.webp";
import image3 from "../assets/image3.webp";
import image4 from "../assets/image4.webp";
import image5 from "../assets/image5.webp";
import ad1 from "../assets/ad1.mp4";
import ad2 from "../assets/ad2.mp4";
import ad3 from "../assets/ad3.mp4";
import ad4 from "../assets/ad4.mp4";

const values = [
  {
    number: "01",
    title: "Thoughtful sourcing",
    text: "We work with tea growers who care about quality, biodiversity, and growing methods that preserve character in every leaf.",
  },
  {
    number: "02",
    title: "Freshly packed",
    text: "Every batch is selected for aroma, texture, and clarity so you taste the tea the way it was meant to be enjoyed.",
  },
  {
    number: "03",
    title: "Built for ritual",
    text: "We create tea experiences that slow people down and invite a more intentional routine at home or in the studio.",
  },
];

const COMMUNITY_VIDEOS = [
  {
    id: "vid-1",
    title: "Morning Ritual",
    videoSrc: ad1,
    poster: image2,
    tag: "Morning Brew",
    description: "Experience whole leaf aroma awakening the morning calm.",
  },
  {
    id: "vid-2",
    title: "Whole Leaf Craft",
    videoSrc: ad2,
    poster: image3,
    tag: "Craft & Terroir",
    description: "Carefully sourced leaves steeped with patience and precision.",
  },
  {
    id: "vid-3",
    title: "Evening Calm",
    videoSrc: ad3,
    poster: image4,
    tag: "Evening Pause",
    description: "A restorative pause to slow down and savor the moment.",
  },
  {
    id: "vid-4",
    title: "Artisan Tea Selection",
    videoSrc: ad4,
    poster: image5,
    tag: "Single Estate",
    description: "Pure origin teas celebrating tradition and artisanal craft.",
  },
];

export default function About() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "About", url: "/about" },
  ];

  return (
    <main className="about-page">
      <SEO
        title="About Leafly — Single-Origin Indian Teas & Ethical Craft | Leafly"
        description="Learn about Leafly's mission to curate exceptional loose leaf teas from India's finest estates in Darjeeling, Assam, and the Himalayas with ethical craft and slow rituals."
        canonicalPath="/about"
        schema={[generateOrganizationSchema(), generateBreadcrumbSchema(breadcrumbs)]}
      />
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="about-eyebrow">OUR STORY</p>
          <h1>
            Tea with a sense of
            <span> place, craft, and calm.</span>
          </h1>
          <p className="about-hero-text">
            Leafly began with a simple question: what if tea felt as considered as the people who drink it? We set out to bring a slower, more grounded perspective to everyday rituals.
          </p>
        </div>

        <div className="about-hero-visual">
          <img src={mainImage} alt="Tea leaves and a teacup in a bright studio setting" loading="eager" fetchPriority="high" />
          <div className="about-badge">
            <span>EST. 2024</span>
            <strong>Slow tea, beautifully made.</strong>
          </div>
        </div>
      </section>

      <section className="about-story">
        <div className="about-story-header">
          <p className="about-eyebrow">WHY WE EXIST</p>
          <h2>We believe tea should feel personal, not rushed.</h2>
        </div>

        <div className="about-story-grid">
          <div className="about-story-copy">
            <p>
              In a world that moves quickly, tea remains one of the few rituals that asks us to pause. We wanted to make that pause feel generous — rooted in quality and shaped by intention.
            </p>
            <p>
              From the earliest blends we sourced to the way we package and present them, every decision at Leafly is guided by one idea: exceptional tea should be easy to understand and deeply rewarding to enjoy.
            </p>
          </div>

          <div className="about-story-cards">
            <div className="mini-card">
              <span>Whole leaf</span>
              <strong>Carefully selected</strong>
            </div>
            <div className="mini-card muted">
              <span>Single origin</span>
              <strong>Harvested with purpose</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="about-gallery">
        <div className="about-gallery-row">
          <img src={image2} alt="Close-up tea leaves in a jar" loading="lazy" />
          <img src={image3} alt="Tea preparation and pouring ritual" loading="lazy" />
        </div>
        <div className="about-gallery-feature">
          <img src={image4} alt="Premium tea packaging and accessories" loading="lazy" />
        </div>
      </section>

      <section className="about-values">
        <div className="about-values-header">
          <p className="about-eyebrow">OUR APPROACH</p>
          <h2>Crafted to be simple, considered, and alive.</h2>
        </div>

        <div className="about-values-grid">
          {values.map((value) => (
            <article key={value.number} className="about-value-card">
              <span>{value.number}</span>
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-ritual">
        <div className="about-ritual-image">
          <img src={image5} alt="Tea ritual with a warm cup and natural elements" loading="lazy" />
        </div>

        <div className="about-ritual-copy">
          <p className="about-eyebrow">THE RITUAL</p>
          <h2>Every cup is a small invitation to slow down.</h2>
          <p>
            We design our tea around atmosphere as much as flavor. The notes should feel bright and clear, the aroma should linger, and the moment should reward presence.
          </p>
          <p>
            Leafly is a home for people who want their routine to feel a little more joyful, a little more intentional, and a little more rooted in the natural world.
          </p>
        </div>
      </section>

      {/* =========================================================
          VIDEO SECTION
          ========================================================= */}
      <section className="about-video-reviews" aria-label="Leafly Tea Videos">
        <div className="about-section-head">
          <p className="about-eyebrow">COMMUNITY MOMENTS</p>
          <h2>Rituals in Motion</h2>
          <p className="about-section-sub">
            Watch how our community brews, pauses, and finds calm with Leafly in their daily life.
          </p>
        </div>

        <div className="about-video-grid">
          {COMMUNITY_VIDEOS.map((item) => (
            <article key={item.id} className="about-video-card">
              <div className="about-video-poster-wrap">
                <video
                  src={item.videoSrc}
                  poster={item.poster}
                  controls
                  preload="none"
                  playsInline
                  className="about-video-element"
                  aria-label={item.title}
                />
              </div>

              <div className="about-video-info">
                <div className="about-video-creator">
                  <strong>{item.title}</strong>
                  <span>{item.tag}</span>
                </div>
                <p className="about-video-caption">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
