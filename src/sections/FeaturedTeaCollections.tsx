import { Link } from "react-router-dom";
import "./FeaturedTeaCollections.css";

const teas = [
  {
    name: "Green Tea",
    category: "01 · SIGNATURE COLLECTION",
    subtitle: "FRESH & LUCATE",
    description:
      "Fresh, vibrant leaves with a naturally delicate character. A clean and refreshing cup created for quiet mornings and mindful moments.",
    image: "/leafly-green-tea.webp",
  },
  {
    name: "White Tea",
    category: "02 · DELICATE COLLECTION",
    subtitle: "PURE & DELICATE",
    description:
      "Lightly handled leaves with an elegant, subtle character. Soft floral notes and a refined finish make this a beautifully gentle tea.",
    image: "/leafly-white-tea.webp",
  },
  {
    name: "Black Tea",
    category: "03 · CLASSIC COLLECTION",
    subtitle: "RICH & BOLD",
    description:
      "Rich, expressive leaves selected for depth and balance. A full-bodied cup with warmth, character, and a lingering finish.",
    image: "/leafly-black-tea.webp",
  },
  {
    name: "Oolong Tea",
    category: "04 · ARTISAN COLLECTION",
    subtitle: "COMPLEX & REFINED",
    description:
      "A beautifully layered tea between green and black. Complex aromas, rounded texture, and a graceful finish reveal something new in every sip.",
    image: "/leafly-oolong-tea.webp",
  },
];

export default function FeaturedTeaCollections() {
  return (
    <section
      id="featured-teas"
      className="featured-teas-section"
    >
      <div className="featured-teas-container">

        {/* ================================================
            SECTION HEADER
        ================================================= */}

        <header className="featured-teas-heading">

          <div className="featured-teas-heading-main">

            <div className="featured-teas-eyebrow">
              <span />
              <p>THE LEAFLY COLLECTION</p>
              <span />
            </div>

            <h2>
              Exceptional teas.
              <br />
              <em>Distinct character.</em>
            </h2>

          </div>

          <p className="featured-teas-intro">
            From misty mountain gardens to heritage estates,
            our tea collections are carefully chosen to bring
            you the purest flavours, finest leaves and a richer
            tea experience.
          </p>

        </header>


        {/* ================================================
            TEA CARDS
        ================================================= */}

        <div className="featured-teas-grid">

          {teas.map((tea, index) => (
            <article
              className="featured-tea-card"
              key={tea.name}
            >

              {/* Image */}

              <div className="featured-tea-image">

                <img
                  src={tea.image}
                  alt={`Leafly ${tea.name}`}
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding="async"
                />

                <div className="featured-tea-image-shade" />

              </div>


              {/* Content */}

              <div className="featured-tea-content">

                <p className="featured-tea-category">
                  {tea.category}
                </p>

                <h3>
                  {tea.name}
                </h3>

                <p className="featured-tea-subtitle">
                  {tea.subtitle}
                </p>

                <p className="featured-tea-description">
                  {tea.description}
                </p>

                <Link
                  to="/tea-collections"
                  className="featured-tea-link"
                >
                  <span>
                    EXPLORE COLLECTION
                  </span>

                  <strong aria-hidden="true">
                    →
                  </strong>
                </Link>

              </div>

            </article>
          ))}

        </div>


        {/* ================================================
            FOOTER STATEMENT
        ================================================= */}

        <div className="featured-teas-footer">

          <span />

          <p>
            REAL TEA. BETTER MOMENTS.
          </p>

          <span />

        </div>

      </div>
    </section>
  );
}