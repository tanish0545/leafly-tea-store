/* =========================================================
   LEAFLY — BRAND LOADER (retired as global animation)

   Root cause fix: This component previously ran the tea-leaf →
   water-ripple → book animation on EVERY page refresh because it
   was mounted globally in App.tsx outside of any route guard.

   The Journal page already manages its own `journal-loader` via
   createPortal in Journal.tsx.  There is no other route that
   requires a full-screen entry animation.

   Resolution: BrandLoader now always returns null.  The Journal
   animation is scoped to Journal.tsx and fires only on /journal.
   All other pages (Home, Shop, Login, Checkout, Admin, Reset
   Password, …) load instantly without any loading animation.
   ========================================================= */

// Imports kept so App.tsx does not need changes.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import "./BrandLoader.css";

export default function BrandLoader() {
  // Intentionally returns null.
  // Journal animation is owned by Journal.tsx → journal-loader portal.
  return null;
}
