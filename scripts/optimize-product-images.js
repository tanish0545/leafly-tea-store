import fs from "fs";
import path from "path";
import sharp from "sharp";

const srcDir = "C:/Users/tanis/.gemini/antigravity-ide/brain/244bb055-1257-4ef2-b8ef-721a77d6112e";
const targetDir = path.resolve("public/assets/products");

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const fileMap = {
  "green-tea-angle.webp": "green_tea_angle_1788627464853.jpg",
  "green-tea-lifestyle.webp": "green_tea_lifestyle_1788627065013.jpg",
  "green-tea-hero.webp": "green_tea_hero_1788627641503.jpg",

  "white-tea-angle.webp": "white_tea_angle_1788627673637.jpg",
  "white-tea-lifestyle.webp": "white_tea_lifestyle_1788627697898.jpg",
  "white-tea-hero.webp": "white_tea_hero_1788628043704.jpg",

  "black-tea-angle.webp": "black_tea_angle_1788627917808.jpg",
  "black-tea-lifestyle.webp": "black_tea_lifestyle_1788627944677.jpg",
  "black-tea-hero.webp": "black_tea_hero_1788628079718.jpg",

  "oolong-tea-angle.webp": "oolong_tea_angle_1788627977804.jpg",
  "oolong-tea-lifestyle.webp": "oolong_tea_lifestyle_1788628002850.jpg",
  "oolong-tea-hero.webp": "oolong_tea_hero_1788628120733.jpg",
};

async function processImages() {
  console.log("Optimizing product images into", targetDir);
  for (const [targetName, srcName] of Object.entries(fileMap)) {
    const srcPath = path.join(srcDir, srcName);
    const destPath = path.join(targetDir, targetName);
    if (fs.existsSync(srcPath)) {
      await sharp(srcPath)
        .resize(1200, 900, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 86 })
        .toFile(destPath);
      const stats = fs.statSync(destPath);
      console.log(`✓ ${targetName} (${Math.round(stats.size / 1024)} KB)`);
    } else {
      console.warn(`Source missing: ${srcPath}`);
    }
  }
  console.log("All product images processed successfully!");
}

processImages().catch(console.error);
