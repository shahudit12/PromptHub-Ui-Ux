# PromptHub — Frontend UI/UX Studio

Welcome to the **PromptHub Frontend UI/UX** development workspace!

This repository contains the standalone frontend application for PromptHub. It is pre-configured with local mock data, local state persistence, and simulated AI/Studio interactions. **No backend server, database, or external API keys are required** to develop, preview, or refine the UI/UX.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173` to see the application running.

### 4. Build for Production
To test production bundling and type checks:
```bash
npm run build
```
Preview the production build locally:
```bash
npm run preview
```

---

## 🎨 UI/UX Features Available for Development

- **Obsidian Dark & Theme System**: Handcrafted Dark and Light themes with high-contrast accessibility (Tailwind CSS 4 + custom CSS design tokens in `src/index.css`).
- **Prompt Catalog & Marketplace**: Real-time filtering, category navigation, search, and sorting.
- **Prompt Creation & IDE**: Variable detection (`{{variable}}`), model comparison, syntax testing, and real-time prompt grading.
- **Agent Studio & Playground**: Interactive prompt execution sandbox with realistic simulated model responses.
- **Creator Profiles & Community**: User profile preview, social interactions, follower lists, badges, and feedback modals.
- **Admin & Moderation Portal**: User management, mock analytics, submissions review, and credit controls.
- **Wallet & Pricing**: Plan cards, simulated checkout modals, credit ledger, and payout configuration views.
- **Responsive Mobile & Desktop**: Designed with custom drawers, mobile navigation bars, and slide-over panels.

---

## 📁 Project Structure

```text
PromptHub/
├── public/                 # Static assets, SVG icons, PWA manifest
├── src/
│   ├── components/         # Reusable UI components & modals
│   │   ├── common/         # Core buttons, inputs, tags, tooltips, dialogs
│   │   ├── community/      # Prompt cards, filter bars, rating stars
│   │   ├── modals/         # Share, preview, verification, and feedback modals
│   │   ├── studio/         # AI IDE editor, variables panel, output tester
│   │   └── workspace/      # Unified creation workspace components
│   ├── context/            # Global React state (AppContext) with offline persistence
│   ├── data/               # Curated starter prompts & seed data
│   ├── db/                 # TypeScript interfaces and data models
│   ├── hooks/              # Custom React hooks (theme, breakpoints, keyboard navigation)
│   ├── repositories/       # Client-side localStorage repositories
│   ├── services/           # Mock services for authentication, credits, and AI simulations
│   ├── views/              # Main application views (Home, Marketplace, Studio, Admin, Settings)
│   ├── App.tsx             # Root router and view orchestrator
│   ├── main.tsx            # Application entrypoint
│   └── index.css           # Global design system & theme tokens
├── index.html              # HTML shell & font definitions
├── package.json            # Scripts & frontend dependencies
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build and asset pipeline configuration
```

---

## 🛠️ Mock Data & Local Testing

- **Default User Session**: The application automatically logs in with a default demo profile:
  - **Name**: Alex Rivera (`developer@prompthub.dev`)
  - **Role**: Admin / Creator
  - **Credits**: 5,000 credits
- **Persistence**: Any edits, created prompts, likes, or settings are safely stored in your browser's `localStorage`.
- **Resetting State**: To reset to the initial seed state at any time, open your browser developer tools and run:
  ```javascript
  localStorage.clear();
  location.reload();
  ```

---

## 💻 Tech Stack
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + Lucide Icons + Framer Motion
- **Build Tool**: Vite 6
- **Architecture**: 100% Offline-First Client Architecture
