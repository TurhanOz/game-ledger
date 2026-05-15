# Game Ledger

Game Ledger is a privacy-first, client-side web application (SPA) designed to track and calculate balances, scores, and peer-to-peer settlements during fixed buy-in game sessions (e.g., Poker, Tarot, Belote). 

The application runs entirely in the browser, leveraging local storage for automatic state persistence and enabling manual data backup via JSON import/export utilities.

---

## 🚀 Tech Stack

- **Framework:** Vue 3.5.33 (Composition API)
- **State Management:** Pinia
- **Build System:** Vite
- **Styling:** Tailwind CSS
- **Testing:** Vitest (configured for Test-Driven Development)
- **Deployment:** GitHub Pages (Static Site Generation / Single Page Application)

---

## 📂 Project Architecture & Guidelines

This project follows a strict **Clean Architecture** pattern to isolate core business rules from framework implementation details. All implementation configurations and functional blueprints are documented inside the `specs/` directory.

### Specifications Folder (`/specs`)
Before writing code or configuring UI modules, ensure you read the documents inside the `/specs` directory:
- `specs/spec.md`: Core product vision, functional rules, and UX definitions.
- `specs/tech.spec.md`: Detailed technological constraints, C4 architectural blueprints, and float protection guidelines.
- `specs/tests.spec.md`: Step-by-step TDD behavioral logic scenarios written in GIVEN/WHEN/THEN syntax.
- `specs/copilot-instructions.md`: Explicit architectural guardrails, folder constraints, and rules for AI development agents.

### Directory Mapping
```text
├── public/                # Static assets
├── specs/                 # Product blueprints & AI instructions (Source of Truth)
└── src/
    ├── assets/            # Tailwind CSS input and global styling assets
    ├── components/        # View Layer: Dumb/Presentational UI components
    ├── domain/            # Domain Layer: Pure TypeScript logic (Math, Simplification Engine)
    ├── stores/            # Store Layer: Pinia reactive state & LocalStorage sync
    ├── views/             # View Layer: Main application layout dashboards
    ├── App.vue            # Root Vue Component
    └── main.ts            # Application Entry Point
```

---

## 🛠️ Development Setup

### Install Dependencies
```bash
npm install
```

### Run Local Development Server (Vite)
```bash
npm run dev
```

### Execute TDD Test Suite (Vitest)
Unit tests for the domain layers must pass entirely before UI changes are implemented.
```bash
npm run test
```

### Compile and Build for Production (Static Compilation)
Outputs optimized static assets to the `/dist` directory, ready to be hosted via GitHub Pages.
```bash
npm run build
```

---

## 🌐 GitHub Pages Deployment

This repository is pre-configured to deploy automatically via **GitHub Actions**.

### Configuration Steps

1. **Push your code:** Ensure all your changes are on the `main` branch.
2. **Configure Settings:**
   - Go to your repository on GitHub.
   - Navigate to **Settings → Pages**.
   - Under **Build and deployment > Source**, change the dropdown to **GitHub Actions**.
3. **Verify Deployment:**
   - The deployment workflow will trigger automatically on your next push.
   - You can monitor progress under the **Actions** tab.
   - Once complete, your app will be live at `https://<owner>.github.io/game-ledger/`.

### Routing Note
This application uses **Hash-based Routing** (`createWebHashHistory`). This ensures that deep links (e.g., `/#/session/...` or `/#/settings`) work correctly on GitHub Pages without requiring server-side fallback configuration. All routes remain accessible even after a browser refresh.

---

## ⚖️ License

**Proprietary**

Copyright (c) 2026. All rights reserved. 

This software and its associated documentation files are proprietary. Unauthorized copying, distribution, modification, reverse engineering, or public display of this software via any medium is strictly prohibited.