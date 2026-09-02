/* ==========================================================
   LEAFLY — SHARED PRODUCT DATA
   Single source of truth used by Shop, ProductDetail, etc.
   ========================================================== */

export type TeaCategory =
  | "Green"
  | "White"
  | "Black"
  | "Oolong";

export type ProductVariantKey = "100g" | "250g";

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
  variants: {
    "100g": ProductVariant;
    "250g": ProductVariant;
    [key: string]: ProductVariant | undefined;
  };
  badge: "Premium" | "Popular" | "Bestseller" | string;
  customTag?: {
    text: string;
    color: string;
  };
  image: string;
  rating?: number;
  reviewCount?: number;
  stock?: number;
  inStock?: boolean;
  description?: string;
};

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
      "100g": { weight: "100g", price: 699, oldPrice: 799 },
      "250g": { weight: "250g", price: 1549, oldPrice: 1799 },
    },
    badge: "Premium",
    image: "/leafly-green-tea.webp",
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
      "100g": { weight: "100g", price: 899 },
      "250g": { weight: "250g", price: 1999, oldPrice: 2249 },
    },
    badge: "Popular",
    image: "/leafly-white-tea.webp",
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
      "100g": { weight: "100g", price: 749, oldPrice: 849 },
      "250g": { weight: "250g", price: 1649, oldPrice: 1899 },
    },
    badge: "Bestseller",
    image: "/leafly-black-tea.webp",
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
      "100g": { weight: "100g", price: 999 },
      "250g": { weight: "250g", price: 2199, oldPrice: 2499 },
    },
    badge: "Premium",
    image: "/leafly-oolong-tea.webp",
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
      "100g": { weight: "100g", price: 649 },
      "250g": { weight: "250g", price: 1429, oldPrice: 1629 },
    },
    badge: "Popular",
    image: "/leafly-black-tea.webp",
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
      "100g": { weight: "100g", price: 1199 },
      "250g": { weight: "250g", price: 2699, oldPrice: 2999 },
    },
    badge: "Premium",
    image: "/leafly-white-tea.webp",
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
      "100g": { weight: "100g", price: 1099 },
      "250g": { weight: "250g", price: 2449, oldPrice: 2749 },
    },
    badge: "Bestseller",
    image: "/leafly-black-tea.webp",
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
      "100g": { weight: "100g", price: 1299, oldPrice: 1499 },
      "250g": { weight: "250g", price: 2899, oldPrice: 3299 },
    },
    badge: "Premium",
    image: "/leafly-oolong-tea.webp",
    rating: 5.0,
    reviewCount: 91,
  },
];
