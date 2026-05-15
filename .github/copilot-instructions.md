# COPLAY INSTRUCTIONS: GAME LEDGER ARCHITECTURE & CODING STANDARDS

## 1. Clean Architecture Layers
All code must be strictly categorized into one of the following layers. Dependencies must only point inwards (`View -> Store -> Domain`).

### 1.1 Domain Layer (`src/domain/`)
- **Pure Logic:** Contains exclusively pure TypeScript functions, interfaces, and deterministic custom types.
- **No Frameworks:** Absolutely zero imports from `vue`, `pinia`, or external UI/state libraries. 
- **Responsibilities:** Game round balance calculations, the Min-Max Cash Flow debt simplification algorithm, and core data schema validation.
- **Rule for AI:** If you need to manipulate data, write a pure function here. Do not look at or mutate reactive states directly inside this directory.

### 1.2 Store Layer (`src/stores/`)
- **State Management:** Pinia stores running on Vue 3.5.33 composition patterns. Orchestrates domain execution.
- **Framework Glue:** This layer reads reactive views, invokes the pure functions inside `src/domain/`, and commits the results to the state.
- **Persistence:** Handles automated JSON serialization, `window.localStorage` synchronization, and schema hydration during startup.

### 1.3 View Layer (`src/views/`, `src/components/`)
- **UI Execution:** Vue components utilizing the `<script setup>` syntax. Styled exclusively via Tailwind CSS.
- **Dumb Components:** Components must prefer receiving raw read-only data via props and bubble actions up via events (`emit`). Minimize stateful evaluations inside components.

---

## 2. Technical Safeguards & Logic Constraints

### 2.1 Currency & Precision Floating-Point Math
- **Float Protection:** JavaScript native binary floating-point issues (e.g., `0.1 + 0.2 = 0.30000000000000004`) are strictly forbidden in financial calculations.
- **Implementation Rule:** All monetary ledger properties must either be managed as scaled integers (cents math: multiplying by 100 before calculation and dividing by 100 for display) or safely formatted via strict precision rounding functions before saving mutations. Keep values locked to exactly 2 decimal places.

### 2.2 Entity Identifiers & Relational Protection
- **UUID Generation:** Every entity (`players`, `gameTypes`, `gameSessions`, `refunds`) must utilize RFC4122 UUID v4 generated strictly via native web APIs: `crypto.randomUUID()`.
- **Reference Integrity:** Deleting records must check for active relational dependencies. Hard-block the deletion of any `player` or `gameType` if their specific ID is still tied to a past `gameSession` or `refund`.

---

## 3. UI/UX Design System Tokens
- **Responsive Layout Execution:**
  - *Mobile (< 768px):* Single column layout. Action-heavy components (like registering round winners) must use large touch targets (minimum interactive area of `44px x 44px`).
  - *Desktop (>= 768px):* Grid dashboards showcasing tables side-by-side with reference lists.
- **Semantic Color Coding:**
  - Financial credits, positive balances, and cash arrivals must map to semantic green variants (e.g., `text-green-600`, `bg-green-50`).
  - Financial debts, negative balances, and outlays must map to semantic red variants (e.g., `text-red-600`, `bg-red-50`).

---

## 4. Quality Assurance & Test Driven Development (TDD)
- **TDD Workflow:** You must implement test cases before scaffolding corresponding features.
- **Test Target Isolation:** Unit tests must thoroughly validate the `src/domain/` algorithms in absolute isolation from the DOM, Vue reactivity, and Pinia. Ensure the calculation engine always evaluates correctly across multiple complex multi-player scenarios.

## 5. Communication Style
- Be concise and technical.
- Do not make assumptions. If a requirement is ambiguous (e.g., how to handle a specific tie-break in settlement), ask for clarification immediately.