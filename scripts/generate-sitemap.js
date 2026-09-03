import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.VITE_SITE_URL || "https://leafly.vercel.app";
const TODAY = new Date().toISOString().split("T")[0];

// Extract tea product IDs from src/data/products.ts
function getProductIds() {
  try {
    const filePath = path.resolve(__dirname, "../src/data/products.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    const matches = [...content.matchAll(/id:\s*["']?(\d+)["']?/g)];
    const ids = Array.from(new Set(matches.map((m) => m[1])));
    return ids.length ? ids : ["1", "2", "3", "4", "5", "6", "7", "8"];
  } catch (err) {
    console.warn("Could not read products.ts, using fallback IDs:", err);
    return ["1", "2", "3", "4", "5", "6", "7", "8"];
  }
}

// Extract teaware IDs from src/data/teaware.ts
function getTeawareIds() {
  try {
    const filePath = path.resolve(__dirname, "../src/data/teaware.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    const matches = [...content.matchAll(/id:\s*["'](tw-\d+)["']/g)];
    const ids = Array.from(new Set(matches.map((m) => m[1])));
    return ids.length ? ids : ["tw-1", "tw-2", "tw-3", "tw-4", "tw-5", "tw-6"];
  } catch (err) {
    console.warn("Could not read teaware.ts, using fallback IDs:", err);
    return ["tw-1", "tw-2", "tw-3", "tw-4", "tw-5", "tw-6"];
  }
}

// Extract journal article slugs from src/pages/Journal.tsx
function getJournalSlugs() {
  try {
    const filePath = path.resolve(__dirname, "../src/pages/Journal.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    const titleMatches = [...content.matchAll(/title:\s*["']([^"']+)["']/g)];
    if (titleMatches.length) {
      return titleMatches.map((m) =>
        m[1]
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
      );
    }
    return [
      "the-myth-of-boiling-water-why-delicate-leaves-demand-cooler-care",
      "first-flush-vs-second-flush-decoding-darjeelings-seasons",
      "the-alchemy-of-orthodox-leaf-how-slow-withering-builds-character",
      "from-mist-to-cup-a-journey-through-high-elevation-tea-gardens",
    ];
  } catch (err) {
    console.warn("Could not read Journal.tsx, using fallback slugs:", err);
    return [
      "the-myth-of-boiling-water-why-delicate-leaves-demand-cooler-care",
      "first-flush-vs-second-flush-decoding-darjeelings-seasons",
      "the-alchemy-of-orthodox-leaf-how-slow-withering-builds-character",
      "from-mist-to-cup-a-journey-through-high-elevation-tea-gardens",
    ];
  }
}

function generateSitemap() {
  const productIds = getProductIds();
  const teawareIds = getTeawareIds();
  const journalSlugs = getJournalSlugs();

  const entries = [
    // Core Homepage & Navigation
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/shop", priority: "0.9", changefreq: "daily" },
    { path: "/tea-collections", priority: "0.9", changefreq: "weekly" },
    { path: "/tea-maker", priority: "0.8", changefreq: "monthly" },
    { path: "/teaware", priority: "0.8", changefreq: "weekly" },
    { path: "/gifting", priority: "0.8", changefreq: "weekly" },
    { path: "/journal", priority: "0.8", changefreq: "weekly" },

    // Category Pages
    { path: "/collections/all-teas", priority: "0.8", changefreq: "weekly" },
    { path: "/collections/green-tea", priority: "0.8", changefreq: "weekly" },
    { path: "/collections/white-tea", priority: "0.8", changefreq: "weekly" },
    { path: "/collections/black-tea", priority: "0.8", changefreq: "weekly" },
    { path: "/collections/oolong-tea", priority: "0.8", changefreq: "weekly" },

    // Brand & Value Pages
    { path: "/about", priority: "0.7", changefreq: "monthly" },
    { path: "/why-leafly", priority: "0.7", changefreq: "monthly" },
    { path: "/contact", priority: "0.6", changefreq: "monthly" },
    { path: "/faqs", priority: "0.7", changefreq: "monthly" },

    // Trust & Policy Pages
    { path: "/shipping-policy", priority: "0.5", changefreq: "monthly" },
    { path: "/freshness-guarantee", priority: "0.5", changefreq: "monthly" },
    { path: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
    { path: "/terms-and-conditions", priority: "0.3", changefreq: "yearly" },
  ];

  // Dynamic Tea Product Pages
  productIds.forEach((id) => {
    entries.push({
      path: `/product/${id}`,
      priority: "0.8",
      changefreq: "weekly",
    });
  });

  // Dynamic Teaware Pages
  teawareIds.forEach((id) => {
    entries.push({
      path: `/product/${id}`,
      priority: "0.7",
      changefreq: "weekly",
    });
  });

  // Dynamic Journal Article Pages
  journalSlugs.forEach((slug) => {
    entries.push({
      path: `/journal/${slug}`,
      priority: "0.7",
      changefreq: "monthly",
    });
  });

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map(
      (entry) => `  <url>
    <loc>${BASE_URL}${entry.path}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    ),
    `</urlset>`,
  ].join("\n");

  const outputPath = path.resolve(__dirname, "../public/sitemap.xml");
  fs.writeFileSync(outputPath, xml, "utf-8");
  console.log(`✓ Generated sitemap with ${entries.length} canonical URLs at ${outputPath}`);
}

generateSitemap();
