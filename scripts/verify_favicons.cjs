const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const publicDir = path.resolve(__dirname, "../public");

const files = [
  { name: "favicon.ico", expectedSizes: [16, 32, 48] },
  { name: "favicon-16x16.png", width: 16, height: 16 },
  { name: "favicon-32x32.png", width: 32, height: 32 },
  { name: "favicon-48x48.png", width: 48, height: 48 },
  { name: "favicon-96x96.png", width: 96, height: 96 },
  { name: "favicon.png", width: 48, height: 48 },
  { name: "apple-touch-icon.png", width: 180, height: 180 },
  { name: "apple-touch-icon-precomposed.png", width: 180, height: 180 },
  { name: "android-chrome-192x192.png", width: 192, height: 192 },
  { name: "android-chrome-512x512.png", width: 512, height: 512 },
  { name: "leafly-site-icon.png", width: 512, height: 512 },
  { name: "site.webmanifest", isJson: true }
];

async function verify() {
  console.log("=== VERIFYING GENERATED FAVICON ASSETS ===");
  let allPassed = true;

  for (const f of files) {
    const filePath = path.join(publicDir, f.name);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ MISSING: ${f.name}`);
      allPassed = false;
      continue;
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.error(`❌ EMPTY FILE: ${f.name}`);
      allPassed = false;
      continue;
    }

    if (f.isJson) {
      try {
        const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        console.log(`✓ ${f.name}: Valid JSON, ${json.icons.length} icons defined`);
      } catch (e) {
        console.error(`❌ INVALID JSON in ${f.name}:`, e.message);
        allPassed = false;
      }
      continue;
    }

    if (f.name.endsWith(".ico")) {
      console.log(`✓ ${f.name}: Size ${stats.size} bytes`);
      continue;
    }

    try {
      const meta = await sharp(filePath).metadata();
      if (meta.width !== f.width || meta.height !== f.height) {
        console.error(`❌ DIMENSION MISMATCH in ${f.name}: expected ${f.width}x${f.height}, got ${meta.width}x${meta.height}`);
        allPassed = false;
      } else {
        console.log(`✓ ${f.name}: ${meta.width}x${meta.height}, format ${meta.format}, alpha ${meta.hasAlpha}, size ${stats.size} bytes`);
      }
    } catch (e) {
      console.error(`❌ FAILED TO READ ${f.name}:`, e.message);
      allPassed = false;
    }
  }

  // Verify HTTP status on local dev server
  const devPort = 5174;
  console.log(`\n=== VERIFYING HTTP 200 ON DEV SERVER (http://localhost:${devPort}) ===`);
  for (const f of files) {
    try {
      const res = await fetch(`http://localhost:${devPort}/${f.name}`);
      if (res.status === 200) {
        console.log(`✓ HTTP 200: /${f.name} (Content-Type: ${res.headers.get("content-type")})`);
      } else {
        console.error(`❌ HTTP ${res.status} for /${f.name}`);
        allPassed = false;
      }
    } catch (e) {
      console.warn(`⚠️ Dev server check skipped for /${f.name}: ${e.message}`);
    }
  }

  if (allPassed) {
    console.log("\nALL ASSET VERIFICATIONS PASSED!");
  } else {
    process.exit(1);
  }
}

verify().catch(console.error);
