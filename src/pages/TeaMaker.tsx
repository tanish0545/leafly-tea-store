import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductContext";
import { type Product } from "../data/products";
import TeaRitualSoundscape from "../components/TeaRitualSoundscape";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import "./TeaMaker.css";

// ─── Ingredient Assets ───────────────────────────────────────────────
import lemonImg from "../assets/tea-maker/ingredients/lemon.webp";
import jaggeryImg from "../assets/tea-maker/ingredients/jaggery.webp";
import mintImg from "../assets/tea-maker/ingredients/mint.webp";
import lemongrassImg from "../assets/tea-maker/ingredients/lemongrass.webp";
import blackPepperImg from "../assets/tea-maker/ingredients/black-pepper.webp";
import blackSaltImg from "../assets/tea-maker/ingredients/black-salt.webp";
import honeyImg from "../assets/tea-maker/ingredients/honey.webp";

import lemonSliceEffect from "../assets/tea-maker/effects/lemon-slice.webp";
import mintLeafEffect from "../assets/tea-maker/effects/mint-leaf.webp";
import jaggeryPieceEffect from "../assets/tea-maker/effects/jaggery-piece.webp";
import lemongrassPieceEffect from "../assets/tea-maker/effects/lemongrass-piece.webp";
import pepperParticlesEffect from "../assets/tea-maker/effects/pepper-particles.webp";
import saltParticlesEffect from "../assets/tea-maker/effects/salt-particles.webp";
import honeyDropEffect from "../assets/tea-maker/effects/honey-drop.webp";

// ─── Pouring & Finished Cup Imagery ──────────────────────────────────
import pouringGreenImg from "../assets/pouring-green.webp";
import pouringBlackImg from "../assets/pouring-black.webp";
import greenTeaMakerImg from "../assets/green-tea-maker.webp";
import blackTeaMakerImg from "../assets/black-tea-maker.webp";
import oolongTeaMakerImg from "../assets/oolong-tea-maker.webp";

// ─── Types & Definitions ─────────────────────────────────────────────
export type TeaType = "Green Tea" | "Black Tea" | "Oolong Tea";

export type IngredientId =
  | "lemon"
  | "jaggery"
  | "mint"
  | "lemongrass"
  | "black-pepper"
  | "black-salt"
  | "honey";

export interface Ingredient {
  id: IngredientId;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  effectImage: string;
  animationClass: string;
}

export const INGREDIENTS: Ingredient[] = [
  {
    id: "lemon",
    name: "Lemon Slice",
    subtitle: "Bright · Citrus · Fresh",
    description: "Sun-ripened citrus zest for bright, uplifting morning freshness.",
    image: lemonImg,
    effectImage: lemonSliceEffect,
    animationClass: "tm-anim-drop",
  },
  {
    id: "jaggery",
    name: "Pure Jaggery",
    subtitle: "Earthy · Caramel · Warm",
    description: "Unrefined organic cane sweetness with mineral depth.",
    image: jaggeryImg,
    effectImage: jaggeryPieceEffect,
    animationClass: "tm-anim-dissolve",
  },
  {
    id: "mint",
    name: "Fresh Mint",
    subtitle: "Crisp · Herbal · Cooling",
    description: "Hand-plucked spearmint leaves imparting a crisp, soothing finish.",
    image: mintImg,
    effectImage: mintLeafEffect,
    animationClass: "tm-anim-float",
  },
  {
    id: "lemongrass",
    name: "Crushed Lemongrass",
    subtitle: "Tangy · Herbal · Clean",
    description: "Aromatic stalks with a tangy, herbaceous citrus aura.",
    image: lemongrassImg,
    effectImage: lemongrassPieceEffect,
    animationClass: "tm-anim-float",
  },
  {
    id: "black-pepper",
    name: "Malabar Black Pepper",
    subtitle: "Spicy · Pungent · Stimulating",
    description: "Coarsely ground Malabar peppercorns to kindle inner warmth.",
    image: blackPepperImg,
    effectImage: pepperParticlesEffect,
    animationClass: "tm-anim-spray",
  },
  {
    id: "black-salt",
    name: "Himalayan Black Salt",
    subtitle: "Savoury · Mineral · Earthy",
    description: "Fine Himalayan kala namak bringing savoury umami and minerals.",
    image: blackSaltImg,
    effectImage: saltParticlesEffect,
    animationClass: "tm-anim-spray",
  },
  {
    id: "honey",
    name: "Raw Forest Honey",
    subtitle: "Sweet · Floral · Amber",
    description: "Wild forest blossom nectar creating a silky, soothing texture.",
    image: honeyImg,
    effectImage: honeyDropEffect,
    animationClass: "tm-anim-stream",
  },
];

export interface MoodOption {
  id: string;
  title: string;
  tagline: string;
  icon: string;
}

export const MOODS: MoodOption[] = [
  { id: "morning-energy", title: "Morning Energy", tagline: "Awaken senses with vibrant clarity and fresh morning focus.", icon: "☀" },
  { id: "mindful-focus", title: "Mindful Focus", tagline: "A calm, contemplative cup to accompany reading or study.", icon: "🪷" },
  { id: "afternoon-pause", title: "Afternoon Pause", tagline: "Gentle respite between midday tasks to restore balance.", icon: "🍃" },
  { id: "wind-down", title: "Wind Down", tagline: "A peaceful twilight ritual to ease into evening rest.", icon: "🌙" },
  { id: "artisan-tasting", title: "Artisan Tasting", tagline: "Appreciate subtle harvest aromas and liquor notes.", icon: "✦" },
  { id: "something-special", title: "Something Special", tagline: "A celebratory heirloom ritual shared with dear friends.", icon: "☕" },
];

export interface BrewMethod {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  recommendedTemp: number;
  recommendedTimeSec: number;
  vesselName: string;
}

export const BREW_METHODS: BrewMethod[] = [
  {
    id: "teapot",
    name: "Glass Infuser Teapot",
    tagline: "Full-leaf expansion with crystal optical transparency.",
    icon: "🫖",
    recommendedTemp: 85,
    recommendedTimeSec: 135,
    vesselName: "High-Borosilicate Infuser Teapot",
  },
  {
    id: "gaiwan",
    name: "Gongfu Gaiwan",
    tagline: "Concentrated artisanal infusions celebrating multi-steep depth.",
    icon: "🍵",
    recommendedTemp: 92,
    recommendedTimeSec: 45,
    vesselName: "Glazed Ceramic Gaiwan",
  },
  {
    id: "infuser",
    name: "Travel Steeper Tumbler",
    tagline: "Clean, portable orthodox steeping for modern desks.",
    icon: "🥤",
    recommendedTemp: 85,
    recommendedTimeSec: 180,
    vesselName: "Double-Walled Glass Steeper",
  },
  {
    id: "coldbrew",
    name: "Overnight Cold Brew",
    tagline: "Slow cold immersion extracting natural sweetness, zero tannin.",
    icon: "❄",
    recommendedTemp: 20,
    recommendedTimeSec: 240,
    vesselName: "Chilled Infusion Flask",
  },
];

export const STEP_TABS = [
  { num: 1, label: "Harvest", stepName: "Choose Tea" },
  { num: 2, label: "Moment", stepName: "Mood" },
  { num: 3, label: "Vessel", stepName: "Method" },
  { num: 4, label: "Heat", stepName: "Temperature" },
  { num: 5, label: "Measure", stepName: "Leaves & Extras" },
  { num: 6, label: "Ritual", stepName: "Brewing" },
  { num: 7, label: "Your Cup", stepName: "Perfect Cup" },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function mapProductToTeaType(p?: Product | null): TeaType {
  if (!p) return "Green Tea";
  const cat = (p.category || "").toLowerCase();
  const name = (p.name || "").toLowerCase();
  if (cat.includes("oolong") || name.includes("oolong")) return "Oolong Tea";
  if (cat.includes("black") || name.includes("black") || name.includes("dusk") || name.includes("chamomile")) return "Black Tea";
  return "Green Tea";
}

function getTeaTypeColors(type: TeaType) {
  switch (type) {
    case "Black Tea":
      return {
        accent: "#b85d19",
        accentLight: "#f7ede4",
        accentGlow: "rgba(184, 93, 25, 0.2)",
        liquorLight: "#f5d6be",
        liquorDeep: "#8f3e08",
        badgeBg: "rgba(184, 93, 25, 0.1)",
        readyImg: blackTeaMakerImg,
        pouringImg: pouringBlackImg,
      };
    case "Oolong Tea":
      return {
        accent: "#c27d24",
        accentLight: "#f9f2e7",
        accentGlow: "rgba(194, 125, 36, 0.2)",
        liquorLight: "#f7e6cb",
        liquorDeep: "#b56b15",
        badgeBg: "rgba(194, 125, 36, 0.1)",
        readyImg: oolongTeaMakerImg,
        pouringImg: pouringBlackImg,
      };
    case "Green Tea":
    default:
      return {
        accent: "#2d5a3f",
        accentLight: "#eaf2ec",
        accentGlow: "rgba(45, 90, 63, 0.2)",
        liquorLight: "#eef5dc",
        liquorDeep: "#9bbd58",
        badgeBg: "rgba(45, 90, 63, 0.1)",
        readyImg: greenTeaMakerImg,
        pouringImg: pouringGreenImg,
      };
  }
}

// ─── Animated SVG Illustrations for Step 6 & 7 ───────────────────────
function AnimatedTeapotIllustration({
  phase,
  temperature,
  waterHeatTemp,
  teaType,
  selectedExtras,
  steepRatio,
}: {
  phase: "heat" | "leaves" | "extras" | "pour" | "steep" | "strain" | "enjoy";
  temperature: number;
  waterHeatTemp: number;
  teaType: TeaType;
  selectedExtras: IngredientId[];
  steepRatio: number;
}) {
  const isHeating = phase === "heat";
  const isLeaves = phase === "leaves";
  const isExtras = phase === "extras";
  const isPouring = phase === "pour";
  const isSteeping = phase === "steep";
  const isStraining = phase === "strain";
  const isEnjoy = phase === "enjoy";

  const fillY = isHeating
    ? 290
    : isLeaves
    ? 282
    : isExtras
    ? 274
    : isPouring
    ? 210
    : 195;

  const liquorColor =
    teaType === "Green Tea"
      ? isSteeping || isStraining || isEnjoy
        ? "#9BBD58"
        : "#D6E89E"
      : teaType === "Black Tea"
      ? isSteeping || isStraining || isEnjoy
        ? "#8F3E08"
        : "#E59E64"
      : isSteeping || isStraining || isEnjoy
      ? "#B56B15"
      : "#DFB06C";

  return (
    <div className="tm-teapot-illustration-container">
      <div className="tm-ambient-leaf-decor leaf-tl" aria-hidden="true">🍃</div>
      <div className="tm-ambient-leaf-decor leaf-tr" aria-hidden="true">🍃</div>
      <div className="tm-ambient-leaf-decor leaf-bl" aria-hidden="true">🍃</div>
      <div className="tm-ambient-leaf-decor leaf-br" aria-hidden="true">🍃</div>

      <svg
        className="tm-teapot-svg"
        viewBox="0 0 540 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Artisanal glass teapot with living steeping tea"
      >
        <defs>
          <clipPath id="teapotBellyClip">
            <path d="M 172 205 C 160 170 190 152 240 152 L 270 152 C 320 152 350 170 338 205 C 368 245 365 305 320 326 L 190 326 C 145 305 142 245 172 205 Z" />
          </clipPath>

          <linearGradient id="glassSheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id="mercuryGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#C9A24B" />
            <stop offset="100%" stopColor="#E65100" />
          </linearGradient>

          <linearGradient id="streamWaterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E0F7FA" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#80DEEA" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* ─── 1. WARMER STAND & FLICKERING FLAME ─── */}
        <g className="tm-warmer-stand-group">
          <rect
            x="120"
            y="342"
            width="270"
            height="22"
            rx="11"
            fill="#FAF6ED"
            stroke="#D8C59A"
            strokeWidth="2"
          />
          <circle cx="230" cy="353" r="3" fill="#C9A24B" />
          <circle cx="255" cy="353" r="4" fill="#C9A24B" />
          <circle cx="280" cy="353" r="3" fill="#C9A24B" />

          <path
            d="M 155 342 C 155 330 355 330 355 342"
            stroke="#0B2B1E"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          <ellipse
            cx="255"
            cy="338"
            rx="55"
            ry="12"
            fill="#FFA726"
            opacity="0.35"
            className="tm-glow-pulse"
          />

          <g className="tm-flames-cluster">
            <path
              d="M 235 340 Q 240 318 243 324 Q 248 314 250 340 Z"
              fill="#FFB74D"
              className="tm-flame-1"
            />
            <path
              d="M 248 340 Q 255 310 258 318 Q 263 312 265 340 Z"
              fill="#FF9800"
              className="tm-flame-2"
            />
            <path
              d="M 262 340 Q 267 320 270 326 Q 275 316 277 340 Z"
              fill="#FFB74D"
              className="tm-flame-3"
            />
          </g>
        </g>

        {/* ─── 2. TEAPOT INTERIOR (CLIPPED): LIQUID, LEAVES, EXTRAS ─── */}
        <g clipPath="url(#teapotBellyClip)">
          <rect
            x="130"
            y={fillY}
            width="250"
            height={340 - fillY}
            fill={liquorColor}
            opacity={isHeating ? 0.45 : isSteeping ? 0.75 + steepRatio * 0.2 : 0.65}
            className="tm-tea-liquid-rect"
          />

          <ellipse
            cx="255"
            cy={fillY}
            rx="85"
            ry="10"
            fill={liquorColor}
            opacity="0.9"
            className="tm-tea-liquid-surface"
          />

          {(!isHeating || isLeaves) && (
            <g className="tm-floating-leaves-group">
              <path
                d="M 215 285 C 225 275 240 280 248 290 C 238 295 220 295 215 285 Z"
                fill="#2D5A3F"
                stroke="#1B432C"
                strokeWidth="1"
                className="tm-pot-leaf leaf-sway-1"
              />
              <path
                d="M 285 280 C 295 272 310 278 315 288 C 305 292 290 290 285 280 Z"
                fill="#3B6E48"
                stroke="#1B432C"
                strokeWidth="1"
                className="tm-pot-leaf leaf-sway-2"
              />
              <path
                d="M 245 260 C 255 250 270 255 275 266 C 265 270 250 268 245 260 Z"
                fill="#244B34"
                stroke="#1B432C"
                strokeWidth="1"
                className="tm-pot-leaf leaf-sway-3"
              />
              <path
                d="M 195 270 C 205 262 218 266 222 274 C 214 278 200 276 195 270 Z"
                fill="#366542"
                stroke="#1B432C"
                strokeWidth="1"
                className="tm-pot-leaf leaf-sway-4"
              />
              <path
                d="M 270 300 C 280 292 295 296 298 306 C 290 310 276 308 270 300 Z"
                fill="#2D5A3F"
                stroke="#1B432C"
                strokeWidth="1"
                className="tm-pot-leaf leaf-sway-5"
              />
            </g>
          )}

          {/* Selected Extras Floating Inside */}
          {selectedExtras.includes("lemon") && (
            <g className="tm-pot-extra lemon-slice-svg">
              <circle cx="230" cy="245" r="19" fill="#FFF59D" stroke="#FBC02D" strokeWidth="2.5" opacity="0.88" />
              <circle cx="230" cy="245" r="16" fill="#FFEE58" opacity="0.6" />
              <line x1="230" y1="229" x2="230" y2="261" stroke="#FBC02D" strokeWidth="1.5" />
              <line x1="214" y1="245" x2="246" y2="245" stroke="#FBC02D" strokeWidth="1.5" />
              <line x1="219" y1="234" x2="241" y2="256" stroke="#FBC02D" strokeWidth="1.5" />
              <line x1="219" y1="256" x2="241" y2="234" stroke="#FBC02D" strokeWidth="1.5" />
            </g>
          )}

          {selectedExtras.includes("jaggery") && (
            <g className="tm-pot-extra jaggery-cubes-svg">
              <rect x="270" y="300" width="16" height="13" rx="2" fill="#8D5524" stroke="#5D3A1A" strokeWidth="1.5" />
              <rect x="282" y="305" width="14" height="12" rx="2" fill="#B06D3B" stroke="#6D4321" strokeWidth="1.5" />
            </g>
          )}

          {selectedExtras.includes("mint") && (
            <g className="tm-pot-extra mint-leaves-svg">
              <path d="M 260 235 C 270 225 285 230 288 242 C 278 248 262 245 260 235 Z" fill="#4CAF50" stroke="#2E7D32" strokeWidth="1.2" />
            </g>
          )}

          {selectedExtras.includes("lemongrass") && (
            <g className="tm-pot-extra lemongrass-svg">
              <line x1="205" y1="250" x2="225" y2="300" stroke="#81C784" strokeWidth="3" strokeLinecap="round" />
              <line x1="212" y1="252" x2="232" y2="302" stroke="#A5D6A7" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}

          {selectedExtras.includes("honey") && (
            <path
              d="M 240 310 Q 255 315 270 310 Q 255 318 240 310 Z"
              fill="#FFB300"
              opacity="0.8"
            />
          )}

          <path
            d="M 180 200 C 175 230 178 280 200 305"
            stroke="url(#glassSheen)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          />
        </g>

        {/* ─── 3. GLASS TEAPOT BODY OUTLINES ─── */}
        <path
          d="M 175 265 C 135 255 95 200 85 160 C 98 165 118 175 130 195 C 145 220 162 245 185 255 Z"
          fill="rgba(255,255,255,0.35)"
          stroke="#0B2B1E"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        <path
          d="M 172 205 C 160 170 190 152 240 152 L 270 152 C 320 152 350 170 338 205 C 368 245 365 305 320 326 L 190 326 C 145 305 142 245 172 205 Z"
          fill="none"
          stroke="#0B2B1E"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />

        <path
          d="M 335 185 C 390 175 410 225 405 270 C 400 302 368 320 325 308"
          fill="none"
          stroke="#0B2B1E"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <ellipse cx="255" cy="152" rx="42" ry="7" fill="rgba(255,255,255,0.7)" stroke="#0B2B1E" strokeWidth="2.2" />

        <path
          d="M 220 152 C 220 138 290 138 290 152 Z"
          fill="rgba(255,255,255,0.8)"
          stroke="#0B2B1E"
          strokeWidth="2"
        />
        <circle cx="255" cy="138" r="7" fill="#C9A24B" stroke="#0B2B1E" strokeWidth="1.8" />

        {/* ─── 4. WATER STREAM & SURFACE RIPPLES (POUR PHASE) ─── */}
        {isPouring && (
          <g className="tm-water-pouring-animation">
            <path
              d="M 430 40 C 350 85 270 105 255 152"
              fill="none"
              stroke="url(#streamWaterGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              className="tm-water-stream-flow"
            />
            <ellipse
              cx="255"
              cy="210"
              rx="24"
              ry="6"
              fill="none"
              stroke="#E0F7FA"
              strokeWidth="2"
              className="tm-splash-ring"
            />
          </g>
        )}

        {/* ─── 5. LIVING STEAM WISPS ─── */}
        {(isHeating || isPouring || isSteeping || isStraining || isEnjoy) && (
          <g className="tm-steam-wisps-group">
            <path
              d="M 85 155 Q 75 130 90 110 Q 75 90 85 70"
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="tm-steam-wisp-line wisp-spout"
            />
            <path
              d="M 245 132 Q 235 105 250 80 Q 235 55 245 35"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="4"
              strokeLinecap="round"
              className="tm-steam-wisp-line wisp-mid"
            />
            <path
              d="M 265 134 Q 280 110 265 85 Q 280 60 270 40"
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="tm-steam-wisp-line wisp-right"
            />
          </g>
        )}

        {/* ─── 6. VERTICAL THERMOMETER GAUGE (MATCHING REFERENCE) ─── */}
        <g className="tm-thermometer-group" transform="translate(435, 140)">
          <rect x="0" y="0" width="8" height="130" rx="4" fill="#F0EAE0" stroke="#C9A24B" strokeWidth="1.2" />
          <rect
            x="1.5"
            y={Math.max(0, 130 - (waterHeatTemp / 100) * 126)}
            width="5"
            height={(waterHeatTemp / 100) * 126}
            rx="2.5"
            fill="url(#mercuryGrad)"
            className="tm-mercury-fill"
          />
          <circle cx="4" cy="132" r="7" fill="#E65100" stroke="#C9A24B" strokeWidth="1.2" />

          <text x="18" y="55" fill="#0B2B1E" fontSize="15" fontWeight="700" fontFamily="Georgia, serif">
            {temperature}°C
          </text>
          <text x="18" y="70" fill="rgba(11, 43, 30, 0.65)" fontSize="8.5" fontWeight="500">
            Brewing at the
          </text>
          <text x="18" y="80" fill="rgba(11, 43, 30, 0.65)" fontSize="8.5" fontWeight="500">
            perfect temperature
          </text>
        </g>
      </svg>
    </div>
  );
}

function AnimatedTeacupIllustration({
  teaType,
}: {
  teaType: TeaType;
}) {
  const liquorFill =
    teaType === "Green Tea"
      ? "#9BBD58"
      : teaType === "Black Tea"
      ? "#B85D19"
      : "#C27D24";

  return (
    <div className="tm-teacup-illustration-container">
      <svg
        className="tm-teacup-svg"
        viewBox="0 0 460 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Artisanal glass teacup filled with freshly steeped tea"
      >
        <defs>
          <radialGradient id="cupAuraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C9A24B" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#C9A24B" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#C9A24B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ─── 1. EXPANDING WATER RIPPLES UNDER SAUCER ─── */}
        <ellipse
          cx="210"
          cy="225"
          rx="150"
          ry="25"
          fill="none"
          stroke="#D8C59A"
          strokeWidth="1.5"
          className="tm-ripple-wave wave-1"
        />
        <ellipse
          cx="210"
          cy="225"
          rx="180"
          ry="30"
          fill="none"
          stroke="#D8C59A"
          strokeWidth="1"
          className="tm-ripple-wave wave-2"
        />

        <circle cx="210" cy="180" r="120" fill="url(#cupAuraGlow)" />

        {/* ─── 2. GLASS SAUCER ─── */}
        <ellipse cx="210" cy="225" rx="125" ry="22" fill="#FAF7F0" stroke="#0B2B1E" strokeWidth="2.2" />
        <ellipse cx="210" cy="225" rx="108" ry="17" fill="none" stroke="#C9A24B" strokeWidth="1.5" />

        {/* ─── 3. GLASS TEACUP BODY & INFUSED TEA ─── */}
        <path
          d="M 125 150 C 125 210 165 220 210 220 C 255 220 295 210 295 150 Z"
          fill={liquorFill}
          opacity="0.85"
          stroke="#0B2B1E"
          strokeWidth="2.5"
        />

        <ellipse cx="210" cy="150" rx="85" ry="16" fill={liquorFill} stroke="#0B2B1E" strokeWidth="2.2" />

        <path
          d="M 140 165 C 138 185 150 205 170 212"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        <path
          d="M 215 152 C 228 145 248 148 258 156 C 245 163 226 161 215 152 Z"
          fill="#2E6B3E"
          stroke="#1B492A"
          strokeWidth="1"
          className="tm-floating-leaf-single"
        />

        <path
          d="M 292 165 C 332 160 340 198 300 208"
          fill="none"
          stroke="#0B2B1E"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* ─── 4. DELICATE RISING STEAM TRAILS ─── */}
        <g className="tm-cup-steam-trails">
          <path
            d="M 185 135 Q 175 105 190 75 Q 175 45 185 20"
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="tm-steam-trail trail-1"
          />
          <path
            d="M 215 130 Q 230 100 215 70 Q 230 40 220 15"
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="4"
            strokeLinecap="round"
            className="tm-steam-trail trail-2"
          />
          <path
            d="M 240 135 Q 230 105 245 75 Q 230 45 240 20"
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="tm-steam-trail trail-3"
          />
        </g>
      </svg>
    </div>
  );
}

// ─── Reference Stepper for Steps 6 & 7 ──────────────────────────────
function ReferenceStepNav({ step }: { step: 6 | 7 }) {
  const steps = [
    { num: 1, name: "Choose Tea" },
    { num: 2, name: "Mood" },
    { num: 3, name: "Method" },
    { num: 4, name: "Temperature" },
    { num: 5, name: "Amount" },
    { num: 6, name: "Brewing" },
    { num: 7, name: "Result" },
  ];

  return (
    <div className="tm-reference-stepper" aria-label="Step Progress">
      <span className="tm-reference-step-counter">{step} / 7</span>
      <div className="tm-reference-timeline">
        {steps.map((s, idx) => {
          const isDone = s.num < step;
          const isCurrent = s.num === step;
          return (
            <React.Fragment key={s.num}>
              <div className={`tm-ref-node ${isCurrent ? "current" : isDone ? "done" : "pending"}`}>
                <span className="tm-ref-dot" />
                <span className="tm-ref-label">{s.name}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`tm-ref-line ${s.num < step ? "done" : ""}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function TeaMaker() {
  const { addToCart, openCart } = useCart();
  const { products } = useProducts();

  // ─── Filter only legitimate Tea Products (exclude Teaware & Gifting) ──
  const teaProducts = useMemo(() => {
    return products.filter((p) => {
      const cat = (p.category || "").toLowerCase();
      return (
        !p.isRemoved &&
        p.isActive !== false &&
        cat !== "teaware" &&
        cat !== "gifting" &&
        !cat.includes("hamper")
      );
    });
  }, [products]);

  // ─── 7-Step State Model ─────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedProductId, setSelectedProductId] = useState<string | number>(() => {
    return teaProducts[0]?.id || 1;
  });

  // Keep selectedProduct in sync with live catalog
  const selectedProduct = useMemo<Product>(() => {
    return (
      teaProducts.find((p) => String(p.id) === String(selectedProductId)) ||
      teaProducts[0] || {
        id: 1,
        name: "Natural Green Tea",
        category: "Green Tea",
        origin: "Darjeeling",
        caffeine: "Medium",
        price: 699,
        image: "/leafly-green-tea.webp",
      }
    );
  }, [teaProducts, selectedProductId]);

  const teaType = useMemo<TeaType>(() => {
    return mapProductToTeaType(selectedProduct);
  }, [selectedProduct]);

  const teaColors = useMemo(() => getTeaTypeColors(teaType), [teaType]);

  // Step 2: Mood
  const [selectedMood, setSelectedMood] = useState<string>("morning-energy");

  // Step 3: Method
  const [selectedMethodId, setSelectedMethodId] = useState<string>("teapot");
  const selectedMethod = useMemo<BrewMethod>(() => {
    return BREW_METHODS.find((m) => m.id === selectedMethodId) || BREW_METHODS[0];
  }, [selectedMethodId]);

  // Step 4: Temperature
  const [temperature, setTemperature] = useState<number>(80);

  // Step 5: Measurements & Extras
  const [cupCount, setCupCount] = useState<number>(1);
  const [selectedExtras, setSelectedExtras] = useState<IngredientId[]>([]);

  // Derived quantities
  const teaGrams = useMemo(() => {
    const basePerCup = selectedMethod.id === "gaiwan" ? 4.0 : 2.5;
    return Number((cupCount * basePerCup).toFixed(1));
  }, [cupCount, selectedMethod]);

  const waterMl = useMemo(() => {
    const mlPerCup = selectedMethod.id === "gaiwan" ? 120 : 200;
    return cupCount * mlPerCup;
  }, [cupCount, selectedMethod]);

  // Step 6: Ritual Stages
  // Stages: "heat" -> "leaves" -> "extras" -> "pour" -> "steep" -> "strain" -> "enjoy"
  type RitualPhase = "heat" | "leaves" | "extras" | "pour" | "steep" | "strain" | "enjoy";
  const [ritualPhase, setRitualPhase] = useState<RitualPhase>("heat");
  const [waterHeatTemp, setWaterHeatTemp] = useState<number>(25);
  const [steepTotalSec, setSteepTotalSec] = useState<number>(150);
  const [timeLeft, setTimeLeft] = useState<number>(150);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [addedToCartSuccess, setAddedToCartSuccess] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const sequenceTimersRef = useRef<number[]>([]);

  const clearSequence = () => {
    sequenceTimersRef.current.forEach((t) => clearTimeout(t));
    sequenceTimersRef.current = [];
  };

  // Scroll to wizard on step change
  useEffect(() => {
    const el = document.getElementById("tea-maker-card-anchor");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentStep]);

  // Auto-tune default temp & steep when tea or method changes
  useEffect(() => {
    if (teaType === "Green Tea") {
      setTemperature(selectedMethod.id === "coldbrew" ? 20 : 85);
      setSteepTotalSec(selectedMethod.id === "gaiwan" ? 45 : selectedMethod.id === "teapot" ? 135 : 150);
    } else if (teaType === "Black Tea") {
      setTemperature(selectedMethod.id === "coldbrew" ? 20 : 95);
      setSteepTotalSec(selectedMethod.id === "gaiwan" ? 45 : selectedMethod.id === "teapot" ? 150 : 180);
    } else {
      setTemperature(selectedMethod.id === "coldbrew" ? 20 : 90);
      setSteepTotalSec(selectedMethod.id === "gaiwan" ? 40 : selectedMethod.id === "teapot" ? 140 : 160);
    }
  }, [teaType, selectedMethod]);

  // ─── Step 6 Ritual Sequence Controller ──────────────────────────────
  const startRitualSequence = useCallback(() => {
    clearSequence();
    if (timerRef.current) clearInterval(timerRef.current);

    setRitualPhase("heat");
    setWaterHeatTemp(25);
    setTimeLeft(steepTotalSec);
    setIsPaused(false);
    setAddedToCartSuccess(false);

    // 1. Water Heating (animate 25°C to target temperature over 2.2s)
    const heatStepInterval = 100;
    const totalHeatSteps = 22;
    const tempIncrement = (temperature - 25) / totalHeatSteps;
    let stepCount = 0;

    const heatInterval = window.setInterval(() => {
      stepCount++;
      setWaterHeatTemp((prev) => Math.min(temperature, Math.round(prev + tempIncrement)));
      if (stepCount >= totalHeatSteps) {
        clearInterval(heatInterval);
      }
    }, heatStepInterval);

    // 2. Add Tea Leaves (after 2.4s)
    const tLeaves = window.setTimeout(() => {
      setRitualPhase("leaves");

      // 3. Add Extras or skip directly to Pour
      const tExtras = window.setTimeout(() => {
        if (selectedExtras.length > 0) {
          setRitualPhase("extras");
          const totalExtrasDuration = selectedExtras.length * 900 + 400;
          const tPour = window.setTimeout(() => {
            setRitualPhase("pour");
            const tSteep = window.setTimeout(() => {
              setRitualPhase("steep");
            }, 2000);
            sequenceTimersRef.current.push(tSteep);
          }, totalExtrasDuration);
          sequenceTimersRef.current.push(tPour);
        } else {
          // Pure orthodox leaf: transition to pour
          setRitualPhase("pour");
          const tSteep = window.setTimeout(() => {
            setRitualPhase("steep");
          }, 2000);
          sequenceTimersRef.current.push(tSteep);
        }
      }, 2200);
      sequenceTimersRef.current.push(tExtras);
    }, 2400);
    sequenceTimersRef.current.push(tLeaves);
  }, [temperature, selectedExtras, steepTotalSec]);

  // Launch ritual when user navigates to Step 6
  useEffect(() => {
    if (currentStep === 6) {
      startRitualSequence();
    }
    return () => {
      clearSequence();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep, startRitualSequence]);

  // Steeping Countdown Timer
  useEffect(() => {
    if (currentStep === 6 && ritualPhase === "steep" && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Finish steeping -> Strain -> Enjoy -> Directly Reveal Step 7
            setRitualPhase("strain");
            const tEnjoy = window.setTimeout(() => {
              setRitualPhase("enjoy");
              const tStep7 = window.setTimeout(() => {
                setCurrentStep(7);
              }, 1400);
              sequenceTimersRef.current.push(tStep7);
            }, 1800);
            sequenceTimersRef.current.push(tEnjoy);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep, ritualPhase, isPaused]);

  const handleSkipTimer = () => {
    clearSequence();
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);
    setRitualPhase("strain");
    const tEnjoy = window.setTimeout(() => {
      setRitualPhase("enjoy");
      const tStep7 = window.setTimeout(() => {
        setCurrentStep(7);
      }, 1200);
      sequenceTimersRef.current.push(tStep7);
    }, 1000);
    sequenceTimersRef.current.push(tEnjoy);
  };

  const handlePauseResume = () => {
    setIsPaused((prev) => !prev);
  };

  const handleRestartRitual = () => {
    startRitualSequence();
  };

  // Toggle Ingredient
  const handleToggleExtra = (id: IngredientId) => {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Add brewed tea to cart from Step 7
  const handleAddToCartFromRitual = () => {
    addToCart(selectedProduct, cupCount, "100g", selectedProduct.price);
    setAddedToCartSuccess(true);
    openCart();
    setTimeout(() => setAddedToCartSuccess(false), 3000);
  };

  // Steeping progress percentage for ring animation (0 to 1)
  const steepRatio = useMemo(() => {
    if (steepTotalSec <= 0) return 1;
    return Math.min(1, Math.max(0, (steepTotalSec - timeLeft) / steepTotalSec));
  }, [steepTotalSec, timeLeft]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Human-readable extras text matching reference (e.g. "Lemon, Jaggery")
  const selectedExtrasText = useMemo(() => {
    if (selectedExtras.length === 0) return "Pure Whole Leaf";
    return selectedExtras
      .map((id) => {
        const ing = INGREDIENTS.find((i) => i.id === id);
        if (!ing) return "";
        return ing.name
          .replace(" Slice", "")
          .replace("Pure ", "")
          .replace("Fresh ", "")
          .replace("Crushed ", "")
          .replace("Malabar ", "")
          .replace("Himalayan ", "")
          .replace("Raw Forest ", "");
      })
      .filter(Boolean)
      .join(", ");
  }, [selectedExtras]);

  // Overall brewing ritual progress percentage (matching 65% for pour in reference)
  const ritualProgressPct = useMemo(() => {
    switch (ritualPhase) {
      case "heat":
        return Math.min(23, Math.round(5 + (waterHeatTemp / Math.max(1, temperature)) * 18));
      case "leaves":
        return 35;
      case "extras":
        return 48;
      case "pour":
        return 65;
      case "steep":
        return Math.min(95, Math.round(65 + steepRatio * 30));
      case "strain":
        return 98;
      case "enjoy":
        return 100;
      default:
        return 0;
    }
  }, [ritualPhase, waterHeatTemp, temperature, steepRatio]);

  // Dynamic narrative phrase for the status card
  const narrativeInfo = useMemo(() => {
    switch (ritualPhase) {
      case "heat":
        return {
          title: "Heating Spring Water...",
          sub: `Reaching precision extraction temperature (${waterHeatTemp}°C / ${temperature}°C)`,
        };
      case "leaves":
        return {
          title: "Adding Orthodox Leaves...",
          sub: `Awakening ${teaGrams}.0g high-altitude single-origin leaves`,
        };
      case "extras":
        return {
          title: "Infusing Botanicals...",
          sub: selectedExtras.length > 0 ? selectedExtrasText : "Pure unblended orthodox clarity",
        };
      case "pour":
        return {
          title: "Pouring Water...",
          sub: "Bringing everything together",
        };
      case "steep":
        return {
          title: "Steeping...",
          sub: isPaused
            ? `Steeping paused — ${formatTimer(timeLeft)} remaining`
            : `Releasing delicate flavonoids and aroma — ${formatTimer(timeLeft)} left`,
        };
      case "strain":
        return {
          title: "Removing Leaves...",
          sub: "Decanting liquor to lock in nuanced sweetness",
        };
      case "enjoy":
        return {
          title: "Tea Is Beautifully Ready",
          sub: "Pouring into your perfect cup",
        };
      default:
        return { title: "Preparing...", sub: "Good tea takes its time" };
    }
  }, [ritualPhase, waterHeatTemp, temperature, teaGrams, selectedExtras.length, selectedExtrasText, isPaused, timeLeft]);

  return (
    <div
      className="tea-maker-page"
      data-tea-type={teaType}
      style={
        {
          "--tm-accent": teaColors.accent,
          "--tm-accent-light": teaColors.accentLight,
          "--tm-accent-glow": teaColors.accentGlow,
          "--tm-liquor-light": teaColors.liquorLight,
          "--tm-liquor-deep": teaColors.liquorDeep,
        } as React.CSSProperties
      }
    >
      <SEO
        title="Interactive Tea Maker & Steeping Ritual | Leafly"
        description="Experience mindful orthodox brewing. Customize single-origin harvests, water temperature, steeping timers, and botanical extras."
        canonicalPath="/tea-maker"
        schema={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tea Maker", url: "/tea-maker" },
        ])}
      />

      {/* 1. EDITORIAL HERO SECTION */}
      <section className="tm-hero">
        <div className="tm-hero-bg-glow" aria-hidden="true" />
        <div className="tm-container">
          <div className="tm-eyebrow">
            <span className="tm-eyebrow-line" />
            <p>ARTISANAL EXTRACTION STUDIO</p>
            <span className="tm-eyebrow-line" />
          </div>
          <h1 className="tm-title">The Art of Mindful Brewing</h1>
          <p className="tm-subtitle">
            Awaken orthodox Darjeeling leaves with precision water temperature,
            sacred time, and hand-selected Ayurvedic botanicals.
          </p>
          <div className="tm-hero-badges">
            <span className="tm-badge-pill">🍃 Single-Origin Orthodox</span>
            <span className="tm-badge-pill">♨ Thermal Precision</span>
            <span className="tm-badge-pill">⏳ Real Steeping Engine</span>
          </div>
        </div>
      </section>

      {/* 2. SOUNDSCAPE AMBIENT MEDITATION */}
      <TeaRitualSoundscape />

      {/* 3. SEVEN-STEP WIZARD CONTAINER */}
      <main id="tea-maker-card-anchor" className="tm-main-section">
        <div className="tm-container">
          {/* STEP PROGRESS STEPPER (Steps 1-5 use default, Steps 6-7 use reference stepper) */}
          {currentStep < 6 && (
            <nav className="tm-stepper-nav" aria-label="Brewing Ritual Steps">
              <ol className="tm-stepper-list">
                {STEP_TABS.map((tab) => {
                  const isCurrent = currentStep === tab.num;
                  const isDone = currentStep > tab.num;
                  return (
                    <li
                      key={tab.num}
                      className={`tm-step-item ${isCurrent ? "current" : ""} ${isDone ? "completed" : ""}`}
                    >
                      <button
                        type="button"
                        className="tm-step-btn"
                        onClick={() => {
                          // Allow navigation back to any earlier step
                          if (tab.num < currentStep) setCurrentStep(tab.num);
                        }}
                        disabled={tab.num > currentStep}
                        aria-current={isCurrent ? "step" : undefined}
                      >
                        <span className="tm-step-bubble">
                          {isDone ? "✓" : `0${tab.num}`}
                        </span>
                        <span className="tm-step-text">
                          <small>{tab.label}</small>
                          <strong>{tab.stepName}</strong>
                        </span>
                      </button>
                      {tab.num < 7 && <span className="tm-step-connector" aria-hidden="true" />}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}

          {/* ACTIVE STEP CARD CONTAINER */}
          <div className="tm-card-wrapper">
            {/* ══════════════════════════════════════════════════════════
                STEP 1: CHOOSE YOUR TEA
                ══════════════════════════════════════════════════════════ */}
            {currentStep === 1 && (
              <section className="tm-step-pane" aria-labelledby="step1-title">
                <header className="tm-pane-header">
                  <span className="tm-pane-tag">STEP 01 OF 07 · THE HARVEST</span>
                  <h2 id="step1-title" className="tm-pane-title">Choose Your Single-Origin Tea</h2>
                  <p className="tm-pane-desc">
                    Directly sourced from high-mountain Darjeeling estates.
                    Each tea varietal features distinct terroir, leaf rolling, and aromatic profiles.
                  </p>
                </header>

                <div className="tm-tea-grid">
                  {teaProducts.map((p) => {
                    const isSelected = String(p.id) === String(selectedProduct.id);
                    const prodType = mapProductToTeaType(p);
                    const colors = getTeaTypeColors(prodType);

                    return (
                      <article
                        key={p.id}
                        className={`tm-tea-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedProductId(p.id)}
                        style={{
                          borderColor: isSelected ? colors.accent : undefined,
                        }}
                      >
                        <div className="tm-tea-card-image-wrap">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="tm-tea-card-img"
                            loading="lazy"
                            width={320}
                            height={320}
                          />
                          <span
                            className="tm-tea-type-badge"
                            style={{
                              backgroundColor: colors.badgeBg,
                              color: colors.accent,
                              borderColor: colors.accent,
                            }}
                          >
                            {prodType}
                          </span>
                          {isSelected && <span className="tm-check-mark">✓ Selected</span>}
                        </div>

                        <div className="tm-tea-card-content">
                          <p className="tm-tea-origin">✦ {p.origin || "Darjeeling"} · {p.caffeine || "Medium"} Caffeine</p>
                          <h3 className="tm-tea-name">{p.name}</h3>
                          <p className="tm-tea-desc">
                            {p.description || "Hand-plucked tender orthodox leaves crafted for balanced aromatics."}
                          </p>

                          <div className="tm-tea-footer">
                            <span className="tm-tea-price">₹{Number(p.price).toLocaleString("en-IN")}</span>
                            <span className="tm-tea-rating">★ {p.rating ?? 4.9}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="tm-pane-actions">
                  <div className="tm-selected-summary">
                    <span>Selected:</span>
                    <strong>{selectedProduct.name}</strong> ({teaType})
                  </div>
                  <button
                    type="button"
                    className="tm-primary-btn"
                    onClick={() => setCurrentStep(2)}
                  >
                    Select Mood &amp; Moment →
                  </button>
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 2: MOOD & MOMENT
                ══════════════════════════════════════════════════════════ */}
            {currentStep === 2 && (
              <section className="tm-step-pane" aria-labelledby="step2-title">
                <header className="tm-pane-header">
                  <span className="tm-pane-tag">STEP 02 OF 07 · MINDFUL INTENTION</span>
                  <h2 id="step2-title" className="tm-pane-title">What Is Your Moment?</h2>
                  <p className="tm-pane-desc">
                    In Indian tea tradition, the spirit in which tea is brewed frames the tasting experience.
                    Select your focus for this session.
                  </p>
                </header>

                <div className="tm-mood-grid">
                  {MOODS.map((m) => {
                    const isSelected = selectedMood === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`tm-mood-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedMood(m.id)}
                      >
                        <div className="tm-mood-icon-bubble" aria-hidden="true">
                          {m.icon}
                        </div>
                        <h3 className="tm-mood-title">{m.title}</h3>
                        <p className="tm-mood-tagline">{m.tagline}</p>
                        {isSelected && <span className="tm-mood-selected-indicator">Selected Intention ✓</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="tm-pane-actions">
                  <button
                    type="button"
                    className="tm-secondary-btn"
                    onClick={() => setCurrentStep(1)}
                  >
                    ← Back to Tea
                  </button>
                  <button
                    type="button"
                    className="tm-primary-btn"
                    onClick={() => setCurrentStep(3)}
                  >
                    Choose Brewing Vessel →
                  </button>
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 3: BREWING METHOD & VESSEL
                ══════════════════════════════════════════════════════════ */}
            {currentStep === 3 && (
              <section className="tm-step-pane" aria-labelledby="step3-title">
                <header className="tm-pane-header">
                  <span className="tm-pane-tag">STEP 03 OF 07 · THE VESSEL</span>
                  <h2 id="step3-title" className="tm-pane-title">Select Your Brewing Method</h2>
                  <p className="tm-pane-desc">
                    Vessel volume, thermal inertia, and circulation shape how volatile top notes unfurl from the leaf.
                  </p>
                </header>

                <div className="tm-method-grid">
                  {BREW_METHODS.map((m) => {
                    const isSelected = selectedMethodId === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`tm-method-card ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedMethodId(m.id);
                          setTemperature(m.recommendedTemp);
                          setSteepTotalSec(m.recommendedTimeSec);
                        }}
                      >
                        <span className="tm-method-icon" aria-hidden="true">
                          {m.icon}
                        </span>
                        <h3 className="tm-method-name">{m.name}</h3>
                        <p className="tm-method-tagline">{m.tagline}</p>

                        <div className="tm-method-specs">
                          <span className="tm-spec-pill">♨ Rec: {m.recommendedTemp}°C</span>
                          <span className="tm-spec-pill">⏳ {m.recommendedTimeSec}s</span>
                        </div>

                        {isSelected && <div className="tm-method-active-tag">Active Vessel ✓</div>}
                      </div>
                    );
                  })}
                </div>

                <div className="tm-pane-actions">
                  <button
                    type="button"
                    className="tm-secondary-btn"
                    onClick={() => setCurrentStep(2)}
                  >
                    ← Back to Moment
                  </button>
                  <button
                    type="button"
                    className="tm-primary-btn"
                    onClick={() => setCurrentStep(4)}
                  >
                    Set Water Temperature →
                  </button>
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 4: WATER TEMPERATURE CONTROL (CIRCULAR DIAL)
                ══════════════════════════════════════════════════════════ */}
            {currentStep === 4 && (
              <section className="tm-step-pane" aria-labelledby="step4-title">
                <header className="tm-pane-header">
                  <span className="tm-pane-tag">STEP 04 OF 07 · THERMAL PRECISION</span>
                  <h2 id="step4-title" className="tm-pane-title">Adjust Water Temperature</h2>
                  <p className="tm-pane-desc">
                    Water temperature determines the balance of amino acids (sweetness) vs catechins (astringency).
                    Gentle heat protects delicate first flush leaves.
                  </p>
                </header>

                <div className="tm-temp-control-card">
                  {/* SVG CIRCULAR TEMPERATURE DIAL */}
                  <div className="tm-circular-dial-container">
                    <svg
                      className="tm-circular-svg"
                      viewBox="0 0 240 240"
                      aria-hidden="true"
                    >
                      {/* Background circle track */}
                      <circle
                        cx="120"
                        cy="120"
                        r="95"
                        className="tm-dial-track"
                        strokeWidth="10"
                        fill="none"
                      />
                      {/* Animated temperature arc (60°C to 100°C -> fraction 0 to 1) */}
                      {/* Circumference = 2 * PI * 95 = ~596.9 */}
                      <circle
                        cx="120"
                        cy="120"
                        r="95"
                        className="tm-dial-progress"
                        strokeWidth="12"
                        strokeDasharray={596.9}
                        strokeDashoffset={596.9 * (1 - Math.max(0, Math.min(1, (temperature - 60) / 40)))}
                        strokeLinecap="round"
                        transform="rotate(-90 120 120)"
                        fill="none"
                      />
                    </svg>

                    {/* Central Display Values */}
                    <div className="tm-dial-center-content">
                      <span className="tm-dial-label">TARGET HEAT</span>
                      <span className="tm-dial-val">{temperature}°C</span>
                      <span className="tm-dial-subval">{Math.round(temperature * 1.8 + 32)}°F</span>
                      <span className="tm-dial-leaf-type">Ideal for {teaType}</span>
                    </div>
                  </div>

                  {/* Interactive Slider Fallback & Fine Adjustment */}
                  <div className="tm-temp-slider-group">
                    <label htmlFor="tempSlider" className="tm-slider-label">
                      <span>60°C (Gentle)</span>
                      <span>{temperature}°C</span>
                      <span>100°C (Rolling Boil)</span>
                    </label>
                    <input
                      id="tempSlider"
                      type="range"
                      min={60}
                      max={100}
                      step={1}
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="tm-temp-range-input"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="tm-temp-presets">
                    {[
                      { val: 75, label: "75°C · Delicate" },
                      { val: 80, label: "80°C · Spring Green" },
                      { val: 85, label: "85°C · First Flush" },
                      { val: 90, label: "90°C · Mountain Oolong" },
                      { val: 95, label: "95°C · Golden Dusk" },
                      { val: 100, label: "100°C · Full Boil" },
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset.val}
                        className={`tm-preset-btn ${temperature === preset.val ? "active" : ""}`}
                        onClick={() => setTemperature(preset.val)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tm-pane-actions">
                  <button
                    type="button"
                    className="tm-secondary-btn"
                    onClick={() => setCurrentStep(3)}
                  >
                    ← Back to Vessel
                  </button>
                  <button
                    type="button"
                    className="tm-primary-btn"
                    onClick={() => setCurrentStep(5)}
                  >
                    Measure Leaves &amp; Extras →
                  </button>
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 5: TEA + WATER + EXTRAS
                ══════════════════════════════════════════════════════════ */}
            {currentStep === 5 && (
              <section className="tm-step-pane" aria-labelledby="step5-title">
                <header className="tm-pane-header">
                  <span className="tm-pane-tag">STEP 05 OF 07 · MEASURE &amp; BOTANICALS</span>
                  <h2 id="step5-title" className="tm-pane-title">Cups, Leaves &amp; Ayurvedic Extras</h2>
                  <p className="tm-pane-desc">
                    Select your desired serving volume. Enrich your ritual with traditional Indian botanicals,
                    spices, and natural honey sweeteners.
                  </p>
                </header>

                {/* CUP COUNTER & LEAF WEIGHT CALCULATOR */}
                <div className="tm-measure-panel">
                  <div className="tm-measure-card">
                    <span className="tm-measure-label">SERVING QUANTITY</span>
                    <div className="tm-cups-stepper">
                      {[1, 2, 3, 4].map((cnt) => (
                        <button
                          type="button"
                          key={cnt}
                          className={`tm-cup-btn ${cupCount === cnt ? "active" : ""}`}
                          onClick={() => setCupCount(cnt)}
                        >
                          <span className="tm-cup-num">{cnt}</span>
                          <span className="tm-cup-name">{cnt === 1 ? "Cup" : "Cups"}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="tm-measure-calc-display">
                    <div className="tm-calc-item">
                      <span className="tm-calc-title">ORTHODOX TEA LEAVES</span>
                      <strong className="tm-calc-value">{teaGrams}g</strong>
                      <small className="tm-calc-hint">~{cupCount} heaping spoon{cupCount > 1 ? "s" : ""}</small>
                    </div>
                    <div className="tm-calc-sep" aria-hidden="true">·</div>
                    <div className="tm-calc-item">
                      <span className="tm-calc-title">SPRING WATER VOLUME</span>
                      <strong className="tm-calc-value">{waterMl}ml</strong>
                      <small className="tm-calc-hint">at {temperature}°C</small>
                    </div>
                  </div>
                </div>

                {/* PRESERVED ALL 7 EXISTING EXTRAS */}
                <div className="tm-extras-section">
                  <div className="tm-extras-header">
                    <h3 className="tm-extras-title">Select Botanical Extras (Optional)</h3>
                    <p className="tm-extras-subtitle">
                      Selected ingredients will be added sequentially during the Step 6 brewing ritual.
                    </p>
                  </div>

                  <div className="tm-extras-grid">
                    {INGREDIENTS.map((ing) => {
                      const isSelected = selectedExtras.includes(ing.id);
                      return (
                        <div
                          key={ing.id}
                          className={`tm-extra-card ${isSelected ? "selected" : ""}`}
                          onClick={() => handleToggleExtra(ing.id)}
                        >
                          <div className="tm-extra-img-wrap">
                            <img
                              src={ing.image}
                              alt={ing.name}
                              className="tm-extra-img"
                              width={80}
                              height={80}
                              loading="lazy"
                            />
                            <div className="tm-extra-checkbox">
                              {isSelected ? "✓" : "+"}
                            </div>
                          </div>
                          <div className="tm-extra-info">
                            <h4 className="tm-extra-name">{ing.name}</h4>
                            <span className="tm-extra-subtitle">{ing.subtitle}</span>
                            <p className="tm-extra-desc">{ing.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="tm-pane-actions">
                  <button
                    type="button"
                    className="tm-secondary-btn"
                    onClick={() => setCurrentStep(4)}
                  >
                    ← Back to Temperature
                  </button>
                  <button
                    type="button"
                    className="tm-primary-btn tm-btn-ritual-start"
                    onClick={() => setCurrentStep(6)}
                  >
                    Begin Brewing Ritual ♨ →
                  </button>
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 6: YOUR BREWING RITUAL (MATCHING REFERENCE IMAGE)
                ══════════════════════════════════════════════════════════ */}
            {currentStep === 6 && (
              <section className="tm-step-pane tm-ritual-pane-ref" aria-labelledby="step6-title">
                {/* Reference Stepper Bar: 6 / 7 */}
                <ReferenceStepNav step={6} />

                {/* Editorial Header */}
                <header className="tm-ritual-header-ref">
                  <div className="tm-ritual-header-text">
                    <span className="tm-eyebrow-tag">YOUR BREWING RITUAL</span>
                    <h2 id="step6-title" className="tm-ritual-title">
                      Let the leaves take their time.
                    </h2>
                    <p className="tm-ritual-subtitle">
                      Good tea is a moment, not a hurry.
                    </p>
                  </div>
                  <div className="tm-script-callout ritual-top-callout" aria-hidden="true">
                    <span>Good Tea</span>
                    <span>Better Days</span>
                  </div>
                </header>

                {/* 2-Column Ritual Layout */}
                <div className="tm-ritual-theatre-grid">
                  {/* Left Column: 7-Stage Checklist */}
                  <div className="tm-ritual-checklist-card">
                    <ol className="tm-stage-list">
                      {/* 1. Heat Water */}
                      <li
                        className={`tm-stage-item ${
                          ritualPhase === "heat"
                            ? "active"
                            : "done"
                        }`}
                      >
                        <span className="tm-stage-badge">1</span>
                        <div className="tm-stage-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                          </svg>
                        </div>
                        <div className="tm-stage-details">
                          <strong className="tm-stage-name">Heat Water</strong>
                          <span className="tm-stage-sub">
                            {ritualPhase === "heat"
                              ? `Reaching ${temperature}°C (${waterHeatTemp}°C)`
                              : `Reaching ${temperature}°C`}
                          </span>
                        </div>
                        <div className="tm-stage-status">
                          {ritualPhase !== "heat" ? (
                            <span className="tm-check-circle" title="Completed">✓</span>
                          ) : (
                            <span className="tm-active-ring" title="In progress" />
                          )}
                        </div>
                      </li>

                      {/* 2. Add Tea Leaves */}
                      <li
                        className={`tm-stage-item ${
                          ritualPhase === "heat"
                            ? "pending"
                            : ritualPhase === "leaves"
                            ? "active"
                            : "done"
                        }`}
                      >
                        <span className="tm-stage-badge">2</span>
                        <div className="tm-stage-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                          </svg>
                        </div>
                        <div className="tm-stage-details">
                          <strong className="tm-stage-name">Add Tea Leaves</strong>
                          <span className="tm-stage-sub">{teaGrams}.0 g</span>
                        </div>
                        <div className="tm-stage-status">
                          {ritualPhase === "heat" ? (
                            <span className="tm-pending-circle" />
                          ) : ritualPhase === "leaves" ? (
                            <span className="tm-active-ring" />
                          ) : (
                            <span className="tm-check-circle">✓</span>
                          )}
                        </div>
                      </li>

                      {/* 3. Add Extras */}
                      <li
                        className={`tm-stage-item ${
                          ritualPhase === "heat" || ritualPhase === "leaves"
                            ? "pending"
                            : ritualPhase === "extras"
                            ? "active"
                            : "done"
                        }`}
                      >
                        <span className="tm-stage-badge">3</span>
                        <div className="tm-stage-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="10" width="8" height="8" rx="1.5" />
                            <rect x="13" y="6" width="8" height="8" rx="1.5" />
                            <path d="M7 10V6l4-2" />
                          </svg>
                        </div>
                        <div className="tm-stage-details">
                          <strong className="tm-stage-name">Add Extras</strong>
                          <span className="tm-stage-sub">{selectedExtrasText}</span>
                        </div>
                        <div className="tm-stage-status">
                          {ritualPhase === "heat" || ritualPhase === "leaves" ? (
                            <span className="tm-pending-circle" />
                          ) : ritualPhase === "extras" ? (
                            <span className="tm-active-ring" />
                          ) : (
                            <span className="tm-check-circle">✓</span>
                          )}
                        </div>
                      </li>

                      {/* 4. Pour Water */}
                      <li
                        className={`tm-stage-item ${
                          ritualPhase === "heat" ||
                          ritualPhase === "leaves" ||
                          ritualPhase === "extras"
                            ? "pending"
                            : ritualPhase === "pour"
                            ? "active"
                            : "done"
                        }`}
                      >
                        <span className="tm-stage-badge">4</span>
                        <div className="tm-stage-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                          </svg>
                        </div>
                        <div className="tm-stage-details">
                          <strong className="tm-stage-name">Pour Water</strong>
                          <span className="tm-stage-sub">{waterMl} ml</span>
                        </div>
                        <div className="tm-stage-status">
                          {ritualPhase === "heat" ||
                          ritualPhase === "leaves" ||
                          ritualPhase === "extras" ? (
                            <span className="tm-pending-circle" />
                          ) : ritualPhase === "pour" ? (
                            <span className="tm-active-ring" />
                          ) : (
                            <span className="tm-check-circle">✓</span>
                          )}
                        </div>
                      </li>

                      {/* 5. Steeping */}
                      <li
                        className={`tm-stage-item ${
                          ritualPhase === "steep"
                            ? "active"
                            : ritualPhase === "strain" || ritualPhase === "enjoy"
                            ? "done"
                            : "pending"
                        }`}
                      >
                        <span className="tm-stage-badge">5</span>
                        <div className="tm-stage-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 22h14" />
                            <path d="M5 2h14" />
                            <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
                            <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
                          </svg>
                        </div>
                        <div className="tm-stage-details">
                          <strong className="tm-stage-name">Steeping</strong>
                          <span className="tm-stage-sub">
                            {formatTimer(timeLeft)} min
                          </span>
                        </div>
                        <div className="tm-stage-status">
                          {ritualPhase === "strain" || ritualPhase === "enjoy" ? (
                            <span className="tm-check-circle">✓</span>
                          ) : ritualPhase === "steep" ? (
                            <span className="tm-active-ring" />
                          ) : (
                            <span className="tm-pending-circle" />
                          )}
                        </div>
                      </li>

                      {/* 6. Remove Leaves */}
                      <li
                        className={`tm-stage-item ${
                          ritualPhase === "strain"
                            ? "active"
                            : ritualPhase === "enjoy"
                            ? "done"
                            : "pending"
                        }`}
                      >
                        <span className="tm-stage-badge">6</span>
                        <div className="tm-stage-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 3v18" />
                            <path d="M18 9a5 5 0 0 0-5-5H6v10h7a5 5 0 0 0 5-5z" />
                          </svg>
                        </div>
                        <div className="tm-stage-details">
                          <strong className="tm-stage-name">Remove Leaves</strong>
                          <span className="tm-stage-sub">Strain &amp; clarify</span>
                        </div>
                        <div className="tm-stage-status">
                          {ritualPhase === "enjoy" ? (
                            <span className="tm-check-circle">✓</span>
                          ) : ritualPhase === "strain" ? (
                            <span className="tm-active-ring" />
                          ) : (
                            <span className="tm-pending-circle" />
                          )}
                        </div>
                      </li>

                      {/* 7. Enjoy Your Tea */}
                      <li
                        className={`tm-stage-item ${
                          ritualPhase === "enjoy" ? "active" : "pending"
                        }`}
                      >
                        <span className="tm-stage-badge">7</span>
                        <div className="tm-stage-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                            <line x1="6" y1="2" x2="6" y2="4" />
                            <line x1="10" y1="2" x2="10" y2="4" />
                            <line x1="14" y1="2" x2="14" y2="4" />
                          </svg>
                        </div>
                        <div className="tm-stage-details">
                          <strong className="tm-stage-name">Enjoy Your Tea</strong>
                          <span className="tm-stage-sub">Savor mindfully</span>
                        </div>
                        <div className="tm-stage-status">
                          {ritualPhase === "enjoy" ? (
                            <span className="tm-active-ring" />
                          ) : (
                            <span className="tm-pending-circle" />
                          )}
                        </div>
                      </li>
                    </ol>
                  </div>

                  {/* Right Column: Animated Teapot Theatre + Status + Tips */}
                  <div className="tm-ritual-display-column">
                    {/* Living Animated Teapot Visual Stage */}
                    <div className="tm-theatre-visual-stage">
                      <AnimatedTeapotIllustration
                        phase={ritualPhase}
                        temperature={temperature}
                        waterHeatTemp={waterHeatTemp}
                        teaType={teaType}
                        selectedExtras={selectedExtras}
                        steepRatio={steepRatio}
                      />
                    </div>

                    {/* Progress Narrative Status Card */}
                    <div className="tm-narrative-card">
                      <div className="tm-narrative-header">
                        <h3 className="tm-narrative-title">{narrativeInfo.title}</h3>
                        <p className="tm-narrative-sub">{narrativeInfo.sub}</p>
                      </div>

                      <div className="tm-narrative-progress-row">
                        <div className="tm-narrative-progress-track">
                          <div
                            className="tm-narrative-progress-fill"
                            style={{ width: `${ritualProgressPct}%` }}
                          />
                        </div>
                        <span className="tm-narrative-progress-num">{ritualProgressPct}%</span>
                      </div>

                      {/* Steeping Controls */}
                      {ritualPhase === "steep" && (
                        <div className="tm-steep-action-row">
                          <button
                            type="button"
                            className="tm-steep-ctrl-btn"
                            onClick={handlePauseResume}
                          >
                            {isPaused ? "▶ Resume Steeping" : "❚❚ Pause Timer"}
                          </button>
                          <button
                            type="button"
                            className="tm-steep-ctrl-btn skip"
                            onClick={handleSkipTimer}
                          >
                            Skip to Cup ⏭
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Wisdom / Advice Cards Row */}
                    <div className="tm-wisdom-cards-row">
                      <div className="tm-wisdom-card">
                        <span className="tm-wisdom-icon">🍃</span>
                        <p className="tm-wisdom-quote">
                          "A little patience brews a lot of happiness."
                        </p>
                      </div>

                      <div className="tm-wisdom-card">
                        <span className="tm-wisdom-icon">💡</span>
                        <p className="tm-wisdom-quote">
                          <strong>Tip:</strong> Pour slowly for a richer flavor.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Pane Actions */}
                <div className="tm-pane-actions">
                  <button
                    type="button"
                    className="tm-secondary-btn"
                    onClick={() => setCurrentStep(5)}
                  >
                    ← Back to Measure
                  </button>
                  <button
                    type="button"
                    className="tm-restart-ritual-btn"
                    onClick={handleRestartRitual}
                  >
                    ↻ Reset Ritual
                  </button>
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 7: YOUR PERFECT CUP (MATCHING REFERENCE IMAGE)
                ══════════════════════════════════════════════════════════ */}
            {currentStep === 7 && (
              <section className="tm-step-pane tm-result-pane-ref" aria-labelledby="step7-title">
                {/* Reference Stepper Bar: 7 / 7 */}
                <ReferenceStepNav step={7} />

                {/* Ambient Decorative Leaves */}
                <div className="tm-ambient-leaf-decor decor-tl" aria-hidden="true">🍃</div>
                <div className="tm-ambient-leaf-decor decor-tr" aria-hidden="true">🍃</div>
                <div className="tm-ambient-leaf-decor decor-bl" aria-hidden="true">🍃</div>
                <div className="tm-ambient-leaf-decor decor-br" aria-hidden="true">🍃</div>

                {/* Editorial Header */}
                <header className="tm-result-header-ref">
                  <span className="tm-eyebrow-tag">YOUR RITUAL, YOUR MOMENT</span>
                  <h2 id="step7-title" className="tm-result-title">Your Perfect Cup</h2>
                  <p className="tm-result-subtitle">Beautifully Brewed</p>
                  <div className="tm-result-divider" aria-hidden="true">
                    <span className="tm-divider-line" />
                    <span className="tm-divider-diamond">◆</span>
                    <span className="tm-divider-line" />
                  </div>

                  {/* Script Callouts */}
                  <div className="tm-script-callout cup-left-callout" aria-hidden="true">
                    <span>A Calmer<br />You<br />In Every<br />Cup</span>
                    <svg className="tm-callout-arrow" viewBox="0 0 50 30" fill="none" stroke="#C9A24B" strokeWidth="1.5">
                      <path d="M5 5 Q 25 8 38 24" strokeLinecap="round" />
                      <path d="M30 23 L 39 25 L 38 17" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="tm-script-callout cup-right-callout" aria-hidden="true">
                    <span>Sip<br />Savor<br />Be Present</span>
                  </div>
                </header>

                {/* Centerpiece Teacup Visual Stage */}
                <div className="tm-result-stage-wrap">
                  <div className="tm-teacup-center-stage">
                    <AnimatedTeacupIllustration teaType={teaType} />
                  </div>

                  {/* 3 Micro-Badges on Right */}
                  <div className="tm-cup-micro-badges">
                    <div className="tm-micro-badge">
                      <span className="tm-micro-badge-icon">🍃</span>
                      <span className="tm-micro-badge-text">Better Days</span>
                    </div>
                    <div className="tm-micro-badge">
                      <span className="tm-micro-badge-icon">🪷</span>
                      <span className="tm-micro-badge-text">Mindful Moments</span>
                    </div>
                    <div className="tm-micro-badge">
                      <span className="tm-micro-badge-icon">🤍</span>
                      <span className="tm-micro-badge-text">A Healthier You</span>
                    </div>
                  </div>
                </div>

                {/* Specification Result Card */}
                <div className="tm-spec-card">
                  {/* Header: Title + Notes + Quote */}
                  <div className="tm-spec-header">
                    <div className="tm-spec-title-group">
                      <div className="tm-spec-leaf-icon" aria-hidden="true">🍃</div>
                      <div>
                        <h3 className="tm-spec-tea-name">{selectedProduct.name}</h3>
                        <p className="tm-spec-tea-notes">
                          {selectedProduct.subtitle || "Fresh · Floral · Light"}
                        </p>
                      </div>
                    </div>

                    <blockquote className="tm-spec-quote">
                      "Simple ingredients. Extraordinary moments."
                    </blockquote>
                  </div>

                  {/* 4 Main Parameters */}
                  <div className="tm-spec-param-grid">
                    <div className="tm-param-box">
                      <span className="tm-param-icon">🌡️</span>
                      <div className="tm-param-content">
                        <strong className="tm-param-val">{temperature}°C</strong>
                        <span className="tm-param-lbl">Temperature</span>
                      </div>
                    </div>

                    <div className="tm-param-box">
                      <span className="tm-param-icon">🍃</span>
                      <div className="tm-param-content">
                        <strong className="tm-param-val">{teaGrams}.0 g</strong>
                        <span className="tm-param-lbl">Tea Leaves</span>
                      </div>
                    </div>

                    <div className="tm-param-box">
                      <span className="tm-param-icon">💧</span>
                      <div className="tm-param-content">
                        <strong className="tm-param-val">{waterMl} ml</strong>
                        <span className="tm-param-lbl">Water</span>
                      </div>
                    </div>

                    <div className="tm-param-box">
                      <span className="tm-param-icon">⏳</span>
                      <div className="tm-param-content">
                        <strong className="tm-param-val">{formatTimer(steepTotalSec)}</strong>
                        <span className="tm-param-lbl">Steeping Time</span>
                      </div>
                    </div>
                  </div>

                  {/* 2 Subparameters (Method & Extras) */}
                  <div className="tm-spec-subparam-grid">
                    <div className="tm-subparam-box">
                      <span className="tm-subparam-icon">🫖</span>
                      <div className="tm-subparam-content">
                        <strong className="tm-subparam-val">{selectedMethod.name}</strong>
                        <span className="tm-subparam-lbl">Method</span>
                      </div>
                    </div>

                    <div className="tm-subparam-box">
                      <span className="tm-subparam-icon">🧊</span>
                      <div className="tm-subparam-content">
                        <strong className="tm-subparam-val">{selectedExtrasText}</strong>
                        <span className="tm-subparam-lbl">Extras</span>
                      </div>
                    </div>
                  </div>

                  {/* Cart Toast Notification */}
                  {addedToCartSuccess && (
                    <div className="tm-spec-cart-toast" role="alert">
                      ✓ {selectedProduct.name} added to your cart!
                    </div>
                  )}

                  {/* CTA Buttons */}
                  <div className="tm-spec-cta-row">
                    <button
                      type="button"
                      className="tm-spec-btn-brew"
                      onClick={() => setCurrentStep(1)}
                    >
                      ↻ Brew Again
                    </button>

                    <button
                      type="button"
                      className="tm-spec-btn-shop"
                      onClick={handleAddToCartFromRitual}
                    >
                      <span className="tm-cart-icon">🛒</span> Shop This Tea
                    </button>
                  </div>

                  {/* Signature Footer */}
                  <div className="tm-spec-footer-signature">
                    <span className="tm-footer-line" />
                    <span className="tm-footer-text">Better Tea</span>
                    <span className="tm-footer-leaf">🍃</span>
                    <span className="tm-footer-text">Better Days</span>
                    <span className="tm-footer-line" />
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
