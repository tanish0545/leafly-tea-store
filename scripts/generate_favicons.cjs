const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const inputImagePath = "C:/Users/tanis/.gemini/antigravity-ide/brain/39f815fe-b26b-4f2c-a3c1-3e57ccc1297c/.user_uploaded/media_1790074582676.jpg";
const publicDir = path.resolve(__dirname, "../public");

// Helper to assemble a valid multi-resolution PNG-compressed ICO file
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
  console.log("Reading source logo image:", inputImagePath);
  if (!fs.existsSync(inputImagePath)) {
    throw new Error(`Input file not found: ${inputImagePath}`);
  }

  // 1. Load raw RGBA pixels from the source image
  const { data, info } = await sharp(inputImagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const centerX = 511.5;
  const centerY = 511.5;
  const radius = 474;

  // Apply smooth anti-aliased circular alpha mask
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= radius + 1) {
        data[idx + 3] = 0; // completely transparent outside circle
      } else if (dist <= radius - 1) {
        data[idx + 3] = 255; // completely opaque inside
      } else {
        // Smooth anti-aliased border transition
        const alphaFraction = (radius + 1 - dist) / 2;
        data[idx + 3] = Math.round(255 * Math.max(0, Math.min(1, alphaFraction)));
      }
    }
  }

  // Create 948x948 master buffer extracted to the exact circular boundary
  const maskedMasterBuffer = await sharp(data, {
    raw: { width, height, channels: 4 }
  })
    .extract({ left: 38, top: 38, width: 948, height: 948 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  console.log("Masked high-res circular master generated (948x948).");

  // Helper to generate a resized PNG
  async function generatePng(size, filename) {
    const outPath = path.join(publicDir, filename);
    const buf = await sharp(maskedMasterBuffer)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(outPath, buf);
    console.log(`Saved ${filename} (${size}x${size}, ${buf.length} bytes)`);
    return { width: size, height: size, buffer: buf };
  }

  // Generate all standard web and Google Search favicon sizes
  const icon16 = await generatePng(16, "favicon-16x16.png");
  const icon32 = await generatePng(32, "favicon-32x32.png");
  const icon48 = await generatePng(48, "favicon-48x48.png");
  const icon96 = await generatePng(96, "favicon-96x96.png");
  await generatePng(48, "favicon.png"); // standard PNG fallback
  await generatePng(180, "apple-touch-icon.png");
  await generatePng(180, "apple-touch-icon-precomposed.png");
  await generatePng(192, "android-chrome-192x192.png");
  await generatePng(512, "android-chrome-512x512.png");
  await generatePng(512, "leafly-site-icon.png");

  // Generate multi-resolution favicon.ico containing 16x16, 32x32, 48x48
  const icoBuffer = createIco([icon16, icon32, icon48]);
  const icoPath = path.join(publicDir, "favicon.ico");
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`Saved favicon.ico (16, 32, 48 multi-res, ${icoBuffer.length} bytes)`);

  // Generate site.webmanifest
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
      }
    ],
    theme_color: "#0b2b1e",
    background_color: "#0b2b1e",
    display: "standalone",
    orientation: "portrait",
    start_url: "/"
  };

  const manifestPath = path.join(publicDir, "site.webmanifest");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("Saved site.webmanifest");

  console.log("\nALL FAVICONS SUCCESSFULLY GENERATED!");
}

run().catch((err) => {
  console.error("Error generating favicons:", err);
  process.exit(1);
});
