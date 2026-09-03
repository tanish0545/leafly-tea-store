import { Helmet } from "react-helmet-async";
import { getFullUrl, DEFAULT_OG_IMAGE } from "../lib/seoData";

export interface SEOProps {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
  publishedTime?: string;
}

export default function SEO({
  title,
  description,
  canonicalPath = "/",
  image,
  type = "website",
  noindex = false,
  schema,
  publishedTime,
}: SEOProps) {
  const fullCanonicalUrl = getFullUrl(canonicalPath);
  const fullImageUrl = image ? getFullUrl(image) : DEFAULT_OG_IMAGE;

  const robotsContent = noindex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  // Schema serialization
  const schemaJson = schema
    ? Array.isArray(schema)
      ? JSON.stringify(schema)
      : JSON.stringify(schema)
    : null;

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullCanonicalUrl} />
      <meta name="robots" content={robotsContent} />

      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content="Leafly" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:type" content={type} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />

      {/* Structured Data (JSON-LD) */}
      {schemaJson && (
        <script type="application/ld+json">
          {schemaJson}
        </script>
      )}
    </Helmet>
  );
}
