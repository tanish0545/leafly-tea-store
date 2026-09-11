/* ==========================================================
   LEAFLY — SHARED PRODUCT DATA
   Single source of truth used by Shop, Teaware, Gifting, ProductDetail, etc.
   ========================================================== */

import storageCanisterImg from "../assets/teaware-storage-canister.webp";
import bambooTeaTrayImg from "../assets/bamboo-tea-tray.webp";
import glassInfuserTeapotImg from "../assets/glass-infuser-teapot.webp";
import cupSaucerImg from "../assets/teaware-cup-saucer.webp";
import bloomingTeaImg from "../assets/teaware-blooming-tea.webp";
import glassCupImg from "../assets/teaware-glass-cup.webp";
import marbleTeapotImg from "../assets/teaware-marble-teapot.webp";
import glassTeapotImg from "../assets/teaware-glass-teapot.webp";

import giftImage2 from "../assets/image2.webp";
import giftImage3 from "../assets/image3.webp";
import giftImage5 from "../assets/image5.webp";

export type TeaCategory =
  | "Green Tea"
  | "Black Tea"
  | "Oolong Tea";

export type ProductCategory = TeaCategory | "teaware" | "gifting" | string;

export function normalizeTeaCategory(category?: string): TeaCategory {
  if (!category) return "Green Tea";
  const c = category.trim().toLowerCase();
  if (c.includes("oolong")) return "Oolong Tea";
  if (c.includes("black") || c.includes("dusk") || c.includes("chamomile") || c.includes("white")) return "Black Tea";
  if (c.includes("green")) return "Green Tea";
  return "Green Tea";
}

export type ProductVariantKey = "25g" | "50g" | "100g" | "250g" | "500g" | "1kg";

export const SUPPORTED_WEIGHT_KEYS: ProductVariantKey[] = ["25g", "50g", "100g", "250g", "500g", "1kg"];

export type ProductVariant = {
  weight: ProductVariantKey | string;
  price: number;
  oldPrice?: number;
};

export type Product = {
  id: number | string;
  name: string;
  slug?: string;
  category: ProductCategory;
  origin: string;
  caffeine?: "Low" | "Medium" | "High" | "None" | "Teaware" | "Varied" | string;
  weight?: string;
  price: number;
  oldPrice?: number;
  variants?: Partial<Record<ProductVariantKey, ProductVariant>> & Record<string, ProductVariant | undefined>;
  badge?: "Premium" | "Popular" | "Bestseller" | string;
  customTag?: {
    text: string;
    color: string;
  };
  image: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  stock?: number;
  inStock?: boolean;
  description?: string;
  benefits?: string[];
  disabledVariants?: string[];
  // Teaware & Gifting metadata
  material?: string;
  capacity?: string;
  subCategory?: string;
  sku?: string;
  features?: string[];
  includes?: string[];
  subtitle?: string;
  // Availability & Soft Deletion lifecycle
  isActive?: boolean;
  isRemoved?: boolean;
  removedAt?: string | null;
};

export const AVAILABLE_BENEFITS = [
  "Immunity",
  "Relaxation",
  "Weight Management",
  "Better Focus",
  "Antioxidant Rich",
] as const;

export type BenefitOption = (typeof AVAILABLE_BENEFITS)[number];

export type AvailableVariant = {
  key: ProductVariantKey;
  weight: string;
  price: number;
  oldPrice?: number;
};

export function getProductAvailableVariants(
  product?: Product | null
): AvailableVariant[] {
  if (!product) return [];
  const list: AvailableVariant[] = [];
  if (product.variants && typeof product.variants === "object") {
    for (const key of SUPPORTED_WEIGHT_KEYS) {
      const v = product.variants[key];
      if (v && typeof v === "object" && typeof v.price === "number") {
        list.push({
          key,
          weight: v.weight || key,
          price: v.price,
          oldPrice: v.oldPrice,
        });
      }
    }
  }
  if (list.length === 0) {
    return [
      {
        key: "100g",
        weight: "100g",
        price: product?.price || 0,
        oldPrice: product?.oldPrice,
      },
    ];
  }
  return list;
}

export function calculate25gPrice(price50: number): number {
  if (!price50 || price50 <= 0) return 0;
  const half = price50 * 0.5;
  if (price50 % 10 === 9) {
    return Math.round((price50 + 1) * 0.5);
  }
  const rounded10 = Math.round(half / 10) * 10;
  if (Math.abs(rounded10 - half) <= 3) {
    return rounded10;
  }
  return Math.round(half);
}

export function calculate25gOldPrice(oldPrice50?: number): number | undefined {
  if (!oldPrice50 || oldPrice50 <= 0) return undefined;
  if (oldPrice50 % 10 === 9) {
    return Math.round((oldPrice50 + 1) * 0.5);
  }
  const half = oldPrice50 * 0.5;
  const rounded10 = Math.round(half / 10) * 10;
  if (Math.abs(rounded10 - half) <= 2) {
    return rounded10;
  }
  return Math.round(half);
}

export function getProductImages(product?: { image?: string; images?: string[] } | null): string[] {
  if (!product) return [];
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    return product.images.filter(Boolean);
  }
  if (product.image) {
    return [product.image];
  }
  return [];
}

export function isProductInStock(product?: Product | null): boolean {
  if (!product) return false;
  if (product.inStock === false) return false;
  if (typeof product.stock === "number" && product.stock <= 0) return false;
  return true;
}

export function getProductSlug(product: { id?: number | string; name: string; slug?: string }): string {
  if (product.slug) return product.slug;
  return product.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const products: Product[] = [
  {
    id: 1,
    name: "Natural Green Tea",
    category: "Green Tea",
    origin: "Darjeeling",
    caffeine: "Medium",
    weight: "100g",
    price: 699,
    oldPrice: 799,
    variants: {
      "25g": { weight: "25g", price: 150, oldPrice: 205 },
      "50g": { weight: "50g", price: 299, oldPrice: 410 },
      "100g": { weight: "100g", price: 699, oldPrice: 799 },
      "250g": { weight: "250g", price: 1549, oldPrice: 1799 },
    },
    badge: "Premium",
    benefits: ["Antioxidant Rich", "Immunity", "Better Focus"],
    image: "/leafly-green-tea.webp",
    images: [
      "/leafly-green-tea.webp",
      "/assets/products/green-tea-angle.webp",
      "/assets/products/green-tea-lifestyle.webp",
      "/assets/products/green-tea-hero.webp",
    ],
    rating: 4.9,
    reviewCount: 128,
  },
  {
    id: 2,
    name: "Golden Dusk Black Tea + Chamomile",
    category: "Black Tea",
    origin: "Darjeeling",
    caffeine: "Low",
    weight: "100g",
    price: 899,
    variants: {
      "25g": { weight: "25g", price: 95, oldPrice: 192 },
      "50g": { weight: "50g", price: 189, oldPrice: 384 },
      "100g": { weight: "100g", price: 899 },
      "250g": { weight: "250g", price: 1999, oldPrice: 2249 },
    },
    badge: "Popular",
    benefits: ["Relaxation", "Antioxidant Rich", "Immunity"],
    image: "/leafly-white-tea.webp",
    images: [
      "/leafly-white-tea.webp",
      "/assets/products/white-tea-angle.webp",
      "/assets/products/white-tea-lifestyle.webp",
      "/assets/products/white-tea-hero.webp",
    ],
    rating: 4.8,
    reviewCount: 94,
  },
  {
    id: 3,
    name: "Premium Oolong Black Tea",
    category: "Oolong Tea",
    origin: "Darjeeling",
    caffeine: "High",
    weight: "100g",
    price: 749,
    oldPrice: 849,
    variants: {
      "25g": { weight: "25g", price: 200, oldPrice: 250 },
      "50g": { weight: "50g", price: 399, oldPrice: 499 },
      "100g": { weight: "100g", price: 749, oldPrice: 849 },
      "250g": { weight: "250g", price: 1649, oldPrice: 1899 },
    },
    badge: "Bestseller",
    benefits: ["Better Focus", "Antioxidant Rich"],
    image: "/leafly-black-tea.webp",
    images: [
      "/leafly-black-tea.webp",
      "/assets/products/black-tea-angle.webp",
      "/assets/products/black-tea-lifestyle.webp",
      "/assets/products/black-tea-hero.webp",
    ],
    rating: 5.0,
    reviewCount: 216,
  },
  {
    id: 4,
    name: "Red Oolong Tea",
    category: "Oolong Tea",
    origin: "Darjeeling",
    caffeine: "Medium",
    weight: "100g",
    price: 999,
    variants: {
      "25g": { weight: "25g", price: 300, oldPrice: 350 },
      "50g": { weight: "50g", price: 599, oldPrice: 700 },
      "100g": { weight: "100g", price: 999 },
      "250g": { weight: "250g", price: 2199, oldPrice: 2499 },
    },
    badge: "Premium",
    benefits: ["Weight Management", "Relaxation", "Antioxidant Rich"],
    image: "/leafly-oolong-tea.webp",
    images: [
      "/leafly-oolong-tea.webp",
      "/assets/products/oolong-tea-angle.webp",
      "/assets/products/oolong-tea-lifestyle.webp",
      "/assets/products/oolong-tea-hero.webp",
    ],
    rating: 4.9,
    reviewCount: 82,
  },

  // ==========================================
  // TEAWARE PRODUCTS (category = "teaware")
  // ==========================================
  {
    id: 101,
    name: "Leafly Tea Storage Canister",
    category: "teaware",
    subCategory: "Storage & Accessories",
    material: "UV-Shield Stainless Steel",
    capacity: "150g Storage",
    price: 799,
    oldPrice: 949,
    sku: "LF-TW-101",
    origin: "UV-Shield Stainless Steel",
    caffeine: "None",
    weight: "150g Storage",
    rating: 4.9,
    reviewCount: 38,
    badge: "Popular",
    image: storageCanisterImg,
    description: "Double-lidded airtight stainless steel canister engineered to protect high-mountain tea leaves from light, oxygen, and moisture, locking in volatile aromatic oils for long-lasting freshness.",
    features: [
      "Double-lidded airtight seal keeps out humidity and odors",
      "100% opaque UV-barrier prevents light degradation",
      "Food-safe, odor-neutral stainless steel interior",
      "Matte forest finish with subtle gold Leafly emblem",
    ],
    stock: 10,
    inStock: true,
  },
  {
    id: 102,
    name: "Bamboo Tea Serving Tray",
    category: "teaware",
    subCategory: "Serving & Trays",
    material: "Organic Solid Bamboo",
    capacity: "Gongfu Tea Ritual Size",
    price: 1299,
    oldPrice: 1499,
    sku: "LF-TW-102",
    origin: "Organic Solid Bamboo",
    caffeine: "None",
    weight: "Gongfu Size",
    rating: 4.8,
    reviewCount: 24,
    badge: "Premium",
    image: bambooTeaTrayImg,
    description: "Handcrafted natural bamboo serving tray featuring an integrated water drainage slot and catch basin, designed for clean and meditative Gongfu tea rituals and everyday tabletop elegance.",
    features: [
      "Slotted bamboo drainage deck with removable wastewater tray",
      "Treated with food-safe water-resistant natural plant oil",
      "Smooth rounded edges and non-slip silicone base feet",
      "Accommodates teapot, aroma pitcher, and 4 tasting cups",
    ],
    stock: 10,
    inStock: true,
  },
  {
    id: 103,
    name: "Glass Tea Infuser Pot",
    category: "teaware",
    subCategory: "Teapots",
    material: "Thermal Borosilicate Glass",
    capacity: "650ml (3-4 cups)",
    price: 1699,
    oldPrice: 1999,
    sku: "LF-TW-103",
    origin: "Thermal Borosilicate Glass",
    caffeine: "None",
    weight: "650ml",
    rating: 4.9,
    reviewCount: 84,
    badge: "Bestseller",
    image: glassInfuserTeapotImg,
    description: "High-grade borosilicate glass teapot equipped with an ultra-fine removable coil infuser in the spout, allowing whole orthodox leaves maximum room to unfurl and circulate freely.",
    features: [
      "Thermal shock resistant from -20°C to 150°C",
      "Precision non-drip pour spout with stainless leaf filter",
      "Crystal-clear optical transparency showcases liquor hue",
      "Stovetop safe on low flame and induction warmers",
    ],
    stock: 10,
    inStock: true,
  },
  {
    id: 104,
    name: "Leafly Tea Cup & Saucer Set",
    category: "teaware",
    subCategory: "Tea Cups",
    material: "High-Fired Glazed Ceramic",
    capacity: "220ml Cup + Saucer",
    price: 899,
    oldPrice: 1099,
    sku: "LF-TW-104",
    origin: "High-Fired Glazed Ceramic",
    caffeine: "None",
    weight: "220ml",
    rating: 4.8,
    reviewCount: 46,
    badge: "Popular",
    image: cupSaucerImg,
    description: "Artisan glazed ceramic cup and matching saucer with delicate gold rim detailing. The gently flared lip aerates hot liquor, accentuating floral, honeyed, and muscatel top notes.",
    features: [
      "Silky mineral food glaze prevents flavor or tannin absorption",
      "Weighted ergonomic handle for stable, balanced grip",
      "Thick ceramic walls maintain optimal sipping temperature",
      "Microwave and dishwasher safe",
    ],
    stock: 10,
    inStock: true,
  },
  {
    id: 105,
    name: "Blooming Tea Glass Teapot",
    category: "teaware",
    subCategory: "Teapots",
    material: "Mouth-Blown Borosilicate Glass",
    capacity: "800ml (4-5 cups)",
    price: 1899,
    oldPrice: 2199,
    sku: "LF-TW-105",
    origin: "Mouth-Blown Borosilicate Glass",
    caffeine: "None",
    weight: "800ml",
    rating: 5.0,
    reviewCount: 62,
    badge: "Premium",
    image: bloomingTeaImg,
    description: "Spherical crystal-clear glass teapot designed especially to celebrate blooming flower teas, artisan tea spheres, and expansive white peony leaves with full 360-degree visual theatre.",
    features: [
      "Extra-wide rounded globe bowl allows flowers to blossom fully",
      "Integrated micro-slotted glass lid filter",
      "Lightweight yet structurally reinforced borosilicate",
      "Heat-resistant glass handle stays cool during pouring",
    ],
    stock: 10,
    inStock: true,
  },
  {
    id: 106,
    name: "Double-Wall Glass Tea Cup",
    category: "teaware",
    subCategory: "Tea Cups",
    material: "Double-Walled Thermal Glass",
    capacity: "200ml (Set of 2)",
    price: 649,
    oldPrice: 799,
    sku: "LF-TW-106",
    origin: "Double-Walled Thermal Glass",
    caffeine: "None",
    weight: "Set of 2",
    rating: 4.9,
    reviewCount: 94,
    badge: "Bestseller",
    image: glassCupImg,
    description: "Suspended thermal double-wall glass structure keeps brewed tea piping hot inside while remaining comfortably cool to the touch on the exterior, with zero condensation rings.",
    features: [
      "Vacuum-insulated double layer eliminates sweat and heat transfer",
      "Smooth contoured sipping rim for a velvet mouthfeel",
      "Optical floating effect displays rich tea liquor colors",
      "Lead-free, BPA-free laboratory-grade glass",
    ],
    stock: 10,
    inStock: true,
  },
  {
    id: 107,
    name: "Marble Finish Tea Pot",
    category: "teaware",
    subCategory: "Teapots",
    material: "High-Fired Stoneware & Marble Glaze",
    capacity: "550ml",
    price: 2199,
    oldPrice: 2499,
    sku: "LF-TW-107",
    origin: "High-Fired Stoneware",
    caffeine: "None",
    weight: "550ml",
    rating: 4.9,
    reviewCount: 32,
    badge: "Premium",
    image: marbleTeapotImg,
    description: "Handcrafted stoneware teapot finished in a serene natural marble-veined glaze. Superior heat retention makes it the perfect vessel for full-bodied black teas and artisanal oolongs.",
    features: [
      "Dense stoneware walls retain steady brewing temperature",
      "Built-in multi-hole ceramic filter inside the spout base",
      "Hand-applied unique marble veining on every single piece",
      "Includes bamboo resting coaster",
    ],
    stock: 10,
    inStock: true,
  },
  {
    id: 108,
    name: "Premium Glass Tea Pot",
    category: "teaware",
    subCategory: "Teapots",
    material: "Mouth-Blown Borosilicate Glass",
    capacity: "750ml (3-4 cups)",
    price: 1999,
    oldPrice: 2299,
    sku: "LF-TW-108",
    origin: "Mouth-Blown Borosilicate Glass",
    caffeine: "None",
    weight: "750ml",
    rating: 4.9,
    reviewCount: 78,
    badge: "Bestseller",
    image: glassTeapotImg,
    description: "A contemporary classic teapot featuring an extra-large laser-perforated stainless steel infuser basket, allowing whole single-estate leaves plenty of space for balanced extraction.",
    features: [
      "Extra-deep 304 stainless steel micro-infuser basket",
      "Precision curved goose-style spout for drip-free pouring",
      "Wide flat base ensures stability on desks and tea trays",
      "Lid locks snugly in place even during full 90-degree tilts",
    ],
    stock: 10,
    inStock: true,
  },

  // ==========================================
  // GIFTING PRODUCTS (category = "gifting")
  // ==========================================
  {
    id: 201,
    name: "The Royal Flush Heritage Box",
    category: "gifting",
    subCategory: "Luxury Gift Sets",
    subtitle: "Darjeeling First Flush, Nilgiri White Needle & Brass Infuser",
    price: 2499,
    sku: "LF-GF-201",
    origin: "Darjeeling & Nilgiri Estates",
    caffeine: "Varied",
    weight: "Gift Box",
    badge: "MOST POPULAR",
    image: giftImage3,
    includes: [
      "1x Darjeeling First Flush (50g)",
      "1x Nilgiri White Needle (50g)",
      "Handmade Brass Scoop",
      "Artisan Keepsake Box",
    ],
    stock: 10,
    inStock: true,
    description: "Curated royal tea chest featuring prime Darjeeling first flush harvests and heirloom ritual brewing brassware in an embossed gold foil chest.",
  },
  {
    id: 202,
    name: "The Morning Tranquility Ensemble",
    category: "gifting",
    subCategory: "Luxury Gift Sets",
    subtitle: "Darjeeling Golden Tips, Pure Blossom Honey & Ceramic Cup",
    price: 1899,
    sku: "LF-GF-202",
    origin: "Darjeeling Single-Estates",
    caffeine: "Varied",
    weight: "Gift Box",
    badge: "BEST FOR MORNINGS",
    image: giftImage2,
    includes: [
      "1x Darjeeling Golden Reserve (100g)",
      "Wild Forest Blossom Honey (150g)",
      "Hand-thrown Terracotta Tumbler",
      "Tasting Journal Booklet",
    ],
    stock: 10,
    inStock: true,
    description: "An uplifting dawn ritual pairing single-estate Darjeeling leaves with raw blossom honey and an artisanal ceramic tumbler.",
  },
  {
    id: 203,
    name: "The Grand Estate Connoisseur Hamper",
    category: "gifting",
    subCategory: "Luxury Gift Sets",
    subtitle: "Complete Terroir Flight with Handcrafted Teaware",
    price: 3899,
    sku: "LF-GF-203",
    origin: "Darjeeling High Terroirs",
    caffeine: "Varied",
    weight: "Gift Box",
    badge: "LUXURY EDITION",
    image: giftImage5,
    includes: [
      "4x Single-Estate Harvests (50g each)",
      "Double-Walled Glass Steeper",
      "Pure Sandalwood Scented Coaster",
      "Personalized Wax-Sealed Gift Card",
    ],
    stock: 10,
    inStock: true,
    description: "The definitive collector's chest containing four grand Darjeeling harvest flights alongside precision double-walled glass brewing gear.",
  },
];
