import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import "./AuthorizedDeveloper.css";

export default function AuthorizedDeveloper() {
  return (
    <div className="auth-dev-viewport">
      <Helmet>
        <title>Authorized Developer — Tanish Jangale</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta
          name="description"
          content="Authorized Developer & Designer identity page for Tanish Jangale. Project attribution: Leafly (TJ-LEAFLY-2026)."
        />
      </Helmet>

      <main className="auth-dev-container">
        {/* =====================================================
            TOP BAR / VERIFICATION STATUS
            ===================================================== */}
        <header className="auth-dev-topbar">
          <div className="auth-dev-badge-group">
            <span className="auth-dev-status-indicator" aria-hidden="true" />
            <span className="auth-dev-status-text">AUTHORIZED RECORD</span>
            <span className="auth-dev-status-id">TJ-LEAFLY-2026</span>
          </div>

          <Link to="/" className="auth-dev-exit-link" aria-label="Return to Leafly website">
            <span className="auth-dev-exit-arrow">←</span>
            <span>Return to Website</span>
          </Link>
        </header>

        {/* =====================================================
            HERO / DEVELOPER PROFILE
            ===================================================== */}
        <section className="auth-dev-profile-section">
          <div className="auth-dev-monogram-wrap">
            <div className="auth-dev-monogram">TJ</div>
          </div>

          <div className="auth-dev-titles">
            <div className="auth-dev-designation-badge">
              <span className="auth-dev-badge-dot" />
              <span>Authorized Developer</span>
            </div>

            <h1 className="auth-dev-name">Tanish Jangale</h1>

            <p className="auth-dev-role">
              Independent Website Developer &amp; Designer
            </p>
          </div>
        </section>

        {/* =====================================================
            TAGLINE STATEMENT
            ===================================================== */}
        <section className="auth-dev-tagline-card">
          <div className="auth-dev-tagline-ornament" aria-hidden="true">
            <span className="auth-dev-copper-line" />
            <span className="auth-dev-copper-glyph">◆</span>
            <span className="auth-dev-copper-line" />
          </div>
          <blockquote className="auth-dev-tagline">
            “Designing digital experiences. Engineering ideas into reality.”
          </blockquote>
        </section>

        {/* =====================================================
            PROJECT ATTRIBUTION DOSSIER
            ===================================================== */}
        <section className="auth-dev-dossier-card">
          <div className="auth-dev-card-header">
            <h2 className="auth-dev-card-title">Project Attribution &amp; Specification</h2>
            <span className="auth-dev-verified-chip">Verified Assignment</span>
          </div>

          <div className="auth-dev-spec-grid">
            <div className="auth-dev-spec-item">
              <span className="auth-dev-spec-label">Project</span>
              <span className="auth-dev-spec-value auth-dev-project-name">Leafly</span>
            </div>

            <div className="auth-dev-spec-item">
              <span className="auth-dev-spec-label">Project ID</span>
              <span className="auth-dev-spec-value auth-dev-spec-code">TJ-LEAFLY-2026</span>
            </div>

            <div className="auth-dev-spec-item">
              <span className="auth-dev-spec-label">Designation</span>
              <span className="auth-dev-spec-value">Authorized Developer</span>
            </div>

            <div className="auth-dev-spec-item">
              <span className="auth-dev-spec-label">Role</span>
              <span className="auth-dev-spec-value">Independent Website Developer &amp; Designer</span>
            </div>

            <div className="auth-dev-spec-item auth-dev-spec-span">
              <span className="auth-dev-spec-label">Engineering &amp; Design Scope</span>
              <p className="auth-dev-spec-desc">
                Full-stack frontend architecture, luxury e-commerce interfaces, bespoke interaction
                design, state management, checkout &amp; order pipelines, performance optimization, and
                cloud infrastructure integration.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            SIGNATURE & SEAL
            ===================================================== */}
        <footer className="auth-dev-footer-card">
          <div className="auth-dev-signature-block">
            <p className="auth-dev-signature-label">Attribution Signature</p>
            <p className="auth-dev-signature-text">
              Designed &amp; Developed by Tanish Jangale.
            </p>
          </div>

          <div className="auth-dev-meta-block">
            <span className="auth-dev-meta-tag">AUTHORIZED REGISTRY SPECIFICATION</span>
            <span className="auth-dev-meta-date">ID: TJ-LEAFLY-2026</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

