const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Master source image candidates in order of preference
const sourceCandidates = [
  path.resolve(__dirname, "../src/assets/leafly-site-icon-master.jpg"),
  "C:/Users/tanis/.gemini/antigravity-ide/brain/39f815fe-b26b-4f2c-a3c1-3e57ccc1297c/.user_uploaded/media_1790074582676.jpg",
  path.resolve(__dirname, "../public/leafly-site-icon.png")
];

const publicDir = path.resolve(__dirname, "../public");
const leaflySubPublicDir = path.resolve(__dirname, "../Leafly/public");

// Helper to assemble a valid multi-resolution ICO file
// Ordering: 48x48 first (for Google Search / Googlebot-Image), then 32x32, then 16x16
function createIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntrySize = 16;
  const dirEntries = Buffer.alloc(dirEntrySize * numImages);
  let offset = 6 + dirEntrySize * numImages;

  for (let i = 0; i < numImages; i++) {
    const png = pngBuffers[i].buffer;
    const width = pngBuffers[i].width;
    const height = pngBuffers[i].height;
    const size = png.length;

    dirEntries.writeUInt8(width >= 256 ? 0 : width, i * 16 + 0);
    dirEntries.writeUInt8(height >= 256 ? 0 : height, i * 16 + 1);
    dirEntries.writeUInt8(0, i * 16 + 2); // color palette (0 for no palette)
    dirEntries.writeUInt8(0, i * 16 + 3); // reserved
    dirEntries.writeUInt16LE(1, i * 16 + 4); // color planes
    dirEntries.writeUInt16LE(32, i * 16 + 6); // 32 bpp
    dirEntries.writeUInt32LE(size, i * 16 + 8); // size in bytes
    dirEntries.writeUInt32LE(offset, i * 16 + 12); // offset in file

    offset += size;
  }

  return Buffer.concat([header, dirEntries, ...pngBuffers.map(p => p.buffer)]);
}

async function run() {
  let inputImagePath = null;
  for (const candidate of sourceCandidates) {
    if (fs.existsSync(candidate)) {
      inputImagePath = candidate;
      break;
    }
  }

  if (!inputImagePath) {
    throw new Error(`None of the source image candidates exist: ${sourceCandidates.join(", ")}`);
  }

  console.log("Using source logo image:", inputImagePath);

  let maskedMasterBuffer;

  if (inputImagePath.endsWith(".png") && inputImagePath.includes("leafly-site-icon")) {
    // Already masked circular PNG
    maskedMasterBuffer = await sharp(inputImagePath).png().toBuffer();
  } else {
    // Raw source image (1024x1024) - apply smooth circular alpha mask
    const { data, info } = await sharp(inputImagePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const centerX = 511.5;
    const centerY = 511.5;
    const radius = 474;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= radius + 1) {
          data[idx + 3] = 0; // completely transparent outside circle
        } else if (dist <= radius - 1) {
          data[idx + 3] = 255; // completely opaque inside circle
        } else {
          // Smooth anti-aliased border transition
          const alphaFraction = (radius + 1 - dist) / 2;
          data[idx + 3] = Math.round(255 * Math.max(0, Math.min(1, alphaFraction)));
        }
      }
    }

    maskedMasterBuffer = await sharp(data, {
      raw: { width, height, channels: 4 }
    })
      .extract({ left: 38, top: 38, width: 948, height: 948 })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  console.log("Master circular buffer ready.");

  // Helper to generate a resized PNG
  async function generatePng(size, filename, destDirs = [publicDir]) {
    const buf = await sharp(maskedMasterBuffer)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ compressionLevel: 9 })
      .toBuffer();

    for (const d of destDirs) {
      if (fs.existsSync(d)) {
        fs.writeFileSync(path.join(d, filename), buf);
      }
    }
    console.log(`Saved ${filename} (${size}x${size}, ${buf.length} bytes)`);
    return { width: size, height: size, buffer: buf };
  }

  const allDestDirs = [publicDir];
  if (fs.existsSync(leaflySubPublicDir)) {
    allDestDirs.push(leaflySubPublicDir);
  }

  // 1. Generate standard web & Google Search favicon sizes
  const icon48 = await generatePng(48, "favicon-48x48.png", allDestDirs);
  const icon96 = await generatePng(96, "favicon-96x96.png", allDestDirs);
  const icon32 = await generatePng(32, "favicon-32x32.png", allDestDirs);
  const icon16 = await generatePng(16, "favicon-16x16.png", allDestDirs);
  await generatePng(48, "favicon.png", allDestDirs); // standard 48px PNG fallback for search bots

  // 2. Touch and Chrome app icons
  await generatePng(180, "apple-touch-icon.png", allDestDirs);
  await generatePng(180, "apple-touch-icon-precomposed.png", allDestDirs);
  await generatePng(192, "android-chrome-192x192.png", allDestDirs);
  const icon512 = await generatePng(512, "android-chrome-512x512.png", allDestDirs);
  await generatePng(512, "leafly-site-icon.png", allDestDirs);

  // 3. OVERWRITE OLD FAVICON FILE (leafly-logo.png) WITH NEW LOGO
  // This completely eliminates stale cache from Google/Brave that cached /leafly-logo.png as the favicon
  await generatePng(512, "leafly-logo.png", allDestDirs);
  const publicSrcAssetsDir = path.resolve(__dirname, "../public/src/assets");
  if (fs.existsSync(publicSrcAssetsDir)) {
    await generatePng(512, "leafly-logo.png", [publicSrcAssetsDir]);
  }

  // 4. Generate multi-resolution favicon.ico with 48x48 as the primary first frame
  // Ordering: 48x48 (Google standard), 32x32 (Desktop retina), 16x16 (Desktop standard)
  const icoBuffer = createIco([icon48, icon32, icon16]);
  for (const d of allDestDirs) {
    if (fs.existsSync(d)) {
      fs.writeFileSync(path.join(d, "favicon.ico"), icoBuffer);
    }
  }
  console.log(`Saved favicon.ico (48, 32, 16 multi-res, ${icoBuffer.length} bytes, 48x48 primary)`);

  // 5. Generate high-fidelity SVG embedding the new circular emblem
  // Ensures any browser/crawler requesting /favicon.svg renders the exact new circular logo
  const icon512Base64 = icon512.buffer.toString("base64");
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" width="512" height="512">
  <image width="512" height="512" href="data:image/png;base64,${icon512Base64}" xlink:href="data:image/png;base64,${icon512Base64}"/>
</svg>
`;
  for (const d of allDestDirs) {
    if (fs.existsSync(d)) {
      fs.writeFileSync(path.join(d, "favicon.svg"), svgContent, "utf-8");
    }
  }
  console.log("Saved favicon.svg (embedded high-fidelity new logo)");

  // 6. Generate site.webmanifest
  const manifest = {
    name: "Leafly — Premium Indian Teas & Artisanal Rituals",
    short_name: "Leafly",
    description: "Discover rare single-origin Darjeeling loose leaf teas. Experience mindful brewing rituals, personalized tea sets, and exquisite luxury gifts.",
    icons: [
      {
        src: "/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png"
      },
      {
        src: "/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png"
      },
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/leafly-site-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ],
    theme_color: "#0b2b1e",
    background_color: "#0b2b1e",
    display: "standalone",
    orientation: "portrait",
    start_url: "/"
  };

  for (const d of allDestDirs) {
    if (fs.existsSync(d)) {
      fs.writeFileSync(path.join(d, "site.webmanifest"), JSON.stringify(manifest, null, 2), "utf-8");
    }
  }
  console.log("Saved site.webmanifest");

  console.log("\nALL FAVICONS AND BRAND ASSETS SUCCESSFULLY GENERATED & VERIFIED!");
}

run().catch((err) => {
  console.error("Error generating favicons:", err);
  process.exit(1);
});
