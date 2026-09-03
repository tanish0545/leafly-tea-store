import { type Product, type ProductVariantKey, getProductSlug } from "../data/products";
import { type TeawareItem } from "../data/teaware";

export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://leafly.vercel.app"
);

export const DEFAULT_OG_IMAGE = `${SITE_URL}/leafly-logo.webp`;

export function getFullUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}

/**
 * Organization Schema
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Leafly",
    "url": SITE_URL,
    "logo": `${SITE_URL}/leafly-logo.png`,
    "description": "Curator of single-origin Indian teas, whole leaf Darjeeling, Assam, and Himalayan harvests, artisan teaware, and mindful brewing rituals.",
    "email": "leaflydatabase@gmail.com",
    "sameAs": [
      "https://www.instagram.com/leafly.greentea?igsi=MWI2dG5qenQyYjUxZA==",
      "https://facebook.com"
    ]
  };
}

/**
 * WebSite Schema with SearchAction
 */
export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Leafly",
    "url": SITE_URL,
    "description": "Premium Single-Origin Indian Teas & Artisanal Rituals",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_URL}/shop?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
}

/**
 * BreadcrumbList Schema
 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": getFullUrl(item.url)
    }))
  };
}

/**
 * Product Schema with Variants & Offers
 */
export function generateProductSchema(
  product: Product,
  canonicalPath?: string
) {
  const productUrl = getFullUrl(canonicalPath || `/shop/${getProductSlug(product)}`);
  const imageUrl = getFullUrl(product.image);
  const inStock = product.inStock !== false && (typeof product.stock !== "number" || product.stock > 0);

  // Generate offers for each supported variant
  const offersList: Record<string, unknown>[] = [];

  if (product.variants) {
    const variantKeys = Object.keys(product.variants) as ProductVariantKey[];
    variantKeys.forEach((key) => {
      const vData = product.variants[key];
      if (vData && typeof vData.price === "number") {
        offersList.push({
          "@type": "Offer",
          "name": `${product.name} - ${key}`,
          "price": vData.price,
          "priceCurrency": "INR",
          "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "url": productUrl,
          "itemCondition": "https://schema.org/NewCondition",
          "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0]
        });
      }
    });
  }

  // Fallback single offer if no variants
  if (offersList.length === 0) {
    offersList.push({
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "INR",
      "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": productUrl,
      "itemCondition": "https://schema.org/NewCondition"
    });
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": [imageUrl],
    "description": product.description || `Single-origin ${product.category} tea from ${product.origin}. Hand-plucked, artisan processed whole leaves.`,
    "sku": `LEAFLY-TEA-${product.id}`,
    "brand": {
      "@type": "Brand",
      "name": "Leafly"
    },
    "category": `${product.category} Tea`,
    "offers": offersList.length === 1 ? offersList[0] : offersList
  };

  // Only include ratings if actual rating exists
  if (typeof product.rating === "number" && typeof product.reviewCount === "number" && product.reviewCount > 0) {
    schema["aggregateRating"] = {
      "@type": "AggregateRating",
      "ratingValue": product.rating,
      "reviewCount": product.reviewCount,
      "bestRating": "5",
      "worstRating": "1"
    };
  }

  return schema;
}

/**
 * Teaware Product Schema
 */
export function generateTeawareSchema(item: TeawareItem, canonicalPath?: string) {
  const itemUrl = getFullUrl(canonicalPath || `/teaware/${getProductSlug(item)}`);
  const imageUrl = getFullUrl(item.image);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": item.name,
    "image": [imageUrl],
    "description": item.description,
    "sku": `LEAFLY-WARE-${item.id}`,
    "brand": {
      "@type": "Brand",
      "name": "Leafly"
    },
    "category": item.category,
    "material": item.material,
    "offers": {
      "@type": "Offer",
      "price": item.price,
      "priceCurrency": "INR",
      "availability": "https://schema.org/InStock",
      "url": itemUrl,
      "itemCondition": "https://schema.org/NewCondition"
    }
  };

  if (typeof item.rating === "number" && typeof item.reviewCount === "number" && item.reviewCount > 0) {
    schema["aggregateRating"] = {
      "@type": "AggregateRating",
      "ratingValue": item.rating,
      "reviewCount": item.reviewCount,
      "bestRating": "5",
      "worstRating": "1"
    };
  }

  return schema;
}

/**
 * Article Schema for Journal Stories
 */
export function generateArticleSchema(article: {
  title: string;
  description: string;
  image?: string;
  datePublished?: string;
  category?: string;
}, canonicalPath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": article.title,
    "description": article.description,
    "image": article.image ? getFullUrl(article.image) : DEFAULT_OG_IMAGE,
    "url": getFullUrl(canonicalPath),
    "datePublished": article.datePublished || "2024-06-01T00:00:00+05:30",
    "dateModified": new Date().toISOString(),
    "articleSection": article.category || "Tea Culture",
    "author": {
      "@type": "Organization",
      "name": "Leafly Tea House",
      "url": SITE_URL
    },
    "publisher": {
      "@type": "Organization",
      "name": "Leafly",
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/leafly-logo.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": getFullUrl(canonicalPath)
    }
  };
}
