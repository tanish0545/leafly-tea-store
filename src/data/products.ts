/* ==========================================================
   LEAFLY — SHARED PRODUCT DATA
   Single source of truth used by Shop, ProductDetail, etc.
   ========================================================== */

export type TeaCategory =
  | "Green"
  | "White"
  | "Black"
  | "Oolong";

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
  category: TeaCategory;
  origin: string;
  caffeine: "Low" | "Medium" | "High";
  weight: string;
  price: number;
  oldPrice?: number;
  variants?: Partial<Record<ProductVariantKey, ProductVariant>> & Record<string, ProductVariant | undefined>;
  badge: "Premium" | "Popular" | "Bestseller" | string;
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
    name: "Himalayan Green Tea",
    category: "Green",
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
    name: "Silver Tips White Tea",
    category: "White",
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
    name: "Darjeeling First Flush",
    category: "Black",
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
    name: "Artisan Oolong",
    category: "Oolong",
    origin: "Assam",
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
  {
    id: 5,
    name: "Assam Golden Black",
    category: "Black",
    origin: "Assam",
    caffeine: "High",
    weight: "100g",
    price: 649,
    variants: {
      "25g": { weight: "25g", price: 180 },
      "50g": { weight: "50g", price: 357 },
      "100g": { weight: "100g", price: 649 },
      "250g": { weight: "250g", price: 1429, oldPrice: 1629 },
    },
    badge: "Popular",
    benefits: ["Better Focus", "Antioxidant Rich"],
    image: "/leafly-black-tea.webp",
    images: [
      "/leafly-black-tea.webp",
      "/assets/products/black-tea-angle.webp",
      "/assets/products/assam-estate.webp",
      "/assets/products/black-tea-lifestyle.webp",
    ],
    rating: 4.8,
    reviewCount: 142,
  },
  {
    id: 6,
    name: "Kashmir White Reserve",
    category: "White",
    origin: "Kashmir",
    caffeine: "Low",
    weight: "100g",
    price: 1199,
    variants: {
      "25g": { weight: "25g", price: 330 },
      "50g": { weight: "50g", price: 659 },
      "100g": { weight: "100g", price: 1199 },
      "250g": { weight: "250g", price: 2699, oldPrice: 2999 },
    },
    badge: "Premium",
    benefits: ["Relaxation", "Immunity"],
    image: "/leafly-white-tea.webp",
    images: [
      "/leafly-white-tea.webp",
      "/assets/products/white-tea-angle.webp",
      "/assets/products/morning-ritual.webp",
      "/assets/products/white-tea-hero.webp",
    ],
    rating: 4.9,
    reviewCount: 68,
  },
  {
    id: 7,
    name: "Assam Vintage Reserve",
    category: "Black",
    origin: "Assam",
    caffeine: "High",
    weight: "100g",
    price: 1099,
    variants: {
      "25g": { weight: "25g", price: 300 },
      "50g": { weight: "50g", price: 604 },
      "100g": { weight: "100g", price: 1099 },
      "250g": { weight: "250g", price: 2449, oldPrice: 2749 },
    },
    badge: "Bestseller",
    benefits: ["Better Focus", "Antioxidant Rich"],
    image: "/leafly-black-tea.webp",
    images: [
      "/leafly-black-tea.webp",
      "/assets/products/black-tea-angle.webp",
      "/assets/products/orthodox-leaf.webp",
      "/assets/products/black-tea-hero.webp",
    ],
    rating: 4.9,
    reviewCount: 175,
  },
  {
    id: 8,
    name: "Reserve Oolong",
    category: "Oolong",
    origin: "Darjeeling",
    caffeine: "Medium",
    weight: "100g",
    price: 1299,
    oldPrice: 1499,
    variants: {
      "25g": { weight: "25g", price: 360, oldPrice: 410 },
      "50g": { weight: "50g", price: 714, oldPrice: 824 },
      "100g": { weight: "100g", price: 1299, oldPrice: 1499 },
      "250g": { weight: "250g", price: 2899, oldPrice: 3299 },
    },
    badge: "Premium",
    benefits: ["Relaxation", "Weight Management", "Antioxidant Rich"],
    image: "/leafly-oolong-tea.webp",
    images: [
      "/leafly-oolong-tea.webp",
      "/assets/products/oolong-tea-angle.webp",
      "/assets/products/oolong-tea-hero.webp",
      "/assets/products/oolong-tea-lifestyle.webp",
    ],
    rating: 5.0,
    reviewCount: 91,
  },
];
