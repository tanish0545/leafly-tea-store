import image2 from "../assets/image2.webp";
import image3 from "../assets/image3.webp";
import image5 from "../assets/image5.webp";

export type GiftHamper = {
  id: number;
  name: string;
  subtitle: string;
  price: number;
  image: string;
  includes: string[];
  badge?: string;
};

export const giftHampers: GiftHamper[] = [
  {
    id: 101,
    name: "The Royal Flush Heritage Box",
    subtitle: "Darjeeling First Flush, Nilgiri White Needle & Brass Infuser",
    price: 2499,
    image: image3,
    includes: ["1x Darjeeling First Flush (50g)", "1x Nilgiri White Needle (50g)", "Handmade Brass Scoop", "Artisan Keepsake Box"],
    badge: "MOST POPULAR",
  },
  {
    id: 102,
    name: "The Morning Tranquility Ensemble",
    subtitle: "Assam Orthodox Golden Tips, Pure Honey & Ceramic Cup",
    price: 1899,
    image: image2,
    includes: ["1x Assam Orthodox Reserve (100g)", "Wild Forest Blossom Honey (150g)", "Hand-thrown Terracotta Tumbler", "Tasting Journal Booklet"],
    badge: "BEST FOR MORNINGS",
  },
  {
    id: 103,
    name: "The Grand Estate Connoisseur Hamper",
    subtitle: "Complete 4-Region Flight with Handcrafted Teaware",
    price: 3899,
    image: image5,
    includes: ["4x Single-Estate Harvests (50g each)", "Double-Walled Glass Steeper", "Pure Sandalwood Scented Coaster", "Personalized Wax-Sealed Gift Card"],
    badge: "LUXURY EDITION",
  },
];
