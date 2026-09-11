import "./BrandValues.css";

const values = [
  {
    icon: "🍃",
    title: "REAL LEAVES",
    description:
      "We use whole, unbroken leaves picked at their best for pure flavour in every cup.",
  },
  {
    icon: "⌁",
    title: "CURATED PREMIUM INGREDIENTS",
    description:
      "Hand selected teas flowers and natural botanical chosen for there exceptional flavour clarity and story",
  },
  {
    icon: "🍃",
    title: "ETHICALLY SOURCED & SUSTAINABLE",
    description:
      "From the gardens to your cup, we choose partners and processes that respect the planet and support fair practices.",
  },
  {
    icon: "♡",
    title: "CRAFTED WITH CARE",
    description:
      "Blended and packed in small batches to preserve freshness and elevate every ritual.",
  },
];

export default function BrandValues() {
  return (
    <section className="brand-values-section">

      <div className="brand-values-container">

        {/* HEADER */}

        <div className="brand-values-header">

          <div className="brand-values-eyebrow">
            <span />
            <p>OUR VALUES</p>
            <span />
          </div>

          <h2>
            Rooted in care,{" "}
            <em>crafted for you.</em>
          </h2>

          <p className="brand-values-intro">
            Every leaf we source and every blend we create is guided by
            our commitment to quality, sustainability, and meaningful rituals.
          </p>

        </div>


        {/* VALUES */}

        <div className="brand-values-grid">

          {values.map((value) => (
            <article
              className="brand-value-card"
              key={value.title}
            >

              <div className="brand-value-icon">
                {value.icon}
              </div>

              <h3>
                {value.title}
              </h3>

              <div className="brand-value-line" />

              <p>
                {value.description}
              </p>

            </article>
          ))}

        </div>


        {/* FOOTER STATEMENT */}

        <div className="brand-values-footer">

          <span />

          <p>
            BETTER TEA. BETTER WORLD. BETTER YOU.
          </p>

          <span />

        </div>

      </div>

    </section>
  );
}