/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateArticleSchema, generateBreadcrumbSchema } from "../lib/seoData";
import "./Journal.css";

import teaTastingImage from "../assets/tea-tasting-journal.webp";
import quietImage from "../assets/The-quite.webp";
import morningImage from "../assets/The-morning.webp";
import eveningImage from "../assets/The-evening.webp";
import brokenLeafImage from "../assets/Broken-leaf.webp";
import assamImage from "../assets/Inside-assam.webp";
import fiveSmallImage from "../assets/Five-small.webp";
import caseImage from "../assets/The-case.webp";

export type Story = {
  id: number;
  category: string;
  title: string;
  description: string;
  readTime: string;
  image: string;
  content: string[];
};

function getStorySlug(story: { id: number; title: string }): string {
  return story.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const stories: Story[] = [
  {
    id: 1,
    category: "BREWING",
    title: "The Quiet Art of Brewing Green Tea",
    description:
      "A simple guide to temperature, timing and the little details that make green tea shine.",
    readTime: "4 MIN READ",
    image: quietImage,
    content: [
      "Green tea rewards patience. The goal is not to extract everything from the leaf, but to reveal the qualities that make each tea distinctive.",
      "Start with water that is comfortably below boiling. For most green teas, a gentler temperature helps preserve delicate aromas and prevents excessive bitterness.",
      "Watch the colour, smell the steam and taste slowly. A well-brewed green tea should feel balanced rather than aggressive.",
    ],
  },
  {
    id: 2,
    category: "ORIGINS",
    title: "A Morning in the Darjeeling Hills",
    description:
      "Why altitude, mist and soil give Darjeeling tea its unmistakable character.",
    readTime: "7 MIN READ",
    image: morningImage,
    content: [
      "Darjeeling is shaped by altitude, cool mountain air and changing weather. These conditions give its teas a character that can be surprisingly bright and delicate.",
      "The same landscape can produce notes ranging from floral and fruity to muscatel and lightly woody.",
      "Understanding the place behind the cup changes the way you taste it. Origin is not just a label; it is part of the flavour.",
    ],
  },
  {
    id: 3,
    category: "RITUAL",
    title: "Why Your Evening Cup Matters",
    description:
      "Tea can be more than a drink. Sometimes the ritual is the point.",
    readTime: "5 MIN READ",
    image: eveningImage,
    content: [
      "An evening cup creates a small boundary between the pace of the day and the quiet that follows.",
      "The ritual can be simple: warm the cup, measure the leaves, pour the water and give yourself a few uninterrupted minutes.",
      "Good tea does not demand your attention. It gives you permission to slow down.",
    ],
  },
  {
    id: 4,
    category: "TEA KNOWLEDGE",
    title: "Whole Leaf vs. Broken Leaf Tea",
    description:
      "What changes when the leaf stays intact, and why it can matter in your cup.",
    readTime: "5 MIN READ",
    image: brokenLeafImage,
    content: [
      "Leaf size affects how quickly water interacts with the tea. Larger leaves generally release their character more gradually.",
      "Broken leaves expose more surface area and can extract more quickly, which is useful in some styles of tea.",
      "Neither approach is automatically better. The important thing is matching the leaf style to the tea and the way you want to brew it.",
    ],
  },
  {
    id: 5,
    category: "ORIGINS",
    title: "Inside Assam's Tea Country",
    description:
      "Discover the warm, bold character behind one of India's most recognisable tea regions.",
    readTime: "6 MIN READ",
    image: assamImage,
    content: [
      "Assam's warm, humid climate creates ideal conditions for producing teas with depth and strength.",
      "The region is particularly known for rich black teas with malty, rounded character.",
      "When tasting Assam tea, look for body first, then notice the sweetness and subtle spice that develop as the cup cools.",
    ],
  },
  {
    id: 6,
    category: "BREWING",
    title: "Five Small Changes to a Better Cup",
    description:
      "You don't need complicated equipment. Start with better water, timing and attention.",
    readTime: "4 MIN READ",
    image: fiveSmallImage,
    content: [
      "Use fresh water whenever possible. Water quality can influence the final cup more than many people expect.",
      "Measure your leaves rather than guessing. Small changes in quantity can dramatically alter strength.",
      "Pay attention to temperature and steeping time. These two variables are among the easiest ways to improve consistency.",
      "Warm your teaware before brewing and give the leaves enough room to open.",
      "Most importantly, taste your tea while it is still changing. The first sip and the final sip can tell very different stories.",
    ],
  },
  {
    id: 7,
    category: "RITUAL",
    title: "The Case for Slowing Down",
    description:
      "A cup of tea gives us a wonderfully simple reason to stop doing everything else.",
    readTime: "5 MIN READ",
    image: caseImage,
    content: [
      "Tea has always had a relationship with time. Leaves need time to grow, time to process and time to release their flavour.",
      "The same principle applies to the person drinking it.",
      "Put the phone down, let the kettle finish and give the cup your full attention. A few quiet minutes can change the entire experience.",
    ],
  },
];

export default function Journal() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const storyFromSlug = slug
    ? stories.find((s) => getStorySlug(s) === slug || String(s.id) === slug) || null
    : null;

  const [loading, setLoading] = useState(() => !storyFromSlug);
  const [selectedStory, setSelectedStory] = useState<Story | null>(storyFromSlug);

  useEffect(() => {
    if (slug) {
      const match = stories.find((s) => getStorySlug(s) === slug || String(s.id) === slug);
      if (match) {
        setSelectedStory(match);
        setLoading(false);
      }
    }
  }, [slug]);

  const handleCloseStory = useCallback(() => {
    setSelectedStory(null);
    if (slug) {
      navigate("/journal");
    }
  }, [slug, navigate]);

  const handleOpenStory = (story: Story) => {
    setSelectedStory(story);
    navigate(`/journal/${getStorySlug(story)}`);
  };

  useEffect(() => {
    // Respect prefers-reduced-motion or if already navigated directly to a story
    if (storyFromSlug) {
      setLoading(false);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(false);
    }, 3600);

    return () => window.clearTimeout(timer);
  }, [storyFromSlug]);

  useEffect(() => {
    if (!selectedStory) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseStory();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedStory, handleCloseStory]);

  const pageTitle = selectedStory
    ? `${selectedStory.title} | Leafly Journal`
    : "The Leafly Journal — Tea Stories, Origins & Brewing Guides | Leafly";

  const pageDescription = selectedStory
    ? selectedStory.description
    : "Read thoughtful guides to loose leaf tea brewing, mountain terroirs of Darjeeling and Assam, whole leaf craft, and mindful daily tea rituals.";

  const canonicalPath = selectedStory
    ? `/journal/${getStorySlug(selectedStory)}`
    : "/journal";

  const breadcrumbs = selectedStory
    ? [
        { name: "Home", url: "/" },
        { name: "Journal", url: "/journal" },
        { name: selectedStory.title, url: canonicalPath },
      ]
    : [
        { name: "Home", url: "/" },
        { name: "Journal", url: "/journal" },
      ];

  const schemas: Record<string, unknown>[] = [
    generateBreadcrumbSchema(breadcrumbs),
  ];

  if (selectedStory) {
    schemas.push(
      generateArticleSchema(
        {
          title: selectedStory.title,
          description: selectedStory.description,
          image: selectedStory.image,
          category: selectedStory.category,
        },
        canonicalPath
      )
    );
  }

  return (
    <main className={`journal-page ${loading ? "journal-loading" : "journal-ready"}`}>
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonicalPath={canonicalPath}
        image={selectedStory?.image}
        type={selectedStory ? "article" : "website"}
        schema={schemas}
      />
      {/* =====================================================
          JOURNAL INTRO SEQUENCE LOADER (3.5s CINEMATIC STORY)
          Water -> Falling Leaf -> Ripple -> Book Appears -> Book Opens
          ===================================================== */}

      {loading && (
        <div className="journal-loader" aria-label="Opening the Leafly journal">
          {/* Phase 1, 2 & 3: Water Surface, Falling Botanical Tea Leaf & Expanding Ripples */}
          <div className="journal-water-scene" aria-hidden="true">
            {/* Ambient calm water sheen */}
            <div className="journal-water-sheen" />

            {/* Phase 2: Delicate Falling Botanical Tea Leaf */}
            <div className="journal-falling-leaf-wrap">
              <svg
                className="journal-falling-leaf-svg"
                viewBox="0 0 32 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="tm-journal-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#5d8b50" />
                    <stop offset="50%" stopColor="#365832" />
                    <stop offset="100%" stopColor="#142618" />
                  </linearGradient>
                </defs>
                <path
                  d="M16 2 C26 12 30 26 22 40 C18 46 16 48 16 48 C16 48 14 46 10 40 C2 26 6 12 16 2 Z"
                  fill="url(#tm-journal-leaf-grad)"
                />
                <path
                  d="M16 8 L16 44"
                  stroke="#c9a24b"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <path d="M16 16 Q20 14 23 12" stroke="#c9a24b" strokeWidth="0.6" opacity="0.65" />
                <path d="M16 22 Q11 20 8 18" stroke="#c9a24b" strokeWidth="0.6" opacity="0.65" />
                <path d="M16 28 Q21 26 24 24" stroke="#c9a24b" strokeWidth="0.6" opacity="0.65" />
                <path d="M16 34 Q12 32 9 30" stroke="#c9a24b" strokeWidth="0.6" opacity="0.65" />
              </svg>
            </div>

            {/* Phase 3: Concentric Ripples at Leaf Impact Point */}
            <div className="journal-impact-ripples">
              <span className="ripple r-1" />
              <span className="ripple r-2" />
              <span className="ripple r-3" />
            </div>
          </div>

          {/* Phase 4 & 5: Journal Book Appears & Opens */}
          <div className="journal-loader-content">
            <div className="journal-book">
              <div className="journal-book-shadow" />

              <div className="journal-page-left">
                <div className="journal-cover-crest">
                  <span className="crest-line" />
                  <span className="crest-text">LEAFLY</span>
                  <span className="crest-line" />
                </div>
              </div>

              <div className="journal-page-right">
                <span className="journal-inner-ornament">✦</span>
                <strong>THE</strong>
                <em>Leafly</em>
                <small>JOURNAL</small>
                <span className="journal-inner-tagline">Stories from the tea table</span>
              </div>

              <div className="journal-book-spine" />
            </div>

            <p className="journal-loader-label">
              OPENING THE LEAFLY JOURNAL
            </p>

            <div className="journal-loader-line">
              <span />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="journal-intro">
        <div>
          <p className="journal-eyebrow">
            FROM THE LEAFLY TABLE
          </p>

          <h1>
            Pour over
            <br />
            <em>the tea table.</em>
          </h1>
        </div>

        <div className="journal-intro-meta">
          <span>JOURNAL</span>
          <strong>7 STORIES</strong>
        </div>
      </section>

      {/* =====================================================
          FEATURED STORY
      ===================================================== */}

      <section className="journal-featured">
        <div className="journal-featured-image">
          <img
            src={teaTastingImage}
            alt="Tea tasting table with different teas"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />

          <span className="journal-image-mark">
            LEAFLY
          </span>
        </div>

        <div className="journal-featured-content">
          <p className="journal-card-category">
            TEA KNOWLEDGE
          </p>

          <h2>
            How to Taste
            <br />
            Tea Like a
            <br />
            Tea Maker
          </h2>

          <p className="journal-featured-description">
            A simple guide to noticing aroma, texture,
            sweetness and finish the way experienced
            tea makers do.
          </p>

          <div className="journal-card-footer">
            <span>8 MIN READ</span>

            <button
              type="button"
              onClick={() =>
                setSelectedStory({
                  id: 0,
                  category: "TEA KNOWLEDGE",
                  title: "How to Taste Tea Like a Tea Maker",
                  description:
                    "A simple guide to noticing aroma, texture, sweetness and finish the way experienced tea makers do.",
                  readTime: "8 MIN READ",
                  image: teaTastingImage,
                  content: [
                    "Professional tea tasting starts with observation. Before taking a sip, look at the dry leaves, notice their shape and colour, and pay attention to their aroma.",
                    "Once the tea is brewed, smell it again. The relationship between the dry leaf and the brewed leaf can reveal how the tea changes through preparation.",
                    "Take a small sip and let the tea move across your palate. Notice sweetness, bitterness, acidity, texture and the length of the finish.",
                    "Do not rush to name every flavour. Start with simple observations: bright or deep, light or full, floral or earthy, short or lingering.",
                    "Taste the tea again as it cools. Temperature changes can reveal flavours that were hidden in the first few sips.",
                    "The most useful tasting skill is attention. The more carefully you taste, the more clearly the tea begins to tell you what it is.",
                  ],
                })
              }
            >
              READ STORY <span>✦</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          STORY GRID
      ===================================================== */}

      <section className="journal-stories">
        <div className="journal-stories-header">
          <div>
            <p className="journal-eyebrow">
              FROM THE LEAFLY TABLE
            </p>

            <h2>
              More stories to
              <br className="journal-mobile-break" />
              steep in.
            </h2>
          </div>

          <p>
            Explore our notes on tea,
            <br />
            taste, origins and ritual.
          </p>
        </div>

        <div className="journal-grid">
          {stories.map((story) => (
            <article
              className="journal-card"
              key={story.id}
            >
              <div className="journal-card-image">
                <img
                  src={story.image}
                  alt={story.title}
                  loading="lazy"
                />

                <span className="journal-image-mark">
                  LEAFLY
                </span>
              </div>

              <div className="journal-card-content">
                <p className="journal-card-category">
                  {story.category}
                </p>

                <h3>
                  {story.title}
                </h3>

                <p className="journal-card-description">
                  {story.description}
                </p>

                <div className="journal-card-footer">
                  <span>{story.readTime}</span>

                  <button
                    type="button"
                    onClick={() => handleOpenStory(story)}
                  >
                    READ <span>✦</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================
          STORY MODAL
      ===================================================== */}

      {selectedStory && (
        <div
          className="journal-story-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseStory();
            }
          }}
        >
          <article className="journal-story-modal">

            <button
              type="button"
              className="journal-story-close"
              aria-label="Close story"
              onClick={handleCloseStory}
            >
              ×
            </button>

            <div className="journal-story-modal-image">
              <img
                src={selectedStory.image}
                alt={`Leafly Journal - ${selectedStory.title}`}
              />
            </div>

            <div className="journal-story-modal-content">
              <p className="journal-card-category">
                {selectedStory.category}
              </p>

              <h2>
                {selectedStory.title}
              </h2>

              <p className="journal-story-modal-lead">
                {selectedStory.description}
              </p>

              <div className="journal-story-divider" />

              <div className="journal-story-body">
                {selectedStory.content.map((paragraph, index) => (
                  <p key={index}>
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* NATURAL INTERNAL LINKS */}
              <div className="journal-story-related" style={{
                marginTop: "24px",
                padding: "16px 18px",
                background: "rgba(201, 162, 75, 0.08)",
                borderRadius: "8px",
                fontSize: "13.5px"
              }}>
                <strong style={{ color: "#0b2b1e", display: "block", marginBottom: "8px" }}>Explore Leafly Teas &amp; Guides:</strong>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <Link to="/tea-maker" style={{ color: "#0b2b1e", textDecoration: "underline" }}>Interactive Steeping Guide →</Link>
                  <Link to="/collections/green-tea" style={{ color: "#0b2b1e", textDecoration: "underline" }}>Single-Origin Green Teas →</Link>
                  <Link to="/collections/black-tea" style={{ color: "#0b2b1e", textDecoration: "underline" }}>Bold Assam Black Teas →</Link>
                  <Link to="/shop" style={{ color: "#0b2b1e", textDecoration: "underline" }}>Browse All Teas →</Link>
                </div>
              </div>

              <div className="journal-story-modal-footer">
                <span>
                  {selectedStory.readTime}
                </span>

                <span>
                  LEAFLY JOURNAL
                </span>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* =====================================================
          BACK TO TOP
      ===================================================== */}

      <button
        type="button"
        className="journal-back-top"
        aria-label="Back to top"
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          })
        }
      >
        <span>⌃</span>
        <small>TOP</small>
      </button>
      <Footer />
    </main>
  );
}