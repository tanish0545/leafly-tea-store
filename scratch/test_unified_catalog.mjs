import { products, calculate25gPrice } from "../src/data/products.ts";
import { teawareProducts } from "../src/data/teaware.ts";
import { giftHampers } from "../src/data/gifting.ts";

console.log("=== LEAFLY TEST SUITE: UNIFIED ARCHITECTURE & DARJEELING PURITY ===");

// 1. Verify 4 Core Tea Products
const teaProducts = products.filter(p => p.category !== "teaware" && p.category !== "gifting");
console.log(`\n1. Verifying Tea Products (Count: ${teaProducts.length}):`);
if (teaProducts.length !== 4) {
  throw new Error(`Expected exactly 4 tea products, found ${teaProducts.length}`);
}

for (const tea of teaProducts) {
  console.log(` - [ID ${tea.id}] ${tea.name} | Category: ${tea.category} | Origin: ${tea.origin}`);
  if (tea.origin !== "Darjeeling") {
    throw new Error(`Product ${tea.name} has invalid origin "${tea.origin}". Must be "Darjeeling"!`);
  }
  if (!tea.variants?.["25g"] || !tea.variants?.["50g"] || !tea.variants?.["100g"] || !tea.variants?.["250g"]) {
    throw new Error(`Product ${tea.name} missing weight variant keys`);
  }
}
console.log("✓ All 4 tea products strictly preserved with 100% Darjeeling origin and complete variants.");

// 2. Verify Teaware in Catalog
const catalogTeaware = products.filter(p => p.category === "teaware");
console.log(`\n2. Verifying Teaware in products catalog (Count: ${catalogTeaware.length}):`);
if (catalogTeaware.length !== 8) {
  throw new Error(`Expected 8 teaware products in products, found ${catalogTeaware.length}`);
}
for (const tw of catalogTeaware) {
  console.log(` - [ID ${tw.id}] ${tw.name} | Price: ₹${tw.price} | Stock: ${tw.stock} | Material: ${tw.material}`);
  if (tw.category !== "teaware") {
    throw new Error(`Teaware item ${tw.name} has incorrect category: ${tw.category}`);
  }
  if (!tw.material) {
    throw new Error(`Teaware item ${tw.name} missing material`);
  }
}
console.log("✓ All 8 teaware products registered in products with category 'teaware'.");

// 3. Verify Gifting Hampers in Catalog
const catalogGifting = products.filter(p => p.category === "gifting");
console.log(`\n3. Verifying Gifting Hampers in products catalog (Count: ${catalogGifting.length}):`);
if (catalogGifting.length !== 3) {
  throw new Error(`Expected 3 gifting hampers in products, found ${catalogGifting.length}`);
}
for (const gh of catalogGifting) {
  console.log(` - [ID ${gh.id}] ${gh.name} | Price: ₹${gh.price} | Includes: ${gh.includes?.length} items`);
  if (gh.category !== "gifting") {
    throw new Error(`Hamper ${gh.name} has incorrect category: ${gh.category}`);
  }
  if (!gh.includes || gh.includes.length === 0) {
    throw new Error(`Hamper ${gh.name} missing includes list`);
  }
}
console.log("✓ All 3 gifting hampers registered in products with category 'gifting'.");

// 4. Simulate Mixed Cart & Order Creation
console.log("\n4. Simulating Mixed Cart (Tea + Teaware + Gifting):");
const simulatedCart = [
  {
    product: teaProducts[0],
    variant: "100g",
    weight: "100g",
    price: teaProducts[0].variants["100g"].price,
    quantity: 2,
    id: `tea-${teaProducts[0].id}-100g`,
  },
  {
    product: catalogTeaware[0],
    variant: catalogTeaware[0].capacity || "Standard",
    weight: catalogTeaware[0].capacity || "1 Unit",
    price: catalogTeaware[0].price,
    quantity: 1,
    id: `tw-${catalogTeaware[0].id}`,
  },
  {
    product: catalogGifting[0],
    variant: "Gift Box",
    weight: "Gift Box",
    price: catalogGifting[0].price,
    quantity: 1,
    id: `gh-${catalogGifting[0].id}-Gift Box`,
  },
];

const subtotal = simulatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
console.log(` - Cart item count: ${simulatedCart.length} lines, ${simulatedCart.reduce((s, i) => s + i.quantity, 0)} units`);
console.log(` - Cart subtotal: ₹${subtotal}`);

const orderItems = simulatedCart.map(item => ({
  id: item.id,
  productId: item.product.id,
  name: item.product.name,
  variant: item.variant,
  weight: item.weight,
  image: item.product.image,
  price: item.price,
  quantity: item.quantity,
  category: item.product.category,
}));

console.log("\n5. Order Items Category Attribution Check:");
for (const item of orderItems) {
  console.log(` - Item: "${item.name}" -> Category: "${item.category}" (Qty: ${item.quantity}, Price: ₹${item.price})`);
  if (!item.category) {
    throw new Error(`Order item ${item.name} missing category!`);
  }
}

const categoriesPresent = new Set(orderItems.map(i => i.category));
if (!categoriesPresent.has("Green Tea") && !categoriesPresent.has("tea") && !categoriesPresent.has("Black Tea")) {
  throw new Error("Tea category missing in order");
}
if (!categoriesPresent.has("teaware")) {
  throw new Error("teaware category missing in order");
}
if (!categoriesPresent.has("gifting")) {
  throw new Error("gifting category missing in order");
}

console.log("\n✓ ALL CRITICAL CHECKS PASSED: Tea (Darjeeling), Teaware, and Gifting operate seamlessly on unified architecture!");
