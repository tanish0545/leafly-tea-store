import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import "./NotFound.css";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <SEO
        title="Page Not Found | Leafly"
        description="The page you are looking for does not exist."
        noindex={true}
      />
      <div className="not-found-inner">

        <p className="not-found-code" aria-hidden="true">404</p>

        <p className="not-found-mark" aria-hidden="true">❧</p>

        <h1 className="not-found-title">Page Not Found</h1>

        <p className="not-found-subtitle">
          The page you&apos;re looking for doesn&apos;t exist, or may have
          been moved. Let&apos;s get you back to your tea ritual.
        </p>

        <div className="not-found-divider" aria-hidden="true">
          <span />
          <b>◈</b>
          <span />
        </div>

        <div className="not-found-actions">
          <Link to="/" className="not-found-primary">
            ← BACK TO HOME
          </Link>
          <Link to="/shop" className="not-found-secondary">
            BROWSE TEAS
          </Link>
        </div>

      </div>
      <Footer />
    </main>
  );
}
