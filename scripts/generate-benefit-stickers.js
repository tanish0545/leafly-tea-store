import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const outDir = path.resolve("public/images/benefits");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 7 Sticker Vector Illustrations
const stickers = [
  {
    filename: "belly-fat-reduction",
    title: "Belly Fat Reduction",
    svg: `
<svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="sticker-shadow" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0b2b1e" flood-opacity="0.15" />
    </filter>
    <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C158" />
      <stop offset="50%" stop-color="#C9A24B" />
      <stop offset="100%" stop-color="#9E782F" />
    </linearGradient>
    <linearGradient id="green-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#388E3C" />
      <stop offset="50%" stop-color="#2D6A4F" />
      <stop offset="100%" stop-color="#0B2B1E" />
    </linearGradient>
    <linearGradient id="body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBF7EE" />
      <stop offset="100%" stop-color="#E8E2D2" />
    </linearGradient>
  </defs>

  <g filter="url(#sticker-shadow)">
    <!-- Die-Cut Sticker White Contour Background -->
    <path d="M140 70 C190 65 210 65 260 70 C280 110 270 150 245 190 C235 205 235 215 245 230 C275 270 285 305 260 340 C210 350 190 350 140 340 C115 305 125 270 155 230 C165 215 165 205 155 190 C130 150 120 110 140 70 Z" 
          fill="#FFFFFF" stroke="#F0ECE1" stroke-width="8" stroke-linejoin="round" />

    <!-- Organic Waist Silhouette -->
    <path d="M148 85 C190 80 210 80 252 85 C266 120 255 155 236 190 C228 203 228 217 236 230 C258 265 268 295 250 325 C210 335 190 335 150 325 C132 295 142 265 164 230 C172 217 172 203 164 190 C145 155 134 120 148 85 Z" 
          fill="url(#body-grad)" stroke="#0B2B1E" stroke-width="4" stroke-linejoin="round" />

    <!-- Measuring Tape Ribbon Loop Around Waist -->
    <path d="M110 205 C140 185 260 185 290 205 C295 215 285 225 270 228 C230 238 170 238 130 228 C115 225 105 215 110 205 Z" 
          fill="url(#gold-grad)" stroke="#0B2B1E" stroke-width="3" />
    
    <!-- Measuring Tape Tick Marks -->
    <line x1="140" y1="202" x2="140" y2="216" stroke="#0B2B1E" stroke-width="2.5" />
    <line x1="155" y1="205" x2="155" y2="214" stroke="#0B2B1E" stroke-width="2" />
    <line x1="170" y1="207" x2="170" y2="219" stroke="#0B2B1E" stroke-width="2.5" />
    <line x1="185" y1="208" x2="185" y2="216" stroke="#0B2B1E" stroke-width="2" />
    <line x1="200" y1="209" x2="200" y2="221" stroke="#0B2B1E" stroke-width="3" />
    <line x1="215" y1="208" x2="215" y2="216" stroke="#0B2B1E" stroke-width="2" />
    <line x1="230" y1="207" x2="230" y2="219" stroke="#0B2B1E" stroke-width="2.5" />
    <line x1="245" y1="205" x2="245" y2="214" stroke="#0B2B1E" stroke-width="2" />
    <line x1="260" y1="202" x2="260" y2="216" stroke="#0B2B1E" stroke-width="2.5" />

    <!-- Measuring Tape Loose Tail with Golden Clip -->
    <path d="M270 220 C290 240 300 270 295 295 C285 295 275 285 275 270 C275 250 268 235 260 225 Z" 
          fill="url(#gold-grad)" stroke="#0B2B1E" stroke-width="3" />
    <rect x="277" y="285" width="20" height="10" rx="3" fill="#D4AF37" stroke="#0B2B1E" stroke-width="2" />

    <!-- Sprouting Green Tea Leaves on Side -->
    <g transform="translate(90, 110) rotate(-25)">
      <path d="M60 70 C40 35 70 10 90 10 C90 35 80 60 60 70 Z" fill="url(#green-grad)" stroke="#FFFFFF" stroke-width="3" />
      <path d="M60 70 C75 40 85 20 90 10" stroke="#E5C158" stroke-width="2.5" stroke-linecap="round" />
      <path d="M68 50 C55 45 45 55 40 60 C50 65 60 60 68 50 Z" fill="#52796F" stroke="#FFFFFF" stroke-width="2.5" />
    </g>

    <!-- Sparkles -->
    <path d="M120 90 L123 97 L130 100 L123 103 L120 110 L117 103 L110 100 L117 97 Z" fill="#C9A24B" />
    <path d="M280 120 L282 125 L287 127 L282 129 L280 134 L278 129 L273 127 L278 125 Z" fill="#C9A24B" />
  </g>
</svg>
`
  },
  {
    filename: "supports-healthy-hair",
    title: "Supports Healthy Hair",
    svg: `
<svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="sticker-shadow-hh" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0b2b1e" flood-opacity="0.15" />
    </filter>
    <linearGradient id="hair-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B2B1E" />
      <stop offset="40%" stop-color="#1A4333" />
      <stop offset="100%" stop-color="#2D6A4F" />
    </linearGradient>
    <linearGradient id="gold-elixir" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF2A3" />
      <stop offset="50%" stop-color="#E5C158" />
      <stop offset="100%" stop-color="#B8860B" />
    </linearGradient>
  </defs>

  <g filter="url(#sticker-shadow-hh)">
    <!-- Die-Cut White Sticker Silhouette -->
    <path d="M190 40 C140 40 100 80 100 135 C100 190 125 230 145 270 C165 310 170 345 200 360 C235 345 255 310 270 260 C285 210 295 155 280 100 C265 60 230 40 190 40 Z" 
          fill="#FFFFFF" stroke="#F0ECE1" stroke-width="8" stroke-linejoin="round" />

    <!-- Flowing Glossy Botanical Hair Lock -->
    <path d="M190 55 C150 55 118 90 118 140 C118 190 142 225 160 265 C176 300 182 330 200 342 C226 330 242 295 255 250 C268 205 276 155 264 110 C252 75 224 55 190 55 Z" 
          fill="url(#hair-grad)" stroke="#0B2B1E" stroke-width="3" />

    <!-- Silky Hair Strands Curves & Highlights -->
    <path d="M175 75 C145 110 135 165 145 215 C155 260 170 295 188 325" 
          fill="none" stroke="#52796F" stroke-width="4.5" stroke-linecap="round" />
    <path d="M205 75 C185 115 170 175 180 230 C190 275 200 305 205 325" 
          fill="none" stroke="#74A892" stroke-width="3.5" stroke-linecap="round" />
    <path d="M225 90 C235 140 240 190 230 240 C222 280 215 305 210 320" 
          fill="none" stroke="#E5C158" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="8 4" />

    <!-- Botanical Tea Blossom in Hair -->
    <g transform="translate(140, 70)">
      <circle cx="25" cy="25" r="10" fill="#E5C158" stroke="#0B2B1E" stroke-width="2" />
      <path d="M25 5 C30 15 30 15 25 25 C20 15 20 15 25 5 Z" fill="#FDFBF7" stroke="#0B2B1E" stroke-width="1.8" />
      <path d="M45 25 C35 30 35 30 25 25 C35 20 35 20 45 25 Z" fill="#FDFBF7" stroke="#0B2B1E" stroke-width="1.8" />
      <path d="M25 45 C20 35 20 35 25 25 C30 35 30 35 25 45 Z" fill="#FDFBF7" stroke="#0B2B1E" stroke-width="1.8" />
      <path d="M5 25 C15 20 15 20 25 25 C15 30 15 30 5 25 Z" fill="#FDFBF7" stroke="#0B2B1E" stroke-width="1.8" />
    </g>

    <!-- Nourishing Herbal Oil Elixir Drop -->
    <g transform="translate(240, 190)">
      <path d="M25 5 C25 5 45 35 45 52 C45 65 36 75 25 75 C14 75 5 65 5 52 C5 35 25 5 25 5 Z" 
            fill="url(#gold-elixir)" stroke="#0B2B1E" stroke-width="3" />
      <circle cx="33" cy="45" r="4.5" fill="#FFFFFF" fill-opacity="0.85" />
      <path d="M20 58 C22 55 28 55 30 58" stroke="#B8860B" stroke-width="2" stroke-linecap="round" />
    </g>

    <!-- Botanical Leaves at Root -->
    <path d="M215 50 C235 35 260 40 265 55 C250 65 230 65 215 50 Z" fill="#2D6A4F" stroke="#FFFFFF" stroke-width="2.5" />

    <!-- Shimmer Sparkles -->
    <path d="M120 150 L123 157 L130 160 L123 163 L120 170 L117 163 L110 160 L117 157 Z" fill="#C9A24B" />
    <path d="M270 120 L272 125 L277 127 L272 129 L270 134 L268 129 L263 127 L268 125 Z" fill="#C9A24B" />
    <path d="M210 345 L212 349 L216 350 L212 351 L210 355 L208 351 L204 350 L208 349 Z" fill="#E5C158" />
  </g>
</svg>
`
  },
  {
    filename: "helps-manage-sugar",
    title: "Helps Manage Sugar",
    svg: `
<svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="sticker-shadow-ms" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0b2b1e" flood-opacity="0.15" />
    </filter>
    <linearGradient id="gold-scale" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCE588" />
      <stop offset="50%" stop-color="#C9A24B" />
      <stop offset="100%" stop-color="#8F6A1A" />
    </linearGradient>
    <linearGradient id="green-dish" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2D6A4F" />
      <stop offset="100%" stop-color="#0B2B1E" />
    </linearGradient>
  </defs>

  <g filter="url(#sticker-shadow-ms)">
    <!-- Die-Cut White Sticker Silhouette -->
    <path d="M200 45 C150 45 75 90 75 160 C75 220 110 260 140 310 C160 340 180 355 200 355 C220 355 240 340 260 310 C290 260 325 220 325 160 C325 90 250 45 200 45 Z" 
          fill="#FFFFFF" stroke="#F0ECE1" stroke-width="8" stroke-linejoin="round" />

    <!-- Central Brass Botanical Pillar -->
    <path d="M192 100 L208 100 L206 310 L194 310 Z" fill="url(#gold-scale)" stroke="#0B2B1E" stroke-width="3" />
    <path d="M165 310 C165 310 180 330 200 330 C220 330 235 310 235 310 Z" fill="#0B2B1E" stroke="#C9A24B" stroke-width="3" />
    <circle cx="200" cy="95" r="14" fill="url(#gold-scale)" stroke="#0B2B1E" stroke-width="3" />
    <circle cx="200" cy="95" r="6" fill="#0B2B1E" />

    <!-- Perfectly Balanced Scale Beam -->
    <path d="M100 120 C140 115 260 115 300 120" stroke="url(#gold-scale)" stroke-width="6" stroke-linecap="round" />
    <path d="M100 120 C140 115 260 115 300 120" stroke="#0B2B1E" stroke-width="2" stroke-linecap="round" />

    <!-- Left Balance Pan Chains & Pan (Green Tea Leaves) -->
    <line x1="110" y1="120" x2="85" y2="200" stroke="#0B2B1E" stroke-width="2" />
    <line x1="110" y1="120" x2="135" y2="200" stroke="#0B2B1E" stroke-width="2" />
    <path d="M80 200 C80 225 140 225 140 200 Z" fill="url(#green-dish)" stroke="#C9A24B" stroke-width="2.5" />
    <!-- Fresh Whole Green Tea Leaves on Pan -->
    <path d="M110 170 C95 185 105 200 110 200 C115 200 125 185 110 170 Z" fill="#74A892" stroke="#FFFFFF" stroke-width="1.5" />
    <path d="M98 185 C90 195 100 202 105 202 C108 198 102 190 98 185 Z" fill="#52796F" />
    <path d="M122 185 C130 195 120 202 115 202 C112 198 118 190 122 185 Z" fill="#2D6A4F" />

    <!-- Right Balance Pan Chains & Pan (Sugar Harmony Crystal / Drops) -->
    <line x1="290" y1="120" x2="265" y2="200" stroke="#0B2B1E" stroke-width="2" />
    <line x1="290" y1="120" x2="315" y2="200" stroke="#0B2B1E" stroke-width="2" />
    <path d="M260 200 C260 225 320 225 320 200 Z" fill="url(#green-dish)" stroke="#C9A24B" stroke-width="2.5" />
    <!-- Golden Geometric Sugar Cube & Balance Crystal -->
    <rect x="280" y="178" width="20" height="20" rx="3" transform="rotate(15, 290, 188)" fill="#FDFBF7" stroke="#C9A24B" stroke-width="2" />
    <circle cx="282" cy="192" r="5" fill="#E5C158" stroke="#0B2B1E" stroke-width="1.5" />
    <circle cx="298" cy="188" r="4" fill="#C9A24B" />

    <!-- Metabolic Balance Sine Wave across Base -->
    <path d="M150 265 Q 175 245 200 265 T 250 265" fill="none" stroke="#C9A24B" stroke-width="3" stroke-linecap="round" />
    
    <!-- Top Laurel Leaf Crown -->
    <path d="M185 75 C190 60 195 60 200 70 C205 60 210 60 215 75" stroke="#2D6A4F" stroke-width="3" fill="none" stroke-linecap="round" />
  </g>
</svg>
`
  },
  {
    filename: "supports-heart-health",
    title: "Supports Heart Health",
    svg: `
<svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="sticker-shadow-hh2" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0b2b1e" flood-opacity="0.15" />
    </filter>
    <linearGradient id="heart-green" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2D6A4F" />
      <stop offset="50%" stop-color="#1A4333" />
      <stop offset="100%" stop-color="#0B2B1E" />
    </linearGradient>
    <linearGradient id="gold-pulse" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF2A3" />
      <stop offset="50%" stop-color="#E5C158" />
      <stop offset="100%" stop-color="#C9A24B" />
    </linearGradient>
  </defs>

  <g filter="url(#sticker-shadow-hh2)">
    <!-- Die-Cut White Sticker Silhouette -->
    <path d="M200 355 C200 355 80 270 80 160 C80 100 125 65 175 65 C200 65 210 85 200 95 C190 85 200 65 225 65 C275 65 320 100 320 160 C320 270 200 355 200 355 Z" 
          fill="#FFFFFF" stroke="#F0ECE1" stroke-width="8" stroke-linejoin="round" />

    <!-- Lush Botanical Heart Formed by Curving Leaves -->
    <path d="M200 340 C200 340 95 260 95 165 C95 115 135 80 178 80 C195 80 200 95 200 95 C200 95 205 80 222 80 C265 80 305 115 305 165 C305 260 200 340 200 340 Z" 
          fill="url(#heart-green)" stroke="#0B2B1E" stroke-width="4" stroke-linejoin="round" />

    <!-- Inner Heart Botanical Leaf Veins -->
    <path d="M200 130 C195 200 195 260 200 310" stroke="#74A892" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 4" />
    <path d="M198 170 C165 150 135 160 120 175" stroke="#52796F" stroke-width="3" stroke-linecap="round" />
    <path d="M198 220 C165 210 145 225 135 245" stroke="#52796F" stroke-width="3" stroke-linecap="round" />
    <path d="M202 170 C235 150 265 160 280 175" stroke="#52796F" stroke-width="3" stroke-linecap="round" />
    <path d="M202 220 C235 210 255 225 265 245" stroke="#52796F" stroke-width="3" stroke-linecap="round" />

    <!-- Golden Vitality ECG Pulse Wave Line Glowing Across -->
    <path d="M70 190 L130 190 L145 165 L165 225 L185 145 L205 235 L225 175 L245 205 L260 190 L330 190" 
          fill="none" stroke="url(#gold-pulse)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M70 190 L130 190 L145 165 L165 225 L185 145 L205 235 L225 175 L245 205 L260 190 L330 190" 
          fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.8" />

    <!-- Botanical Sprout at Cusp of Heart -->
    <g transform="translate(180, 50)">
      <path d="M20 30 C10 15 25 5 35 10 C35 20 28 28 20 30 Z" fill="#74A892" stroke="#FFFFFF" stroke-width="2" />
      <path d="M20 30 C30 15 15 5 5 10 C5 20 12 28 20 30 Z" fill="#2D6A4F" stroke="#FFFFFF" stroke-width="2" />
    </g>

    <!-- Vitality Sparkles -->
    <path d="M90 120 L93 127 L100 130 L93 133 L90 140 L87 133 L80 130 L87 127 Z" fill="#E5C158" />
    <path d="M305 120 L307 125 L312 127 L307 129 L305 134 L303 129 L298 127 L303 125 Z" fill="#E5C158" />
  </g>
</svg>
`
  },
  {
    filename: "improves-digestion",
    title: "Improves Digestion",
    svg: `
<svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="sticker-shadow-id" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0b2b1e" flood-opacity="0.15" />
    </filter>
    <linearGradient id="stomach-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBF7EE" />
      <stop offset="60%" stop-color="#E8F2EC" />
      <stop offset="100%" stop-color="#D0E5D8" />
    </linearGradient>
    <linearGradient id="tea-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#52796F" />
      <stop offset="100%" stop-color="#0B2B1E" />
    </linearGradient>
  </defs>

  <g filter="url(#sticker-shadow-id)">
    <!-- Die-Cut White Sticker Silhouette -->
    <path d="M190 45 C150 45 120 70 120 120 C120 160 140 180 130 220 C115 280 160 345 225 345 C285 345 315 295 315 235 C315 170 280 130 270 90 C265 60 225 45 190 45 Z" 
          fill="#FFFFFF" stroke="#F0ECE1" stroke-width="8" stroke-linejoin="round" />

    <!-- Stylized Botanical Digestive / Stomach Harmony Contour -->
    <path d="M195 60 C160 60 135 85 135 130 C135 165 152 185 142 225 C130 275 170 330 225 330 C275 330 300 285 300 235 C300 180 268 145 258 105 C252 80 225 60 195 60 Z" 
          fill="url(#stomach-grad)" stroke="#0B2B1E" stroke-width="4" stroke-linejoin="round" />

    <!-- Soothing Internal Flora Spiral -->
    <path d="M195 150 C240 150 260 190 260 225 C260 270 220 295 185 290 C155 285 150 250 160 225 C170 200 205 200 215 220 C220 235 210 250 195 248" 
          fill="none" stroke="#C9A24B" stroke-width="4" stroke-linecap="round" stroke-dasharray="6 4" />

    <!-- Fresh Mint & Green Tea Leaves Centered for Gut Relief -->
    <g transform="translate(170, 180)">
      <path d="M30 45 C10 20 30 0 50 0 C50 20 40 40 30 45 Z" fill="url(#tea-leaf)" stroke="#FFFFFF" stroke-width="2.5" />
      <path d="M30 45 C45 25 50 10 50 0" stroke="#E5C158" stroke-width="2" />
      <path d="M30 45 C50 30 65 35 70 45 C55 55 40 50 30 45 Z" fill="#2D6A4F" stroke="#FFFFFF" stroke-width="2" />
      <path d="M30 45 C15 35 5 45 0 55 C15 65 25 55 30 45 Z" fill="#74A892" stroke="#FFFFFF" stroke-width="2" />
    </g>

    <!-- Calming Digestive Ripples -->
    <circle cx="210" cy="235" r="5" fill="#E5C158" />
    <path d="M225 220 C235 230 235 245 225 255" fill="none" stroke="#2D6A4F" stroke-width="2.5" stroke-linecap="round" />
    <path d="M240 210 C255 225 255 255 240 270" fill="none" stroke="#52796F" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.6" />

    <!-- Top Esophageal Inflow Sprout -->
    <path d="M190 40 C195 30 205 30 210 40" stroke="#2D6A4F" stroke-width="3" stroke-linecap="round" />
    
    <!-- Sparkles of Light -->
    <path d="M130 90 L132 95 L137 97 L132 99 L130 104 L128 99 L123 97 L128 95 Z" fill="#C9A24B" />
    <path d="M290 140 L292 145 L297 147 L292 149 L290 154 L288 149 L283 147 L288 145 Z" fill="#C9A24B" />
  </g>
</svg>
`
  },
  {
    filename: "immunity-booster",
    title: "Immunity Booster",
    svg: `
<svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="sticker-shadow-ib" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0b2b1e" flood-opacity="0.15" />
    </filter>
    <linearGradient id="shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2D6A4F" />
      <stop offset="60%" stop-color="#1A4333" />
      <stop offset="100%" stop-color="#0B2B1E" />
    </linearGradient>
    <linearGradient id="shield-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF2A3" />
      <stop offset="50%" stop-color="#E5C158" />
      <stop offset="100%" stop-color="#C9A24B" />
    </linearGradient>
  </defs>

  <g filter="url(#sticker-shadow-ib)">
    <!-- Die-Cut White Sticker Silhouette -->
    <path d="M200 40 C260 40 315 60 315 120 C315 220 250 310 200 355 C150 310 85 220 85 120 C85 60 140 40 200 40 Z" 
          fill="#FFFFFF" stroke="#F0ECE1" stroke-width="8" stroke-linejoin="round" />

    <!-- Royal Botanical Defense Shield -->
    <path d="M200 55 C250 55 298 72 298 125 C298 215 240 295 200 338 C160 295 102 215 102 125 C102 72 150 55 200 55 Z" 
          fill="url(#shield-grad)" stroke="#0B2B1E" stroke-width="4" stroke-linejoin="round" />

    <!-- Inner Gold Filigree Shield Border -->
    <path d="M200 70 C240 70 280 85 280 130 C280 205 230 275 200 315 C170 275 120 205 120 130 C120 85 160 70 200 70 Z" 
          fill="none" stroke="url(#shield-gold)" stroke-width="3" />

    <!-- Center Emblazoned Radiant Green Tea Leaf Crest -->
    <g transform="translate(160, 130)">
      <path d="M40 0 C70 30 75 75 40 105 C5 75 10 30 40 0 Z" fill="url(#shield-gold)" stroke="#0B2B1E" stroke-width="3" />
      <path d="M40 0 L40 100" stroke="#0B2B1E" stroke-width="3" stroke-linecap="round" />
      <path d="M40 35 L60 50" stroke="#0B2B1E" stroke-width="2" stroke-linecap="round" />
      <path d="M40 60 L60 75" stroke="#0B2B1E" stroke-width="2" stroke-linecap="round" />
      <path d="M40 35 L20 50" stroke="#0B2B1E" stroke-width="2" stroke-linecap="round" />
      <path d="M40 60 L20 75" stroke="#0B2B1E" stroke-width="2" stroke-linecap="round" />
    </g>

    <!-- Four-Point Antioxidant Shield Starburst Sparkles -->
    <path d="M200 20 L205 35 L220 40 L205 45 L200 60 L195 45 L180 40 L195 35 Z" fill="#E5C158" stroke="#0B2B1E" stroke-width="1.5" />
    <path d="M315 140 L318 147 L325 150 L318 153 L315 160 L312 153 L305 150 L312 147 Z" fill="#E5C158" stroke="#0B2B1E" stroke-width="1.5" />
    <path d="M85 140 L88 147 L95 150 L88 153 L85 160 L82 153 L75 150 L82 147 Z" fill="#E5C158" stroke="#0B2B1E" stroke-width="1.5" />

    <!-- Laurel Leaves Wreath Accents -->
    <path d="M140 95 C145 90 155 95 155 102 C150 105 142 102 140 95 Z" fill="#74A892" />
    <path d="M260 95 C255 90 245 95 245 102 C250 105 258 102 260 95 Z" fill="#74A892" />
  </g>
</svg>
`
  },
  {
    filename: "collagen-booster",
    title: "Collagen Booster",
    svg: `
<svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="sticker-shadow-cb" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0b2b1e" flood-opacity="0.15" />
    </filter>
    <linearGradient id="drop-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDFBF7" />
      <stop offset="40%" stop-color="#E5C158" />
      <stop offset="80%" stop-color="#2D6A4F" />
      <stop offset="100%" stop-color="#0B2B1E" />
    </linearGradient>
    <linearGradient id="wave-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF2A3" />
      <stop offset="100%" stop-color="#C9A24B" />
    </linearGradient>
  </defs>

  <g filter="url(#sticker-shadow-cb)">
    <!-- Die-Cut White Sticker Silhouette -->
    <path d="M200 45 C200 45 285 160 285 240 C285 295 245 350 200 350 C155 350 115 295 115 240 C115 160 200 45 200 45 Z" 
          fill="#FFFFFF" stroke="#F0ECE1" stroke-width="8" stroke-linejoin="round" />

    <!-- Plump Dewy Youth/Collagen Droplet -->
    <path d="M200 60 C200 60 270 170 270 240 C270 285 238 335 200 335 C162 335 130 285 130 240 C130 170 200 60 200 60 Z" 
          fill="url(#drop-grad)" stroke="#0B2B1E" stroke-width="4" stroke-linejoin="round" />

    <!-- Concentric Elasticity Ripples Inside Drop -->
    <ellipse cx="200" cy="275" rx="55" ry="20" fill="none" stroke="url(#wave-gold)" stroke-width="3" stroke-dasharray="6 4" />
    <ellipse cx="200" cy="275" rx="36" ry="12" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-opacity="0.8" />

    <!-- Inner High Gloss Dew Highlight -->
    <path d="M175 110 C185 95 200 75 200 75 C200 75 165 140 160 190 C155 220 160 250 175 270 C155 240 150 170 175 110 Z" 
          fill="#FFFFFF" fill-opacity="0.75" />
    <circle cx="230" cy="180" r="9" fill="#FFFFFF" fill-opacity="0.9" />

    <!-- Unfolding Young Green Tea Bud at Core of Droplet -->
    <g transform="translate(180, 240)">
      <path d="M20 50 C5 35 10 10 20 0 C30 10 35 35 20 50 Z" fill="#E5C158" stroke="#0B2B1E" stroke-width="2.5" />
      <path d="M20 50 C10 40 5 25 2 20 C10 18 18 30 20 50 Z" fill="#74A892" />
      <path d="M20 50 C30 40 35 25 38 20 C30 18 22 30 20 50 Z" fill="#2D6A4F" />
    </g>

    <!-- Radiance Sunburst Rays of Elasticity -->
    <path d="M200 20 L200 35" stroke="#C9A24B" stroke-width="3" stroke-linecap="round" />
    <path d="M275 80 L260 95" stroke="#C9A24B" stroke-width="3" stroke-linecap="round" />
    <path d="M125 80 L140 95" stroke="#C9A24B" stroke-width="3" stroke-linecap="round" />
    <path d="M305 170 L285 175" stroke="#C9A24B" stroke-width="3" stroke-linecap="round" />
    <path d="M95 170 L115 175" stroke="#C9A24B" stroke-width="3" stroke-linecap="round" />
    <path d="M295 275 L280 270" stroke="#C9A24B" stroke-width="3" stroke-linecap="round" />
    <path d="M105 275 L120 270" stroke="#C9A24B" stroke-width="3" stroke-linecap="round" />

    <!-- Shimmering Sparkles -->
    <path d="M245 125 L247 130 L252 132 L247 134 L245 139 L243 134 L238 132 L243 130 Z" fill="#FFFFFF" />
  </g>
</svg>
`
  }
];

async function generate() {
  console.log(`Generating ${stickers.length} sticker illustrations in ${outDir}...`);
  for (const s of stickers) {
    const svgBuffer = Buffer.from(s.svg.trim());
    
    // Save PNG
    const pngPath = path.join(outDir, `${s.filename}.png`);
    await sharp(svgBuffer)
      .resize(400, 400)
      .png({ quality: 95 })
      .toFile(pngPath);
    console.log(`✓ Generated ${pngPath}`);

    // Save WebP
    const webpPath = path.join(outDir, `${s.filename}.webp`);
    await sharp(svgBuffer)
      .resize(400, 400)
      .webp({ quality: 95, alphaQuality: 100, lossless: false })
      .toFile(webpPath);
    console.log(`✓ Generated ${webpPath}`);
  }
  console.log("All sticker illustrations generated successfully!");
}

generate().catch((err) => {
  console.error("Error generating stickers:", err);
  process.exit(1);
});
