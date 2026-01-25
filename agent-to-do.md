# KnowBear Project Roadmap: Chronological To-Do List

This document outlines the development path for KnowBear, organized by logical implementation phases to ensure a stable and scalable build.

---

## Phase 1: Backend Core & Architecture Cleanup
*Focus: Stabilizing the "AI Brain" and codebase structure before building new features.*

1.  **Backend Import Cleanup**
    *   Refactor `api/index.py` and directory structure to use standard Python import mechanisms instead of runtime `sys.path` manipulation.
2.  **Ensemble Logic & Deep Dive Refactor**
    *   **REMOVE**: Scrap the "Deep Dive" mode completely.
    *   **KEEP/IMPROVE**: Heavily test and tune Ensemble answers to ensure they significantly outperform Fast mode in accuracy and synthesis.
3.  **Technical Depth Mode Overhaul**
    *   **REFACTOR**: Remove the old Technical/Systemic modes from simple dropdowns.
    *   **ENHANCE**: Integrate real-time web quoting, `mermaid.js` diagrams, and explanatory images. Answer quality must meet academic/research standards.

---

## Phase 2: User Infrastructure & Identity [COMPLETED]
*Focus: Setting up the foundation for personalized data and history.*

4.  **User Profile & History (Backend)** [DONE]
    *   Implement the database schema and API endpoints to allow logged-in users to save and retrieve their query history.
5.  **Enhanced Left Sidebar (UI Foundation)** [DONE]
    *   Create a persistent/collapsible sidebar (ChatGPT-style).
    *   **FEATURES**: Display account status (Guest, Logged In, Pro), a list of recent query history, and **Sign-in / Sign-out buttons** for quick user management.
6.  **Landing Page Auth Integration** [DONE]
    *   Move Google Sign-Up/Login prominently to the landing page to reduce user friction.

---

## Phase 3: UI/UX & Mobile-First Navigation
*Focus: Making the app look and feel premium on every device.*

7.  **Integrated Mode Selection**
    *   Move Fast, Ensemble, and Technical modes into a unified, high-polish dropdown menu.
8.  **Mobile-First UI/UX Optimization**
    *   Ensure the **Landing Page** and the core App interface are fully optimized for all mobile screen sizes.
    *   Ensure all touch targets and layouts are optimized for mobile.
    *   Implement dynamic button resizing based on viewport.
9.  **Mobile Bottom Navigation**
    *   Implement a sticky bottom navbar for mobile screens.
    *   **FEATURES**: Include "Regenerate," "Export," and the "Mode Dropdown" in this sticky bar.

---

## Phase 4: Experience Polish & Gating Logic
*Focus: Fine-tuning output quality and implementing the business model.*

10. **Fix Meme Style Answers**
    *   Remove internal "thinking process" artifacts from outputs. Ensure tone is "quippy" and consistent.
11. **AI Response Streaming & UX Polish**
    *   Implement SSE/WebSockets for a "typewriter" effect.
    *   Replace spinners with high-quality **Skeleton Loaders**.
12. **Guest User Experience & Onboarding**
    *   Default guests to "Fast" mode; hide premium modes.
    *   Trigger an onboarding modal on entry or after the first query to explain the benefits of signing up/upgrading.
13. **Dynamic Rejection Handling**
    *   Replace generic upgrade messages with context-aware ones (e.g., "Upgrade to Pro to export as PDF").

---

## Phase 5: Production Hardening & Optimization
*Focus: Security, performance, and monitoring for a real-world launch.*

14. **Production Hardening (Security & Performance)**
    *   Implement **Rate Limiting** (Redis/Memory) to prevent API abuse.
    *   Add **Response Caching** for popular queries to save costs and time.
    *   Implement Input Sanitization to prevent prompt injection.
15. **Frontend State Management Optimization**
    *   Migrate from manual `useState` fetching to **TanStack Query (React Query)** for better caching and race-condition handling.
16. **Observability & Error Tracking**
    *   Integrate **Sentry** for crash reports and **PostHog/Umami** for privacy-focused user analytics.

---

## Phase 6: Growth, Compliance & Scaling
*Focus: Long-term sustainability and search engine visibility.*

17. **SEO & Shareability**
    *   Implement Dynamic OpenGraph (OG) images for shared queries.
    *   Generate a `sitemap.xml` for educational topics.
18. **Accessibility (a11y) Audit**
    *   Final pass to ensure high contrast, screen reader compatibility, and full keyboard navigation.
19. **End-to-End (E2E) Testing**
    *   Implement **Playwright/Cypress** tests for critical paths (Auth, Search, Gating, Payment flows).
