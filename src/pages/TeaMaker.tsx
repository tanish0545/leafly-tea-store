import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductContext";
import TeaRitualSoundscape from "../components/TeaRitualSoundscape";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { generateBreadcrumbSchema } from "../lib/seoData";
import "./TeaMaker.css";

// Assets
import lemonImg from "../assets/tea-maker/ingredients/lemon.webp";
import jaggeryImg from "../assets/tea-maker/ingredients/jaggery.webp";
import mintImg from "../assets/tea-maker/ingredients/mint.webp";
import lemongrassImg from "../assets/tea-maker/ingredients/lemongrass.webp";
import pepperImg from "../assets/tea-maker/ingredients/black-pepper.webp";
import saltImg from "../assets/tea-maker/ingredients/black-salt.webp";
import honeyImg from "../assets/tea-maker/ingredients/honey.webp";

import cupImg from "../assets/tea-maker/vessels/cup-tea.webp";

// Category-specific pouring images
import pouringGreenImg from "../assets/pouring-green.webp";
import pouringWhiteImg from "../assets/pouring-white.webp";
import pouringBlackImg from "../assets/pouring-black.webp";

// Category-specific finished tea ready images
import greenTeaMakerImg from "../assets/green-tea-maker.webp";
import whiteTeaMakerImg from "../assets/white-tea-maker.webp";
import blackTeaMakerImg from "../assets/black-tea-maker.webp";
import oolongTeaMakerImg from "../assets/oolong-tea-maker.webp";

import lemonSliceEffect from "../assets/tea-maker/effects/lemon-slice.webp";
import mintLeafEffect from "../assets/tea-maker/effects/mint-leaf.webp";
import jaggeryPieceEffect from "../assets/tea-maker/effects/jaggery-piece.webp";
import lemongrassPieceEffect from "../assets/tea-maker/effects/lemongrass-piece.webp";
import pepperParticlesEffect from "../assets/tea-maker/effects/pepper-particles.webp";
import saltParticlesEffect from "../assets/tea-maker/effects/salt-particles.webp";
import honeyDropEffect from "../assets/tea-maker/effects/honey-drop.webp";
import teaLeavesFallingEffect from "../assets/tea-maker/effects/tea-leaves-falling.webp";

export type TeaType = "Green" | "White" | "Black" | "Oolong";
export type TeaStrength = "Light" | "Balanced" | "Strong";

export type IngredientId =
  | "lemon"
  | "jaggery"
  | "mint"
  | "lemongrass"
  | "black-pepper"
  | "black-salt"
  | "honey";

interface Ingredient {
  id: IngredientId;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  effectImage: string;
  particleType: "drop" | "float" | "dissolve" | "spray" | "stream";
}

const INGREDIENTS: Ingredient[] = [
  {
    id: "lemon",
    name: "Lemon",
    subtitle: "Bright · Citrus · Fresh",
    description: "Sun-ripened citrus zest for bright, uplifting morning freshness.",
    image: lemonImg,
    effectImage: lemonSliceEffect,
    particleType: "drop",
  },
  {
    id: "jaggery",
    name: "Jaggery",
    subtitle: "Earthy · Caramel · Warm",
    description: "Organic cane sweetness with deep caramel and mineral undertones.",
    image: jaggeryImg,
    effectImage: jaggeryPieceEffect,
    particleType: "dissolve",
  },
  {
    id: "mint",
    name: "Mint Leaves",
    subtitle: "Crisp · Herbal · Cooling",
    description: "Hand-plucked spearmint leaves imparting a crisp, soothing finish.",
    image: mintImg,
    effectImage: mintLeafEffect,
    particleType: "float",
  },
  {
    id: "lemongrass",
    name: "Lemongrass",
    subtitle: "Aromatic · Zesty · Calming",
    description: "Highland lemongrass stalks bringing citrus aroma and digest calm.",
    image: lemongrassImg,
    effectImage: lemongrassPieceEffect,
    particleType: "float",
  },
  {
    id: "black-pepper",
    name: "Black Pepper",
    subtitle: "Piquant · Spicy · Fiery",
    description: "Malabar black peppercorns offering warmth and immune vitality.",
    image: pepperImg,
    effectImage: pepperParticlesEffect,
    particleType: "spray",
  },
  {
    id: "black-salt",
    name: "Black Salt",
    subtitle: "Savory · Mineral · Grounding",
    description: "Himalayan kala namak adding authentic Ayurvedic depth.",
    image: saltImg,
    effectImage: saltParticlesEffect,
    particleType: "spray",
  },
  {
    id: "honey",
    name: "Wild Honey",
    subtitle: "Floral · Golden · Soothing",
    description: "Raw forest honey delivering gentle sweetness and a velvety body.",
    image: honeyImg,
    effectImage: honeyDropEffect,
    particleType: "stream",
  },
];

interface TeaCategoryInfo {
  type: TeaType;
  title: string;
  tagline: string;
  defaultTemp: number;
  defaultTimeSec: number;
  lightColor: string;
  balancedColor: string;
  strongColor: string;
  leafColor: string;
  notes: string;
  matchedProductId: number;
  image: string;
  pouringImage: string;
  readyImage: string;
}

const TEA_CATEGORIES: Record<TeaType, TeaCategoryInfo> = {
  Green: {
    type: "Green",
    title: "Green Tea",
    tagline: "Fresh & Vibrant · Clean, uplifting, dewy sweetness.",
    defaultTemp: 80,
    defaultTimeSec: 150,
    lightColor: "#d9e5b6",
    balancedColor: "#b2cb7e",
    strongColor: "#89a552",
    leafColor: "#4f7743",
    notes: "Sweet Grass · Jasmine · Dewy Mountain Mist",
    matchedProductId: 1,
    image: "/leafly-green-tea.webp",
    pouringImage: pouringGreenImg,
    readyImage: greenTeaMakerImg,
  },
  White: {
    type: "White",
    title: "White Tea",
    tagline: "Pure & Delicate · Silken, airy, hand-plucked buds.",
    defaultTemp: 75,
    defaultTimeSec: 180,
    lightColor: "#f4eed9",
    balancedColor: "#e6dcaf",
    strongColor: "#cbbe86",
    leafColor: "#8f967a",
    notes: "Wild Honeysuckle · White Peach · Melon Silk",
    matchedProductId: 2,
    image: "/leafly-white-tea.webp",
    pouringImage: pouringWhiteImg,
    readyImage: whiteTeaMakerImg,
  },
  Black: {
    type: "Black",
    title: "Black Tea",
    tagline: "Rich & Bold · Deep amber malt with muscatel notes.",
    defaultTemp: 95,
    defaultTimeSec: 210,
    lightColor: "#d78f5a",
    balancedColor: "#b3521d",
    strongColor: "#7e320d",
    leafColor: "#3a2012",
    notes: "Muscatel Grape · Amber Malt · Forest Oak",
    matchedProductId: 3,
    image: "/leafly-black-tea.webp",
    pouringImage: pouringBlackImg,
    readyImage: blackTeaMakerImg,
  },
  Oolong: {
    type: "Oolong",
    title: "Oolong Tea",
    tagline: "Complex & Refined · Floral aroma with roasted orchid depth.",
    defaultTemp: 90,
    defaultTimeSec: 240,
    lightColor: "#e7b975",
    balancedColor: "#cb8730",
    strongColor: "#9e5c12",
    leafColor: "#574828",
    notes: "Roasted Orchid · Peach Blossom · Wild Forest Honey",
    matchedProductId: 4,
    image: "/leafly-oolong-tea.webp",
    pouringImage: pouringBlackImg,
    readyImage: oolongTeaMakerImg,
  },
};

const STEPS = [
  { num: "01", label: "Tea" },
  { num: "02", label: "Cups" },
  { num: "03", label: "Water" },
  { num: "04", label: "Steep" },
  { num: "05", label: "Strength" },
  { num: "06", label: "Ingredients" },
  { num: "07", label: "Brew" },
  { num: "08", label: "Ready" },
];

export default function TeaMaker() {
  const { addToCart, openCart } = useCart();
  const { products } = useProducts();

  // Wizard Step: 1 to 8
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Configuration Selections
  const [selectedTea, setSelectedTea] = useState<TeaType>("Green");
  const [cupCount, setCupCount] = useState<number>(1);
  const [temperature, setTemperature] = useState<number>(80);
  const [steepingTimeSec, setSteepingTimeSec] = useState<number>(150);
  const [strength, setStrength] = useState<TeaStrength>("Balanced");
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientId[]>([]);

  // Brewing & Ritual Lifecycle (Step 7)
  // Sub-stages:
  // "heating" (water warming on gentle gas flame, subtle steam)
  // "adding-tea" (whole tea leaves enter teapot)
  // "infusing-ingredients" (selected ingredients enter sequentially one by one)
  // "steeping" (timer counting down, liquid gradually deepening in colour)
  // "pouring" (teapot tilts, stream flows, cup fills gradually)
  const [brewingSubStage, setBrewingSubStage] = useState<
    "heating" | "adding-tea" | "infusing-ingredients" | "steeping" | "pouring"
  >("heating");
  const [steepProgress, setSteepProgress] = useState<number>(0); // 0 (clear warm water) to 1 (full brewed strength)
  const [activeBrewIngredientIdx, setActiveBrewIngredientIdx] = useState<number>(-1);
  const [timeLeft, setTimeLeft] = useState<number>(150);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [addedToCartSuccess, setAddedToCartSuccess] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const sequenceTimeoutRef = useRef<number[]>([]);

  const clearAllTimeouts = () => {
    sequenceTimeoutRef.current.forEach((t) => clearTimeout(t));
    sequenceTimeoutRef.current = [];
  };

  // Auto-scroll on step transition
  useEffect(() => {
    const wizardEl = document.getElementById("tea-maker-wizard");
    if (wizardEl) {
      wizardEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentStep]);

  // Step 1: Select Tea Category
  const handleSelectTea = (type: TeaType) => {
    setSelectedTea(type);
    const cat = TEA_CATEGORIES[type];
    setTemperature(cat.defaultTemp);
    setSteepingTimeSec(cat.defaultTimeSec);
    setTimeLeft(cat.defaultTimeSec);

    setTimeout(() => {
      setCurrentStep(2);
    }, 380);
  };

  // Step 2: Select Cup Quantity
  const handleSelectCups = (count: number) => {
    setCupCount(count);
    setTimeout(() => {
      setCurrentStep(3);
    }, 320);
  };

  // Step 3: Select Temperature
  const handleSelectTemperature = (temp: number) => {
    setTemperature(temp);
    setTimeout(() => {
      setCurrentStep(4);
    }, 320);
  };

  // Step 4: Select Steeping Duration
  const handleSelectSteepTime = (sec: number) => {
    setSteepingTimeSec(sec);
    setTimeLeft(sec);
    setTimeout(() => {
      setCurrentStep(5);
    }, 320);
  };

  // Step 5: Select Strength
  const handleSelectStrength = (str: TeaStrength) => {
    setStrength(str);
    setTimeout(() => {
      setCurrentStep(6);
    }, 320);
  };

  // Step 6: Toggle Ingredients (No floating preview outside card)
  const handleToggleIngredient = (id: IngredientId) => {
    if (selectedIngredients.includes(id)) {
      setSelectedIngredients((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedIngredients((prev) => [...prev, id]);
    }
  };

  // Step 7: Start Sequential Brewing Ritual
  // Sequence:
  // 1. PHASE A - HEATING: Open teapot sits on gas burner with subtle flame & water (2.0s)
  // 2. PHASE B - ADDING TEA: Tea leaves enter the teapot (1.5s)
  // 3. PHASE C - ADDING SELECTED INGREDIENTS: Only user-selected ingredients enter sequentially (1.2s each)
  // 4. STEEPING: Timer counts down, teapot stationary, subtle steam, liquid deepens in color
  // 5. POURING: Teapot tilts, stream pours, cup fills, steam rises
  const handleStartBrewing = () => {
    clearAllTimeouts();
    setCurrentStep(7);
    setBrewingSubStage("heating");
    setSteepProgress(0);
    setActiveBrewIngredientIdx(-1);
    setTimeLeft(steepingTimeSec);
    setIsTimerPaused(false);
    setAddedToCartSuccess(false);

    // 1. Heating -> 2. Adding Tea Leaves (after 2s)
    const tAddTea = window.setTimeout(() => {
      setBrewingSubStage("adding-tea");

      // 3. Adding Tea -> Adding Selected Ingredients or directly to Steeping (after 1.6s)
      const tAddIngs = window.setTimeout(() => {
        if (selectedIngredients.length > 0) {
          setBrewingSubStage("infusing-ingredients");
          selectedIngredients.forEach((_, idx) => {
            const tIng = window.setTimeout(() => {
              setActiveBrewIngredientIdx(idx);
            }, idx * 1200);
            sequenceTimeoutRef.current.push(tIng);
          });

          // Transition to active steeping after all selected ingredients enter
          const totalIngDuration = selectedIngredients.length * 1200 + 600;
          const tSteep = window.setTimeout(() => {
            setBrewingSubStage("steeping");
          }, totalIngDuration);
          sequenceTimeoutRef.current.push(tSteep);
        } else {
          // Pure tea: directly transition to steeping
          setBrewingSubStage("steeping");
        }
      }, 1600);
      sequenceTimeoutRef.current.push(tAddIngs);

    }, 2000);
    sequenceTimeoutRef.current.push(tAddTea);
  };

  // Transition from Steeping to Pouring Phase
  const triggerPouringStage = useCallback(() => {
    clearAllTimeouts();
    setBrewingSubStage("pouring");

    // Pouring image shows briefly then transitions to final Step 8 Ready state
    const tPour = window.setTimeout(() => {
      setCurrentStep(8);
    }, 2200);
    sequenceTimeoutRef.current.push(tPour);
  }, []);

  // Countdown Timer in Step 7 (Steeping Stage)
  useEffect(() => {
    if (currentStep === 7 && brewingSubStage === "steeping" && !isTimerPaused) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setSteepProgress(1);
            // Steeping complete -> Begin Pouring Stage
            triggerPouringStage();
            return 0;
          }
          const newTime = prev - 1;
          // Dynamically compute steep progress 0 -> 1
          const progress = (steepingTimeSec - newTime) / steepingTimeSec;
          setSteepProgress(Math.min(1, Math.max(0.1, progress)));
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep, brewingSubStage, isTimerPaused, steepingTimeSec, triggerPouringStage]);

  const handlePauseResumeTimer = () => {
    setIsTimerPaused((prev) => !prev);
  };

  const handleResetTimer = () => {
    clearAllTimeouts();
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(steepingTimeSec);
    setSteepProgress(0.1);
    setIsTimerPaused(false);
    setBrewingSubStage("steeping");
  };

  // Skip Timer: Quickly finalize colour transition, steam settles, and smoothly trigger pouring
  const handleSkipTimer = () => {
    clearAllTimeouts();
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);
    setSteepProgress(1);
    
    // Fast, elegant transition to pouring phase
    const tSkip = window.setTimeout(() => {
      triggerPouringStage();
    }, 400);
    sequenceTimeoutRef.current.push(tSkip);
  };

  const handleRestartFullRitual = () => {
    clearAllTimeouts();
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentStep(1);
    setSelectedIngredients([]);
    setTimeLeft(150);
    setSteepProgress(0);
    setIsTimerPaused(false);
    setAddedToCartSuccess(false);
  };

  const handleAddToCartRitual = () => {
    const cat = TEA_CATEGORIES[selectedTea];
    const productMatch = products.find((p) => p.id === cat.matchedProductId) || {
      id: cat.matchedProductId,
      name: `${cat.title} (${selectedTea} Ritual)`,
      category: selectedTea,
      origin: "Single Estate, India",
      caffeine: "Medium",
      weight: "100g",
      price: 699,
      badge: "Artisan Ritual",
      image: cat.image,
    };

    addToCart(productMatch, cupCount, "100g", 699);
    setAddedToCartSuccess(true);
    setTimeout(() => {
      openCart();
    }, 350);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const currentCat = TEA_CATEGORIES[selectedTea];

  // Target brewed tea color based on user's selected infusion strength
  const getTargetBrewedColor = () => {
    if (strength === "Light") return currentCat.lightColor;
    if (strength === "Strong") return currentCat.strongColor;
    return currentCat.balancedColor;
  };

  // Dynamic Liquid Colors for Handcrafted SVG Glass Kettle
  const getDynamicLiquidColors = () => {
    if (brewingSubStage === "heating") {
      return {
        top: "#ffffff",
        mid: "#f6efe0",
        bottom: "#ebdcb6",
        opacity: 0.72,
      };
    }
    const cat = TEA_CATEGORIES[selectedTea];
    const targetMid = strength === "Strong" ? cat.strongColor : cat.balancedColor;
    const progressFactor = brewingSubStage === "steeping" ? 0.85 + steepProgress * 0.15 : 0.85;

    if (selectedTea === "Green") {
      return {
        top: "#e2edbd",
        mid: targetMid,
        bottom: "#6e8d35",
        opacity: Math.min(1, 0.82 * progressFactor),
      };
    }
    if (selectedTea === "White") {
      return {
        top: "#fbf6e8",
        mid: targetMid,
        bottom: "#b8aa70",
        opacity: Math.min(1, 0.78 * progressFactor),
      };
    }
    if (selectedTea === "Black") {
      return {
        top: "#f0a871",
        mid: targetMid,
        bottom: "#682506",
        opacity: Math.min(1, 0.92 * progressFactor),
      };
    }
    return {
      top: "#f5d098",
      mid: targetMid,
      bottom: "#85490a",
      opacity: Math.min(1, 0.88 * progressFactor),
    };
  };

  return (
    <main className="tea-maker-page">
      <SEO
        title="Tea Brewing Guide & Interactive Steeping Ritual | Leafly"
        description="Master loose leaf tea brewing with Leafly's interactive guide. Discover exact water temperatures, steeping times, and preparation rituals for green, black, white, and oolong teas."
        canonicalPath="/tea-maker"
        schema={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tea Maker", url: "/tea-maker" },
        ])}
      />
      {/* =======================================================
          HERO BANNER
          ======================================================= */}
      <section className="tm-hero" id="tea-maker-hero">
        <div className="tm-hero-bg-glow" aria-hidden="true" />

        {/* Botanical leaf atmosphere — organic leaf SVGs with natural drift */}
        <div className="tm-hero-leaves" aria-hidden="true">
          {[...Array(10)].map((_, i) => (
            <span key={i} className={`tm-leaf l-${i + 1}`}>
              <svg viewBox="0 0 32 48" fill="none">
                <path
                  d="M16 2 C26 12 30 26 24 38 C18 46 14 47 16 48 C13 46 8 42 5 32 C2 22 6 10 16 2 Z"
                  fill="currentColor"
                />
                <path
                  d="M16 6 Q16 26 16 46"
                  stroke="rgba(255, 255, 255, 0.4)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path d="M16 16 Q21 13 24 11" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8" />
                <path d="M16 22 Q10 20 8 18" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8" />
                <path d="M16 28 Q22 26 25 24" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8" />
                <path d="M16 34 Q11 32 9 30" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8" />
              </svg>
            </span>
          ))}
        </div>

        <div className="tm-hero-content">
          <div className="tm-eyebrow">
            <span className="tm-eyebrow-line" />
            <p>GUIDED ARTISAN BREWING</p>
            <span className="tm-eyebrow-line" />
          </div>

          <h1 className="tm-title">TEA MAKER</h1>
          <p className="tm-subtitle">
            An interactive, step-by-step tea-making ritual.
            <br />
            <em>Slow down · Select your leaves · Steep with intention</em>
          </p>
        </div>
      </section>

      {/* =======================================================
          SEQUENTIAL GUIDED WIZARD CONTAINER
          ======================================================= */}
      <section className="tm-wizard-section" id="tea-maker-wizard">
        <div className="tm-container">

          {/* STEP PROGRESS INDICATOR */}
          <nav className="tm-progress-bar-wrap" aria-label="Ritual Progress">
            <div className="tm-progress-indicators">
              {STEPS.map((s, idx) => {
                const stepNum = idx + 1;
                const isCurrent = currentStep === stepNum;
                const isPassed = currentStep > stepNum;
                return (
                  <div
                    key={s.num}
                    className={`tm-prog-pill ${isCurrent ? "active" : ""} ${isPassed ? "completed" : ""}`}
                    onClick={() => {
                      // Allow jumping back to previously completed steps
                      if (isPassed && currentStep <= 6) {
                        setCurrentStep(stepNum);
                      }
                    }}
                  >
                    <span className="prog-num">{s.num}</span>
                    <span className="prog-label">{s.label}</span>
                    {isPassed && <span className="prog-check">✓</span>}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* =======================================================
              STEP 1: TEA CATEGORY
              ======================================================= */}
          {currentStep === 1 && (
            <div className="tm-step-view tm-fade-in" key="step-1">
              <div className="tm-step-header">
                <span className="tm-step-eyebrow">STEP 01 OF 08</span>
                <h2>Select Your Tea Base</h2>
                <p>Choose the character of whole-leaf harvest for today’s cup.</p>
              </div>

              <div className="tm-tea-cards-grid">
                {(Object.keys(TEA_CATEGORIES) as TeaType[]).map((type) => {
                  const cat = TEA_CATEGORIES[type];
                  const isSelected = selectedTea === type;
                  return (
                    <article
                      key={type}
                      className={`tm-tea-card ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectTea(type)}
                    >
                      <div className="tm-tea-card-image-wrap">
                        <img
                          src={cat.image}
                          alt={cat.title}
                          className="tm-tea-card-image"
                          loading="lazy"
                        />
                        <span
                          className="tm-tea-color-preview"
                          style={{ backgroundColor: cat.balancedColor }}
                          title="Infusion Tone"
                        />
                      </div>

                      <div className="tm-tea-card-content">
                        <h3>{cat.title}</h3>
                        <p className="tm-tea-tagline">{cat.tagline}</p>
                        <p className="tm-tea-notes">✦ {cat.notes}</p>
                      </div>

                      <div className="tm-tea-card-select-btn">
                        {isSelected ? "SELECTED ✓" : "CHOOSE THIS TEA →"}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 2: QUANTITY / CUPS
              ======================================================= */}
          {currentStep === 2 && (
            <div className="tm-step-view tm-fade-in" key="step-2">
              <div className="tm-step-header">
                <span className="tm-step-eyebrow">STEP 02 OF 08</span>
                <h2>How many cups are you making?</h2>
                <p>We’ll proportion the leaf volume and water depth perfectly.</p>
              </div>

              {/* Dynamic Cup Visualizer */}
              <div className="tm-cups-visualizer" aria-hidden="true">
                {Array.from({ length: cupCount }).map((_, idx) => (
                  <div key={idx} className="tm-cup-single-icon tm-pop-in">
                    <img src={cupImg} alt="" className="tm-cup-single-img" />
                    <span className="tm-cup-steam-dot" />
                  </div>
                ))}
              </div>

              <div className="tm-options-grid tm-cups-grid">
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`tm-option-card ${cupCount === count ? "active" : ""}`}
                    onClick={() => handleSelectCups(count)}
                  >
                    <span className="tm-option-number">{count}</span>
                    <span className="tm-option-title">{count === 1 ? "1 Cup" : `${count} Cups`}</span>
                    <span className="tm-option-desc">
                      {count === 1
                        ? "Personal mindful steep (250ml)"
                        : count === 2
                        ? "A shared moment (500ml)"
                        : `Gathering brew (${count * 250}ml)`}
                    </span>
                  </button>
                ))}
              </div>

              <div className="tm-step-nav-buttons">
                <button
                  type="button"
                  className="tm-btn-back"
                  onClick={() => setCurrentStep(1)}
                >
                  ← BACK TO TEA
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 3: WATER TEMPERATURE
              ======================================================= */}
          {currentStep === 3 && (
            <div className="tm-step-view tm-fade-in" key="step-3">
              <div className="tm-step-header">
                <span className="tm-step-eyebrow">STEP 03 OF 08</span>
                <h2>How hot should your water be?</h2>
                <p>
                  Recommended for <strong>{currentCat.title}</strong>:{" "}
                  <span className="tm-recommended-badge">{currentCat.defaultTemp}°C</span>
                </p>
              </div>

              {/* Animated Heat Gauge */}
              <div className="tm-heat-gauge-box">
                <div
                  className="tm-heat-gauge-fill"
                  style={{ width: `${((temperature - 65) / (100 - 65)) * 100}%` }}
                />
                <div className="tm-heat-gauge-text">
                  <span className="tm-heat-icon">🔥</span>
                  <strong>{temperature}°C</strong>
                  <span className="tm-heat-label">
                    {temperature <= 75
                      ? "Gentle Warmth (Protects sweet tender buds)"
                      : temperature <= 85
                      ? "Silken Steep (Optimal for green leaves)"
                      : temperature <= 92
                      ? "Aromatic Bloom (Unlocks oolong layers)"
                      : "Full Rolling Boil (Draws deep rich amber)"}
                  </span>
                </div>
              </div>

              <div className="tm-options-grid tm-temp-grid">
                {[70, 75, 80, 90, 95, 98].map((temp) => (
                  <button
                    key={temp}
                    type="button"
                    className={`tm-option-card ${temperature === temp ? "active" : ""}`}
                    onClick={() => handleSelectTemperature(temp)}
                  >
                    <span className="tm-temp-degree">{temp}°C</span>
                    <span className="tm-temp-name">
                      {temp === currentCat.defaultTemp ? "✦ RECOMMENDED" : `${temp}°C Water`}
                    </span>
                  </button>
                ))}
              </div>

              <div className="tm-step-nav-buttons">
                <button
                  type="button"
                  className="tm-btn-back"
                  onClick={() => setCurrentStep(2)}
                >
                  ← BACK TO CUPS
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 4: STEEPING TIME
              ======================================================= */}
          {currentStep === 4 && (
            <div className="tm-step-view tm-fade-in" key="step-4">
              <div className="tm-step-header">
                <span className="tm-step-eyebrow">STEP 04 OF 08</span>
                <h2>How long should your tea steep?</h2>
                <p>
                  Time allows the whole tea leaf to uncurl and release sweet aromatics without bitterness.
                </p>
              </div>

              <div className="tm-options-grid tm-time-grid">
                {[
                  { label: "2 min", sec: 120, desc: "Light, brisk & fragrant" },
                  { label: "2:30 min", sec: 150, desc: "Classic balanced cup (Recommended)" },
                  { label: "3 min", sec: 180, desc: "Smooth, rounded depth" },
                  { label: "4 min", sec: 240, desc: "Full-bodied & rich character" },
                  { label: "5 min", sec: 300, desc: "Deep extraction for heavy malt" },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    className={`tm-option-card ${steepingTimeSec === item.sec ? "active" : ""}`}
                    onClick={() => handleSelectSteepTime(item.sec)}
                  >
                    <span className="tm-time-val">{item.label}</span>
                    <span className="tm-time-desc">{item.desc}</span>
                  </button>
                ))}
              </div>

              <div className="tm-step-nav-buttons">
                <button
                  type="button"
                  className="tm-btn-back"
                  onClick={() => setCurrentStep(3)}
                >
                  ← BACK TO WATER TEMP
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 5: INFUSION STRENGTH
              ======================================================= */}
          {currentStep === 5 && (
            <div className="tm-step-view tm-fade-in" key="step-5">
              <div className="tm-step-header">
                <span className="tm-step-eyebrow">STEP 05 OF 08</span>
                <h2>How strong do you like your tea?</h2>
                <p>We calibrate leaf density and temperature balance to your palate.</p>
              </div>

              {/* Dynamic Tea Color Indicator */}
              <div className="tm-strength-preview-box">
                <div
                  className="tm-strength-liquid-drop"
                  style={{ backgroundColor: getTargetBrewedColor() }}
                >
                  <span className="drop-ripple" />
                </div>
                <div className="tm-strength-preview-copy">
                  <span className="strength-badge">{strength} Infusion</span>
                  <p>
                    {strength === "Light"
                      ? "Gentle, airy notes with soft sweetness."
                      : strength === "Balanced"
                      ? "Harmonious balance of aroma, tannins, and finish."
                      : "Bold, robust body with pronounced terroir depth."}
                  </p>
                </div>
              </div>

              <div className="tm-options-grid tm-strength-grid">
                {(["Light", "Balanced", "Strong"] as TeaStrength[]).map((str) => (
                  <button
                    key={str}
                    type="button"
                    className={`tm-option-card ${strength === str ? "active" : ""}`}
                    onClick={() => handleSelectStrength(str)}
                  >
                    <span className="tm-strength-title">{str}</span>
                    <span className="tm-strength-desc">
                      {str === "Light"
                        ? "Subtle & Airy"
                        : str === "Balanced"
                        ? "Classic & Pure"
                        : "Deep & Intense"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="tm-step-nav-buttons">
                <button
                  type="button"
                  className="tm-btn-back"
                  onClick={() => setCurrentStep(4)}
                >
                  ← BACK TO STEEP TIME
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 6: INGREDIENTS SELECTION
              ======================================================= */}
          {currentStep === 6 && (
            <div className="tm-step-view tm-fade-in" key="step-6">
              <div className="tm-step-header">
                <span className="tm-step-eyebrow">STEP 06 OF 08</span>
                <h2>Would you like to add anything?</h2>
                <p>Select any natural botanicals, citrus zest, or Ayurvedic spices. (Multiple allowed or Pure Tea)</p>
              </div>

              {/* Ingredients Grid - Clean cards only, no floating preview outside */}
              <div className="tm-ingredients-grid">
                {INGREDIENTS.map((ing) => {
                  const isSelected = selectedIngredients.includes(ing.id);
                  return (
                    <div
                      key={ing.id}
                      className={`tm-ingredient-card ${isSelected ? "selected" : ""}`}
                      onClick={() => handleToggleIngredient(ing.id)}
                    >
                      <div className="tm-ingredient-img-wrap">
                        <img
                          src={ing.image}
                          alt={ing.name}
                          className="tm-ingredient-img"
                          loading="lazy"
                        />
                        {isSelected && <span className="tm-ingredient-check">✓</span>}
                      </div>

                      <div className="tm-ingredient-info">
                        <h3 className="tm-ingredient-name">{ing.name}</h3>
                        <p className="tm-ingredient-subtitle">{ing.subtitle}</p>
                        <p className="tm-ingredient-desc">{ing.description}</p>
                      </div>

                      <button
                        type="button"
                        className={`tm-ingredient-btn ${isSelected ? "added" : ""}`}
                      >
                        {isSelected ? "ADDED ✓" : "ADD +"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Action Bar */}
              <div className="tm-ingredients-actions">
                <button
                  type="button"
                  className="tm-btn-back"
                  onClick={() => setCurrentStep(5)}
                >
                  ← BACK TO STRENGTH
                </button>

                <button
                  type="button"
                  className="tm-btn-primary tm-begin-brew-btn"
                  onClick={handleStartBrewing}
                >
                  {selectedIngredients.length === 0
                    ? "BREW PURE TEA →"
                    : `PROCEED WITH ${selectedIngredients.length} INGREDIENTS →`}
                </button>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 7: BREWING RITUAL & REAL COUNTDOWN TIMER
              ======================================================= */}
          {currentStep === 7 && (
            <div className="tm-step-view tm-fade-in" key="step-7">
              <div className="tm-step-header">
                <span className="tm-step-eyebrow">STEP 07 OF 08 · RITUAL PROGRESS</span>
                <h2>
                  {brewingSubStage === "heating" && "Phase A · Heating pristine water on gentle flame..."}
                  {brewingSubStage === "adding-tea" && "Phase B · Adding whole tea leaves to the pot..."}
                  {brewingSubStage === "infusing-ingredients" && `Phase C · Adding selected botanicals (${activeBrewIngredientIdx + 1}/${selectedIngredients.length})...`}
                  {brewingSubStage === "steeping" && "Phase D · Steeping tea to perfection..."}
                  {brewingSubStage === "pouring" && "Phase E · Pouring fresh tea into your cup..."}
                </h2>
                <p>
                  <strong>{currentCat.title}</strong> · {temperature}°C · {cupCount} {cupCount === 1 ? "Cup" : "Cups"} · {strength} Strength
                </p>
              </div>

              {/* Full Brewing Scene */}
              <div className="tm-brewing-stage-box">
                {/* PHASES A, B, C, D: HEATING, ADDING TEA, ADDING INGREDIENTS & STEEPING (Teapot on Gas Burner) */}
                {brewingSubStage !== "pouring" && (
                  <div className="tm-ritual-phase-a">
                    {/* Atmospheric rising steam / vapor above kettle */}
                    <div className="tm-pot-steam-plume" aria-hidden="true">
                      <span className="tm-steam-vapor sv-1" />
                      <span className="tm-steam-vapor sv-2" />
                      <span className="tm-steam-vapor sv-3" />
                    </div>

                    {/* PHASE B: Tea Leaves Entering Pot */}
                    {brewingSubStage === "adding-tea" && (
                      <div className="tm-ingredient-drop-zone" aria-hidden="true">
                        <div className="tm-sequential-drop-item">
                          <img
                            src={teaLeavesFallingEffect}
                            alt="Tea Leaves"
                            className="tm-brew-drop-img tea-leaves"
                          />
                          <span className="tm-brew-drop-label">{currentCat.title} Leaves</span>
                        </div>
                      </div>
                    )}

                    {/* PHASE C: Sequentially Adding User-Selected Ingredients ONLY */}
                    {brewingSubStage === "infusing-ingredients" && (
                      <div className="tm-ingredient-drop-zone" aria-hidden="true">
                        {selectedIngredients.map((ingId, idx) => {
                          if (idx !== activeBrewIngredientIdx) return null;
                          const ing = INGREDIENTS.find((i) => i.id === ingId);
                          if (!ing) return null;
                          return (
                            <div
                              key={ing.id}
                              className="tm-sequential-drop-item"
                            >
                              <img
                                src={ing.effectImage}
                                alt={ing.name}
                                className="tm-brew-drop-img"
                              />
                              <span className="tm-brew-drop-label">{ing.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Handcrafted Artisan Glass Kettle */}
                    <div className="tm-kettle-stage-wrapper">
                      {(() => {
                        const liq = getDynamicLiquidColors();
                        return (
                          <svg
                            className="tm-kettle-svg"
                            viewBox="0 0 300 200"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-label="Artisan Glass Teapot"
                          >
                            <defs>
                              {/* Dynamic Liquid Gradient */}
                              <linearGradient id="tm-kettle-liq-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={liq.top} stopOpacity={liq.opacity} />
                                <stop offset="50%" stopColor={liq.mid} stopOpacity={liq.opacity} />
                                <stop offset="100%" stopColor={liq.bottom} stopOpacity={Math.min(1, liq.opacity + 0.08)} />
                              </linearGradient>

                              {/* Glass Highlights */}
                              <linearGradient id="tm-kettle-shine-l" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.12" />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                              </linearGradient>

                              <linearGradient id="tm-kettle-shine-r" x1="100%" y1="0%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                              </linearGradient>

                              {/* Gold Accents */}
                              <linearGradient id="tm-gold-accent" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#f3deb3" />
                                <stop offset="45%" stopColor="#c9a24b" />
                                <stop offset="100%" stopColor="#7a5818" />
                              </linearGradient>

                              {/* Walnut Handle */}
                              <linearGradient id="tm-walnut-handle" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3d2919" />
                                <stop offset="50%" stopColor="#22160d" />
                                <stop offset="100%" stopColor="#110905" />
                              </linearGradient>

                              {/* Clip Path for interior liquid */}
                              <clipPath id="tm-kettle-body-interior-clip">
                                <path d="M 102,48 C 74,72 68,136 86,164 C 102,184 122,186 150,186 C 178,186 198,184 214,164 C 232,136 226,72 198,48 Z" />
                              </clipPath>
                            </defs>

                            {/* 1. SPOUT (LEFT) */}
                            <path
                              d="M 96,78 C 64,66 38,36 36,16 C 43,16 52,24 62,40 C 74,60 85,92 90,116 Z"
                              fill="rgba(242, 248, 245, 0.45)"
                              stroke="rgba(255, 255, 255, 0.8)"
                              strokeWidth="1.6"
                            />
                            <path
                              d="M 36,16 C 37,15 41,15 42,16 C 40,18 38,18 36,16 Z"
                              fill="#c9a24b"
                              stroke="#8c6823"
                              strokeWidth="0.8"
                            />

                            {/* 2. WALNUT HANDLE (RIGHT) */}
                            <path
                              d="M 204,40 C 262,30 278,142 212,166"
                              fill="none"
                              stroke="url(#tm-walnut-handle)"
                              strokeWidth="11"
                              strokeLinecap="round"
                            />
                            <path
                              d="M 204,40 C 262,30 278,142 212,166"
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.22)"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              transform="translate(-1, -1)"
                            />
                            <circle cx="204" cy="40" r="5" fill="url(#tm-gold-accent)" stroke="#5a4214" strokeWidth="1" />
                            <circle cx="212" cy="166" r="5" fill="url(#tm-gold-accent)" stroke="#5a4214" strokeWidth="1" />

                            {/* 3. DYNAMIC TEA LIQUID IN THE KETTLE */}
                            <g clipPath="url(#tm-kettle-body-interior-clip)">
                              <rect x="60" y="62" width="180" height="130" fill="url(#tm-kettle-liq-grad)" />

                              {/* Water Simmer Wave Surface */}
                              <path
                                className="tm-kettle-liquid-wave"
                                d="M 60,66 Q 105,60 150,66 Q 195,72 240,66 L 240,195 L 60,195 Z"
                                fill="url(#tm-kettle-liq-grad)"
                                opacity="0.95"
                              />

                              {/* Rising Simmer Bubbles */}
                              <g className="tm-kettle-bubbles-group">
                                <circle cx="110" cy="172" r="2.2" fill="#ffffff" opacity="0.65" className="tm-kettle-bubble kb-1" />
                                <circle cx="130" cy="176" r="2.8" fill="#ffffff" opacity="0.75" className="tm-kettle-bubble kb-2" />
                                <circle cx="150" cy="174" r="2.0" fill="#ffffff" opacity="0.6" className="tm-kettle-bubble kb-3" />
                                <circle cx="168" cy="178" r="3.2" fill="#ffffff" opacity="0.8" className="tm-kettle-bubble kb-4" />
                                <circle cx="186" cy="172" r="2.2" fill="#ffffff" opacity="0.65" className="tm-kettle-bubble kb-5" />
                                <circle cx="140" cy="180" r="1.6" fill="#ffffff" opacity="0.7" className="tm-kettle-bubble kb-6" />
                              </g>

                              {/* Submerged tea leaves during steeping */}
                              {brewingSubStage === "steeping" && (
                                <g className="tm-kettle-steeping-leaves" opacity="0.5">
                                  <path d="M 120,136 Q 130,126 135,138 Q 128,145 120,136 Z" fill="#314526" />
                                  <path d="M 165,148 Q 174,139 179,150 Q 172,156 165,148 Z" fill="#314526" />
                                  <path d="M 144,116 Q 153,107 157,118 Q 150,124 144,116 Z" fill="#314526" />
                                </g>
                              )}

                              {/* Kettle bottom glow */}
                              <ellipse cx="150" cy="182" rx="55" ry="9" fill="rgba(255, 210, 120, 0.4)" />
                            </g>

                            {/* 4. TRANSPARENT GLASS BELLY & SPECULAR HIGHLIGHTS */}
                            <path
                              d="M 104,30 C 76,58 66,124 86,164 C 102,186 122,188 150,188 C 178,188 198,186 214,164 C 234,124 224,58 196,30 Z"
                              fill="rgba(255, 255, 255, 0.08)"
                              stroke="rgba(255, 255, 255, 0.75)"
                              strokeWidth="2"
                            />

                            {/* Left shine */}
                            <path
                              d="M 106,40 C 84,66 78,122 94,156"
                              fill="none"
                              stroke="url(#tm-kettle-shine-l)"
                              strokeWidth="4"
                              strokeLinecap="round"
                            />
                            {/* Right shine */}
                            <path
                              d="M 194,40 C 216,66 222,122 206,156"
                              fill="none"
                              stroke="url(#tm-kettle-shine-r)"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            {/* Base contour */}
                            <ellipse cx="150" cy="185" rx="48" ry="4.5" fill="none" stroke="rgba(255, 255, 255, 0.48)" strokeWidth="1.5" />

                            {/* 5. LID & BRASS FINIAL */}
                            <rect x="118" y="26" width="64" height="6" rx="2.5" fill="url(#tm-gold-accent)" stroke="#74551c" strokeWidth="0.8" />
                            <path
                              d="M 124,26 C 124,14 176,14 176,26 Z"
                              fill="rgba(255, 255, 255, 0.22)"
                              stroke="rgba(255, 255, 255, 0.82)"
                              strokeWidth="1.4"
                            />
                            <ellipse cx="150" cy="25" rx="24" ry="2.8" fill="rgba(255, 255, 255, 0.35)" />
                            <circle cx="150" cy="9" r="5.5" fill="url(#tm-gold-accent)" stroke="#74551c" strokeWidth="0.8" />
                            <circle cx="148" cy="7.5" r="1.6" fill="#ffffff" opacity="0.8" />
                            <rect x="148.8" y="14" width="2.4" height="5" fill="url(#tm-gold-accent)" />
                          </svg>
                        );
                      })()}
                    </div>

                    {/* Realistic Animated Gas Flame & Burner Station Underneath Kettle */}
                    <div className="tm-flame-burner-station" aria-hidden="true">
                      {/* Radiant Heat Glow Aura */}
                      <div className="tm-burner-glow-aura" />

                      {/* 5 Soft Realistic Flickering Flame Tongues */}
                      <div className="tm-flame-tongues-cluster">
                        <div className="tm-flame-tongue ft-1">
                          <span className="ft-outer-tongue" />
                          <span className="ft-blue-core" />
                        </div>
                        <div className="tm-flame-tongue ft-2">
                          <span className="ft-outer-tongue" />
                          <span className="ft-blue-core" />
                        </div>
                        <div className="tm-flame-tongue ft-3">
                          <span className="ft-outer-tongue" />
                          <span className="ft-blue-core" />
                        </div>
                        <div className="tm-flame-tongue ft-4">
                          <span className="ft-outer-tongue" />
                          <span className="ft-blue-core" />
                        </div>
                        <div className="tm-flame-tongue ft-5">
                          <span className="ft-outer-tongue" />
                          <span className="ft-blue-core" />
                        </div>
                      </div>

                      {/* Cast-iron Burner Grate */}
                      <div className="tm-cast-iron-burner-grate">
                        <div className="tm-burner-outer-ring" />
                        <div className="tm-burner-center-hub" />
                      </div>
                    </div>
                  </div>
                )}

                {/* PHASE E: POURING — category-specific premium image reveal */}
                {brewingSubStage === "pouring" && (
                  <div className="tm-ritual-phase-b tm-fade-in">
                    <div className="tm-pouring-asset-wrap">
                      <img
                        src={currentCat.pouringImage}
                        alt={`Pouring fresh ${currentCat.title}`}
                        className="tm-pouring-asset-img"
                      />
                    </div>
                  </div>
                )}

                {/* Real Countdown Timer Controls */}
                <div className="tm-steeping-timer-box">
                  <span className="tm-timer-sub-label">
                    {brewingSubStage === "heating"
                      ? "WARMING WATER & LEAVES"
                      : brewingSubStage === "adding-tea"
                      ? "ADDING WHOLE TEA LEAVES"
                      : brewingSubStage === "infusing-ingredients"
                      ? "ADDING SELECTED INGREDIENTS"
                      : brewingSubStage === "steeping"
                      ? (isTimerPaused ? "STEEPING PAUSED" : "ACTIVE STEEPING COUNTDOWN")
                      : "POURING FRESH TEA"}
                  </span>

                  <div className="tm-timer-display-clock" aria-live="polite">
                    {formatTimer(timeLeft)}
                  </div>

                  <div className="tm-timer-actions">
                    <button
                      type="button"
                      className="tm-timer-btn"
                      onClick={handlePauseResumeTimer}
                      disabled={brewingSubStage === "pouring"}
                    >
                      {isTimerPaused ? "RESUME ▶" : "PAUSE ⏸"}
                    </button>

                    <button
                      type="button"
                      className="tm-timer-btn secondary"
                      onClick={handleResetTimer}
                      disabled={brewingSubStage === "pouring"}
                    >
                      RESET ↺
                    </button>

                    <button
                      type="button"
                      className="tm-timer-btn secondary"
                      onClick={handleSkipTimer}
                      disabled={brewingSubStage === "pouring"}
                    >
                      SKIP TIMER ⏩
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 8: TEA READY (FINAL CELEBRATION RESULT — CUP PROMINENT)
              ======================================================= */}
          {currentStep === 8 && (
            <div className="tm-step-view tm-fade-in" key="step-8">
              <div className="tm-result-celebration-card">
                {/* PROMINENT FINISHED TEA — category-specific artisan ready image */}
                <div className="tm-result-cup-hero">
                  {/* Gentle vapor trails above cup */}
                  <div className="tm-cup-vapor-trails" aria-hidden="true">
                    <span className="tm-vapor-trail vt-1" />
                    <span className="tm-vapor-trail vt-2" />
                    <span className="tm-vapor-trail vt-3" />
                  </div>
                  <div className="tm-result-cup-frame">
                    <img
                      src={currentCat.readyImage}
                      alt={`Your freshly brewed ${currentCat.title}`}
                      className="tm-cup-glass-img tm-cup-ready-img"
                    />
                  </div>
                </div>

                <div className="tm-result-copy">
                  <span className="tm-result-pill">✦ RITUAL COMPLETE</span>
                  <h2 className="tm-ready-heading">
                    Your {selectedTea} Tea is ready 😋
                  </h2>

                  <div className="tm-result-formula">
                    <strong>{currentCat.title}</strong>
                    <span> · {temperature}°C · {strength} Infusion · {cupCount} {cupCount === 1 ? "Cup" : "Cups"}</span>
                    {selectedIngredients.length > 0 && (
                      <div className="tm-result-additions">
                        Enriched with:{" "}
                        {selectedIngredients
                          .map((id) => INGREDIENTS.find((i) => i.id === id)?.name)
                          .join(" + ")}
                      </div>
                    )}
                  </div>

                  <div className="tm-result-quote-box">
                    <p className="tm-result-tasting-notes">✦ {currentCat.notes}</p>
                    <p className="tm-result-quote">"{currentCat.tagline}"</p>
                  </div>

                  <div className="tm-result-action-buttons">
                    <button
                      type="button"
                      className="tm-btn-secondary"
                      onClick={handleRestartFullRitual}
                    >
                      BREW ANOTHER CUP ↺
                    </button>

                    <Link to="/shop" className="tm-btn-secondary">
                      SHOP THIS TEA →
                    </Link>

                    <button
                      type="button"
                      className={`tm-btn-primary ${addedToCartSuccess ? "added" : ""}`}
                      onClick={handleAddToCartRitual}
                    >
                      {addedToCartSuccess ? "ADDED TO CART ✓" : "ADD RITUAL TO CART 🛒"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* =======================================================
          INFORMATIONAL TEA BREWING REFERENCE GUIDE (SEO & USER VALUE)
          ======================================================= */}
      <section className="tm-brewing-reference" aria-label="Tea Brewing Reference Guide" style={{
        maxWidth: "1200px",
        margin: "60px auto 40px",
        padding: "36px 28px",
        background: "linear-gradient(135deg, rgba(251, 247, 239, 0.95) 0%, rgba(243, 228, 201, 0.95) 100%)",
        border: "1px solid rgba(201, 162, 75, 0.35)",
        borderRadius: "16px",
        color: "#0b2b1e"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <p style={{ fontSize: "11px", letterSpacing: "2.5px", textTransform: "uppercase", color: "#c9a24b", fontWeight: 700, margin: "0 0 8px" }}>
            ESSENTIAL KNOWLEDGE
          </p>
          <h2 style={{ fontFamily: "var(--font-display, 'Georgia', serif)", fontSize: "clamp(24px, 3vw, 34px)", margin: "0 0 12px", fontWeight: 400 }}>
            Artisan Tea Brewing &amp; Steeping Guide
          </h2>
          <p style={{ maxWidth: "680px", margin: "0 auto", fontSize: "14.5px", color: "rgba(11, 43, 30, 0.8)", lineHeight: 1.6 }}>
            Every tea variety possesses a distinct personality shaped by its terroir and oxidation level. Use this guide to dial in the ideal water temperature, steeping time, and leaf ratio for the purest cup.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "28px" }}>
          <div style={{ padding: "20px", background: "rgba(255, 255, 255, 0.7)", borderRadius: "10px", border: "1px solid rgba(201, 162, 75, 0.2)" }}>
            <h3 style={{ fontSize: "17px", margin: "0 0 8px", color: "#0b2b1e" }}>🍃 Green Tea Brewing</h3>
            <p style={{ fontSize: "13px", color: "#4b5563", margin: "0 0 10px", lineHeight: 1.5 }}>
              Delicate, unoxidized whole leaves from Himalayan estates require cooler water to prevent bitterness and preserve volatile antioxidants.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", fontSize: "13px", color: "#0b2b1e", lineHeight: 1.8 }}>
              <li><strong>Water Temp:</strong> 75°C – 80°C</li>
              <li><strong>Steeping Time:</strong> 2 – 2.5 minutes</li>
              <li><strong>Leaf Ratio:</strong> 2g per 200ml water</li>
            </ul>
            <Link to="/collections/green-tea" style={{ fontSize: "13px", color: "#0b2b1e", fontWeight: 600, textDecoration: "underline" }}>
              Explore Green Teas →
            </Link>
          </div>

          <div style={{ padding: "20px", background: "rgba(255, 255, 255, 0.7)", borderRadius: "10px", border: "1px solid rgba(201, 162, 75, 0.2)" }}>
            <h3 style={{ fontSize: "17px", margin: "0 0 8px", color: "#0b2b1e" }}>⚪ White Tea Brewing</h3>
            <p style={{ fontSize: "13px", color: "#4b5563", margin: "0 0 10px", lineHeight: 1.5 }}>
              Unopened Silver Tips and gently dried tender buds require gentle warmth to release their silken floral sweetness.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", fontSize: "13px", color: "#0b2b1e", lineHeight: 1.8 }}>
              <li><strong>Water Temp:</strong> 70°C – 75°C</li>
              <li><strong>Steeping Time:</strong> 3 – 4 minutes</li>
              <li><strong>Leaf Ratio:</strong> 2.5g per 200ml water</li>
            </ul>
            <Link to="/collections/white-tea" style={{ fontSize: "13px", color: "#0b2b1e", fontWeight: 600, textDecoration: "underline" }}>
              Explore White Teas →
            </Link>
          </div>

          <div style={{ padding: "20px", background: "rgba(255, 255, 255, 0.7)", borderRadius: "10px", border: "1px solid rgba(201, 162, 75, 0.2)" }}>
            <h3 style={{ fontSize: "17px", margin: "0 0 8px", color: "#0b2b1e" }}>🍂 Black Tea Brewing</h3>
            <p style={{ fontSize: "13px", color: "#4b5563", margin: "0 0 10px", lineHeight: 1.5 }}>
              Fully oxidized Assam and Darjeeling black teas require hot water to draw out bold malty depth and golden liqueur notes.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", fontSize: "13px", color: "#0b2b1e", lineHeight: 1.8 }}>
              <li><strong>Water Temp:</strong> 90°C – 95°C</li>
              <li><strong>Steeping Time:</strong> 3 – 4 minutes</li>
              <li><strong>Leaf Ratio:</strong> 2.5g per 200ml water</li>
            </ul>
            <Link to="/collections/black-tea" style={{ fontSize: "13px", color: "#0b2b1e", fontWeight: 600, textDecoration: "underline" }}>
              Explore Black Teas →
            </Link>
          </div>

          <div style={{ padding: "20px", background: "rgba(255, 255, 255, 0.7)", borderRadius: "10px", border: "1px solid rgba(201, 162, 75, 0.2)" }}>
            <h3 style={{ fontSize: "17px", margin: "0 0 8px", color: "#0b2b1e" }}>🌺 Oolong Tea Brewing</h3>
            <p style={{ fontSize: "13px", color: "#4b5563", margin: "0 0 10px", lineHeight: 1.5 }}>
              Partially oxidized artisanal leaves unfurl across multiple infusions, releasing honeyed orchid notes and deep complexity.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", fontSize: "13px", color: "#0b2b1e", lineHeight: 1.8 }}>
              <li><strong>Water Temp:</strong> 85°C – 90°C</li>
              <li><strong>Steeping Time:</strong> 3 – 5 minutes</li>
              <li><strong>Leaf Ratio:</strong> 3g per 200ml water</li>
            </ul>
            <Link to="/collections/oolong-tea" style={{ fontSize: "13px", color: "#0b2b1e", fontWeight: 600, textDecoration: "underline" }}>
              Explore Oolong Teas →
            </Link>
          </div>
        </div>
      </section>

      {/* =======================================================
          NATIVE SOUNDSCAPE PLAYER
          ======================================================= */}
      <TeaRitualSoundscape />

      {/* =======================================================
          GLOBAL FOOTER
          ======================================================= */}
      <Footer />
    </main>
  );
}
