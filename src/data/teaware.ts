/* ==========================================================
   LEAFLY — TEAWARE PRODUCT DATA
   Curated tea brewing vessels, accessories, and serving sets.
   Uses the 8 official Leafly teaware image assets.
   ========================================================== */

import storageCanisterImg from "../assets/teaware-storage-canister.webp";
import bambooTeaTrayImg from "../assets/bamboo-tea-tray.webp";
import glassInfuserTeapotImg from "../assets/glass-infuser-teapot.webp";
import cupSaucerImg from "../assets/teaware-cup-saucer.webp";
import bloomingTeaImg from "../assets/teaware-blooming-tea.webp";
import glassCupImg from "../assets/teaware-glass-cup.webp";
import marbleTeapotImg from "../assets/teaware-marble-teapot.webp";
import glassTeapotImg from "../assets/teaware-glass-teapot.webp";

export type TeawareCategory =
  | "Teapots"
  | "Tea Cups"
  | "Serving & Trays"
  | "Storage & Accessories";

export type TeawareItem = {
  id: number;
  name: string;
  category: TeawareCategory;
  material: string;
  capacity?: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  image: string;
  description: string;
  features: string[];
  stock?: number;
  inStock?: boolean;
};

export const teawareProducts: TeawareItem[] = [
  {
    id: 101,
    name: "Leafly Tea Storage Canister",
    category: "Storage & Accessories",
    material: "UV-Shield Stainless Steel",
    capacity: "150g Storage",
    price: 799,
    oldPrice: 949,
    rating: 4.9,
    reviewCount: 38,
    badge: "Popular",
    image: storageCanisterImg,
    description: "Double-lidded airtight stainless steel canister engineered to protect high-mountain tea leaves from light, oxygen, and moisture, locking in volatile aromatic oils for long-lasting freshness.",
    features: [
      "Double-lidded airtight seal keeps out humidity and odors",
      "100% opaque UV-barrier prevents light degradation",
      "Food-safe, odor-neutral stainless steel interior",
      "Matte forest finish with subtle gold Leafly emblem"
    ],
    stock: 10,
    inStock: true
  },
  {
    id: 102,
    name: "Bamboo Tea Serving Tray",
    category: "Serving & Trays",
    material: "Organic Solid Bamboo",
    capacity: "Gongfu Tea Ritual Size",
    price: 1299,
    oldPrice: 1499,
    rating: 4.8,
    reviewCount: 24,
    badge: "Premium",
    image: bambooTeaTrayImg,
    description: "Handcrafted natural bamboo serving tray featuring an integrated water drainage slot and catch basin, designed for clean and meditative Gongfu tea rituals and everyday tabletop elegance.",
    features: [
      "Slotted bamboo drainage deck with removable wastewater tray",
      "Treated with food-safe water-resistant natural plant oil",
      "Smooth rounded edges and non-slip silicone base feet",
      "Accommodates teapot, aroma pitcher, and 4 tasting cups"
    ],
    stock: 10,
    inStock: true
  },
  {
    id: 103,
    name: "Glass Tea Infuser Pot",
    category: "Teapots",
    material: "Thermal Borosilicate Glass",
    capacity: "650ml (3-4 cups)",
    price: 1699,
    oldPrice: 1999,
    rating: 4.9,
    reviewCount: 84,
    badge: "Bestseller",
    image: glassInfuserTeapotImg,
    description: "High-grade borosilicate glass teapot equipped with an ultra-fine removable coil infuser in the spout, allowing whole orthodox leaves maximum room to unfurl and circulate freely.",
    features: [
      "Thermal shock resistant from -20°C to 150°C",
      "Precision non-drip pour spout with stainless leaf filter",
      "Crystal-clear optical transparency showcases liquor hue",
      "Stovetop safe on low flame and induction warmers"
    ],
    stock: 10,
    inStock: true
  },
  {
    id: 104,
    name: "Leafly Tea Cup & Saucer Set",
    category: "Tea Cups",
    material: "High-Fired Glazed Ceramic",
    capacity: "220ml Cup + Saucer",
    price: 899,
    oldPrice: 1099,
    rating: 4.8,
    reviewCount: 46,
    badge: "Popular",
    image: cupSaucerImg,
    description: "Artisan glazed ceramic cup and matching saucer with delicate gold rim detailing. The gently flared lip aerates hot liquor, accentuating floral, honeyed, and muscatel top notes.",
    features: [
      "Silky mineral food glaze prevents flavor or tannin absorption",
      "Weighted ergonomic handle for stable, balanced grip",
      "Thick ceramic walls maintain optimal sipping temperature",
      "Microwave and dishwasher safe"
    ],
    stock: 10,
    inStock: true
  },
  {
    id: 105,
    name: "Blooming Tea Glass Teapot",
    category: "Teapots",
    material: "Mouth-Blown Borosilicate Glass",
    capacity: "800ml (4-5 cups)",
    price: 1899,
    oldPrice: 2199,
    rating: 5.0,
    reviewCount: 62,
    badge: "Premium",
    image: bloomingTeaImg,
    description: "Spherical crystal-clear glass teapot designed especially to celebrate blooming flower teas, artisan tea spheres, and expansive white peony leaves with full 360-degree visual theatre.",
    features: [
      "Extra-wide rounded globe bowl allows flowers to blossom fully",
      "Integrated micro-slotted glass lid filter",
      "Lightweight yet structurally reinforced borosilicate",
      "Heat-resistant glass handle stays cool during pouring"
    ],
    stock: 10,
    inStock: true
  },
  {
    id: 106,
    name: "Double-Wall Glass Tea Cup",
    category: "Tea Cups",
    material: "Double-Walled Thermal Glass",
    capacity: "200ml (Set of 2)",
    price: 649,
    oldPrice: 799,
    rating: 4.9,
    reviewCount: 94,
    badge: "Bestseller",
    image: glassCupImg,
    description: "Suspended thermal double-wall glass structure keeps brewed tea piping hot inside while remaining comfortably cool to the touch on the exterior, with zero condensation rings.",
    features: [
      "Vacuum-insulated double layer eliminates sweat and heat transfer",
      "Smooth contoured sipping rim for a velvet mouthfeel",
      "Optical floating effect displays rich tea liquor colors",
      "Lead-free, BPA-free laboratory-grade glass"
    ],
    stock: 10,
    inStock: true
  },
  {
    id: 107,
    name: "Marble Finish Tea Pot",
    category: "Teapots",
    material: "High-Fired Stoneware & Marble Glaze",
    capacity: "550ml",
    price: 2199,
    oldPrice: 2499,
    rating: 4.9,
    reviewCount: 32,
    badge: "Premium",
    image: marbleTeapotImg,
    description: "Handcrafted stoneware teapot finished in a serene natural marble-veined glaze. Superior heat retention makes it the perfect vessel for full-bodied black teas and artisanal oolongs.",
    features: [
      "Dense stoneware walls retain steady brewing temperature",
      "Built-in multi-hole ceramic filter inside the spout base",
      "Hand-applied unique marble veining on every single piece",
      "Includes bamboo resting coaster"
    ],
    stock: 10,
    inStock: true
  },
  {
    id: 108,
    name: "Premium Glass Tea Pot",
    category: "Teapots",
    material: "Mouth-Blown Borosilicate Glass",
    capacity: "750ml (3-4 cups)",
    price: 1999,
    oldPrice: 2299,
    rating: 4.9,
    reviewCount: 78,
    badge: "Bestseller",
    image: glassTeapotImg,
    description: "A contemporary classic teapot featuring an extra-large laser-perforated stainless steel infuser basket, allowing whole single-estate leaves plenty of space for balanced extraction.",
    features: [
      "Extra-deep 304 stainless steel micro-infuser basket",
      "Precision curved goose-style spout for drip-free pouring",
      "Wide flat base ensures stability on desks and tea trays",
      "Lid locks snugly in place even during full 90-degree tilts"
    ],
    stock: 10,
    inStock: true
  }
];
