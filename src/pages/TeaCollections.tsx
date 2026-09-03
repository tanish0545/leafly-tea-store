/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductContext";
import { getProductSlug, isProductInStock, type Product } from "../data/products";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import "./TeaCollections.css";

type TeaCollection = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  character: string;
  caffeine: string;
  origin: string;
  image: string;
};

const collections: TeaCollection[] = [
  {
    id: "green",
    name: "Green Tea",
    subtitle: "Fresh · Bright · Refined",
    description:
      "Fresh, expressive teas with delicate vegetal notes, clean finishes and a naturally uplifting character.",
    character: "Fresh & vegetal",
    caffeine: "Medium",
    origin: "Darjeeling",
    image: "/leafly-green-tea.webp",
  },
  {
    id: "white",
    name: "White Tea",
    subtitle: "Delicate · Silken · Quiet",
    description:
      "The gentlest expression of the leaf. Soft, floral and beautifully restrained for slower rituals.",
    character: "Floral & delicate",
    caffeine: "Low",
    origin: "Darjeeling",
    image: "/leafly-white-tea.webp",
  },
  {
    id: "black",
    name: "Black Tea",
    subtitle: "Bold · Deep · Classic",
    description:
      "Full-bodied teas with depth, warmth and structure. A timeless choice for the morning ritual.",
    character: "Bold & malty",
    caffeine: "High",
    origin: "Assam",
    image: "/leafly-black-tea.webp",
  },
  {
    id: "oolong",
    name: "Oolong",
    subtitle: "Complex · Aromatic · Layered",
    description:
      "Partially oxidised teas that sit beautifully between green and black, revealing layer after layer.",
    character: "Floral & layered",
    caffeine: "Medium",
    origin: "Darjeeling",
    image: "/leafly-oolong-tea.webp",
  },
];

const collectionSeoData: Record<string, { title: string; description: string; canonical: string }> = {
  green: {
    title: "Premium Green Tea Online | Himalayan Loose Leaf | Leafly",
    description: "Buy premium single-origin green tea online from Leafly. Handcrafted whole leaves with fresh, delicate vegetal notes. Learn how to brew green tea at the optimal temperature.",
    canonical: "/collections/green-tea",
  },
  black: {
    title: "Premium Black Tea Online | Assam & Darjeeling Loose Leaf | Leafly",
    description: "Shop bold, full-bodied premium black teas online from Assam and Darjeeling estates. Rich malty depth and golden tips crafted for purposeful morning rituals.",
    canonical: "/collections/black-tea",
  },
  white: {
    title: "Premium White Tea Online | Delicate Silver Tips & Reserve | Leafly",
    description: "Explore exquisite single-origin white teas online. Pure unopened Silver Tips and gentle sun-dried leaves with silken texture and floral sweetness.",
    canonical: "/collections/white-tea",
  },
  oolong: {
    title: "Premium Oolong Tea Online | Artisan Handcrafted Leaves | Leafly",
    description: "Discover artisan semi-oxidized oolong tea online from Leafly. Complex orchid fragrance, honeyed roasted finish, and multi-steep depth.",
    canonical: "/collections/oolong-tea",
  },
};

function parseCategoryParam(param?: string): string {
  if (!param) return "green";
  const clean = param.toLowerCase().replace(/-tea$/, "").trim();
  if (["green", "white", "black", "oolong"].includes(clean)) {
    return clean;
  }
  return "green";
}

export default function TeaCollections() {
  const navigate = useNavigate();
  const { category: categoryParam } = useParams<{ category?: string }>();
  const { products } = useProducts();
  const { addToCart } = useCart();

  const [activeCollection, setActiveCollection] = useState(() =>
    categoryParam ? parseCategoryParam(categoryParam) : "green"
  );

  useEffect(() => {
    if (categoryParam) {
      setActiveCollection(parseCategoryParam(categoryParam));
    }
  }, [categoryParam]);

  const [addedId, setAddedId] =
    useState<number | string | null>(null);

  const [selectedRitual, setSelectedRitual] =
    useState<"bright" | "slow" | "deep">("bright");

  const active =
    collections.find(
      (collection) =>
        collection.id === activeCollection
    ) ?? collections[0];

  const handleCollectionClick = (
    collection: TeaCollection
  ) => {
    setActiveCollection(collection.id);
    navigate(`/collections/${collection.id}-tea`);
  };

  const currentSeo = collectionSeoData[activeCollection] || collectionSeoData.green;

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Collections", url: "/collections" },
    { name: active.name, url: currentSeo.canonical },
  ];

  const handleAddToCart = (
    product: Product
  ) => {
    if (!isProductInStock(product)) return;

    addToCart(
      product,
      1,
      "100g",
      product.price,
      product.oldPrice
    );

    setAddedId(product.id);

    window.setTimeout(() => {
      setAddedId(null);
    }, 1500);
  };

  return (
    <main className="leafly-collections-page">
      <SEO
        title={currentSeo.title}
        description={currentSeo.description}
        canonicalPath={currentSeo.canonical}
        image={active.image}
        schema={generateBreadcrumbSchema(breadcrumbs)}
      />

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="collections-hero">

        <div className="collections-hero-content">

          <div className="collections-eyebrow">
            <span />
            <p>THE LEAFLY COLLECTIONS</p>
            <span />
          </div>

          <h1>
            Find the tea
            <br />
            <em>that feels like you.</em>
          </h1>

          <p className="collections-hero-description">
            From bright green teas to complex,
            aromatic oolongs, explore our
            collection by character, origin
            and ritual.
          </p>

        </div>

      </section>


      {/* =====================================================
          COLLECTION INTRO
      ===================================================== */}

      <section className="collections-intro">

        <div>
          <p className="collections-section-label">
            EXPLORE BY CHARACTER
          </p>

          <h2>
            Four expressions
            <br />
            of the leaf.
          </h2>
        </div>

        <p className="collections-intro-copy">
          Every tea has its own rhythm.
          Some are bright and energetic.
          Others ask you to slow down.
          Explore the Leafly collection and
          discover the character that belongs
          in your ritual.
        </p>

      </section>


      {/* =====================================================
          COLLECTION SELECTOR
      ===================================================== */}

      <section className="collections-selector">

        <div className="collection-list">

          {collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              className={
                activeCollection === collection.id
                  ? "collection-selector-item active"
                  : "collection-selector-item"
              }
              onClick={() =>
                handleCollectionClick(
                  collection
                )
              }
            >
              <span className="collection-number">
                {String(
                  collections.indexOf(
                    collection
                  ) + 1
                ).padStart(2, "0")}
              </span>

              <span className="collection-selector-name">
                {collection.name}
              </span>

              <span className="collection-selector-arrow">
                ✦
              </span>
            </button>
          ))}

        </div>


        {/* FEATURED COLLECTION */}

        <article className="collection-feature">

          <div className="collection-feature-image">

            <img
              src={active.image}
              alt={active.name}
              loading="lazy"
            />

            <span>
              {active.origin}
            </span>

          </div>


          <div className="collection-feature-content">

            <p className="collection-feature-label">
              {active.subtitle}
            </p>

            <h2>
              {active.name}
            </h2>

            <p className="collection-feature-description">
              {active.description}
            </p>


            <div className="collection-spec-grid">

              <div>
                <span>CHARACTER</span>
                <strong>
                  {active.character}
                </strong>
              </div>

              <div>
                <span>CAFFEINE</span>
                <strong>
                  {active.caffeine}
                </strong>
              </div>

              <div>
                <span>ORIGIN</span>
                <strong>
                  {active.origin}
                </strong>
              </div>

            </div>


            <button
              type="button"
              className="collection-explore-button"
              onClick={() =>
                navigate(`/shop?category=${encodeURIComponent(active.name.replace(/ Tea$/i, ""))}`)
              }
            >
              EXPLORE THIS COLLECTION
              <span>✦</span>
            </button>

          </div>

        </article>

      </section>


      {/* =====================================================
          RITUAL SECTION
      ===================================================== */}

      <section className="collections-ritual">

        <div className="ritual-content">

          <p className="collections-section-label">
            CHOOSE YOUR RITUAL
          </p>

          <h2>
            The right tea
            <br />
            changes the moment.
          </h2>

          <p>
            A morning that needs clarity.
            An afternoon that needs slowing
            down. An evening that deserves
            something warm and grounding.
            There is a leaf for every moment.
          </p>

        </div>

        <div className="ritual-cards">

          <article
            className={`ritual-interactive-card ${selectedRitual === "bright" ? "selected" : ""}`}
            onClick={() => setSelectedRitual("bright")}
            tabIndex={0}
            role="button"
            aria-pressed={selectedRitual === "bright"}
          >
            <div className="ritual-card-header">
              <span>01</span>
              {selectedRitual === "bright" && <span className="ritual-selected-badge">SELECTED</span>}
            </div>

            <h3>
              Start Bright
            </h3>

            <p>
              Fresh green teas for focused
              mornings and clean beginnings.
            </p>

            <div className="ritual-recommendation">
              <span className="ritual-rec-label">Recommended:</span>
              <div className="ritual-rec-tags">
                <span className="ritual-tag">Green Tea</span>
                <span className="ritual-tag">White Tea</span>
              </div>
            </div>

            <button
              type="button"
              className="ritual-cta-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/shop");
              }}
            >
              EXPLORE THIS RITUAL →
            </button>
          </article>

          <article
            className={`ritual-interactive-card ${selectedRitual === "slow" ? "selected" : ""}`}
            onClick={() => setSelectedRitual("slow")}
            tabIndex={0}
            role="button"
            aria-pressed={selectedRitual === "slow"}
          >
            <div className="ritual-card-header">
              <span>02</span>
              {selectedRitual === "slow" && <span className="ritual-selected-badge">SELECTED</span>}
            </div>

            <h3>
              Slow Down
            </h3>

            <p>
              Silken white and oolong teas
              for quieter afternoons.
            </p>

            <div className="ritual-recommendation">
              <span className="ritual-rec-label">Recommended:</span>
              <div className="ritual-rec-tags">
                <span className="ritual-tag">White Tea</span>
                <span className="ritual-tag">Oolong</span>
              </div>
            </div>

            <button
              type="button"
              className="ritual-cta-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/shop");
              }}
            >
              EXPLORE THIS RITUAL →
            </button>
          </article>

          <article
            className={`ritual-interactive-card ${selectedRitual === "deep" ? "selected" : ""}`}
            onClick={() => setSelectedRitual("deep")}
            tabIndex={0}
            role="button"
            aria-pressed={selectedRitual === "deep"}
          >
            <div className="ritual-card-header">
              <span>03</span>
              {selectedRitual === "deep" && <span className="ritual-selected-badge">SELECTED</span>}
            </div>

            <h3>
              Go Deep
            </h3>

            <p>
              Bold black teas and mature
              oolongs for slower evenings.
            </p>

            <div className="ritual-recommendation">
              <span className="ritual-rec-label">Recommended:</span>
              <div className="ritual-rec-tags">
                <span className="ritual-tag">Black Tea</span>
                <span className="ritual-tag">Oolong</span>
              </div>
            </div>

            <button
              type="button"
              className="ritual-cta-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/shop");
              }}
            >
              EXPLORE THIS RITUAL →
            </button>
          </article>

        </div>

      </section>


      {/* =====================================================
          FEATURED TEAS
      ===================================================== */}

      <section className="collections-products">

        <div className="collections-products-header">

          <div>
            <p className="collections-section-label">
              FROM THE COLLECTION
            </p>

            <h2>
              A few worth knowing.
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
          >
            VIEW ALL TEAS
            <span>✦</span>
          </button>

        </div>


        <div className="collections-product-grid">

          {products.slice(0, 3).map(
            (product) => {
              const isAdded = addedId === product.id;
              const inStock = isProductInStock(product);

              return (
                <article
                  className="collections-product-card"
                  key={product.id}
                >

                  <div
                    className="collections-product-image"
                    onClick={() => navigate(`/shop/${getProductSlug(product)}`)}
                    style={{ cursor: "pointer" }}
                  >

                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                    />

                    <span>
                      {!inStock ? "OUT OF STOCK" : product.category}
                    </span>

                  </div>


                  <div className="collections-product-content">

                    <p>
                      {product.origin} ·{" "}
                      {product.weight}
                    </p>

                    <h3
                      onClick={() => navigate(`/shop/${getProductSlug(product)}`)}
                      style={{ cursor: "pointer" }}
                    >
                      {product.name}
                    </h3>

                    <div className="collections-product-bottom">

                      <strong>
                        ₹
                        {product.price.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                      <button
                        type="button"
                        className={
                          !inStock
                            ? "collection-add-button disabled"
                            : isAdded
                            ? "collection-add-button added"
                            : "collection-add-button"
                        }
                        disabled={!inStock}
                        onClick={() =>
                          handleAddToCart(
                            product
                          )
                        }
                      >
                        {!inStock
                          ? "OUT OF STOCK"
                          : isAdded
                          ? "ADDED ✓"
                          : "ADD TO CART"}
                      </button>

                    </div>

                  </div>

                </article>
              );
            }
          )}

        </div>

      </section>


      {/* =====================================================
          SHOP CTA
      ===================================================== */}

      <section className="collections-cta">

        <div>

          <p>
            THE FULL LEAFLY SHOP
          </p>

          <h2>
            Your next ritual
            <br />
            starts with a leaf.
          </h2>

          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
          >
            EXPLORE ALL TEAS
            <span>✦</span>
          </button>

        </div>

      </section>


      {/* =====================================================
          PROMISES
      ===================================================== */}

      <section className="collections-promises">

        <div>
          <span>◌</span>

          <strong>
            WHOLE LEAF TEAS
          </strong>

          <p>
            Real leaves, real flavour.
          </p>
        </div>

        <div>
          <span>⌂</span>

          <strong>
            SINGLE ORIGIN
          </strong>

          <p>
            Teas from distinct regions.
          </p>
        </div>

        <div>
          <span>♨</span>

          <strong>
            FRESHLY PACKED
          </strong>

          <p>
            Packed in small batches.
          </p>
        </div>

        <div>
          <span>◇</span>

          <strong>
            SECURE & SAFE
          </strong>

          <p>
            Secure payments, always.
          </p>
        </div>

      </section>

      <Footer />


      {/* =====================================================
          BACK TO TOP
      ===================================================== */}

      <button
        type="button"
        className="collections-back-top"
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          })
        }
        aria-label="Back to top"
      >
        <span>❧</span>
        <small>TOP</small>
      </button>

    </main>
  );
}