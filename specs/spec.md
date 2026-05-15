# FUNCTIONAL SPECIFICATION: GAME LEDGER (V1.0 FINAL)

## 1. PRODUCT VISION
Game Ledger is a web application (SPA) designed to calculate and track balances owed between players during fixed buy-in game sessions (e.g., Poker, Belote, Tarot). 
- **Philosophy:** Total autonomy (no backend database), local persistence, and frictionless entry during live gameplay.

## 2. DATA MODEL (ENTITIES)
The global application state (`AppState`) must be JSON-serializable according to the following structure:

- **Players:** `Array<{ id: UUID, name: String }>`
- **GameTypes:** `Array<{ id: UUID, name: String }>` (e.g., "Poker", "Tarot")
- **GameSessions:** `Array<{
    id: UUID,
    title: String,
    date: Date,
    gameTypeId: UUID,
    buyIn: Number (Amount X),
    participantIds: Array<UUID>,
    rounds: Array<{ winnerId: UUID }>
  }>`
- **Refunds:** `Array<{
    id: UUID,
    emitterId: UUID,
    receptorId: UUID,
    amount: Number,
    date: Date
  }>`

## 3. BUSINESS LOGIC & CALCULATION RULES

### 3.1 Round Calculation
For each round within a game session counting Y players and a buy-in amount X:
- **Losers (Y-1 players):** Their session balance decreases by X.
- **Winner (1 player):** Their session balance increases by X * (Y - 1).
- **Rule:** Each round has exactly one winner.

### 3.2 Ledgers and Views
The application must dynamically compute four reading levels:
1. **Session View:** Breakdown of wins/losses within a single specific game session.
2. **Consolidated View (Performance):** Total sum of wins and losses across all rounds of all sessions. This view ignores refunds to reflect raw game scores.
3. **Ledger View (Actual Debts):** (Wins - Losses) - (Sum of issued refunds) + (Sum of received refunds).
4. **Simplified View (Settlement):** Application of a debt simplification algorithm (Min-Max Cash Flow) to minimize the number of transactions required to settle all accounts (e.g., if A owes B and B owes C, then A owes C).

## 4. REQUIRED FEATURES

### 4.1 Reference Data Management (CRUD)
- **Players:** Create, update, delete (prevent deletion if linked to an existing session).
- **Game Types:** Create, update, delete (prevent deletion if linked to an existing session).

### 4.2 Session Management (Mobile Optimization)
- **Creation:** Input title, select game type, select date, and set buy-in amount X.
- **Participants:** Multi-select from the player registry. The player list is locked once the session is created (Y is fixed).
- **Fast Entry:** Interface featuring large buttons for each participating player. Tapping a name logs that player as the round winner and instantly increments balances.
- **History:** List of rounds with a "Delete Last Round" (Undo) option.

### 4.3 Refunds / Peer-to-Peer Settlements
- Free-form entry (outside of sessions): Who paid, to whom, and the amount.

## 5. DATA PERSISTENCE AND LIFECYCLE
- **Default Persistence:** Uses `window.localStorage`. Every user action triggers an immediate save.
- **Loading:** Upon page refresh, the application automatically restores the state from local storage.
- **Reset:** A "Clean Session" button to completely wipe local storage data (requires explicit security confirmation).
- **Export:** Generates and downloads a `ledger_data.json` file.
- **Import:** Uploads a JSON file that completely replaces the current state (requires structure validation and confirmation).

## 6. TECHNICAL AND UI CONSTRAINTS
- **Interface:** Responsive (Mobile-First for game entry, Desktop for detailed dashboards).
- **Identifiers:** Strict use of UUID v4.
- **Calculations:** Floating-point precision locked to 2 decimal places for monetary values.
- **Design:** Binary color-coding (Green for wins/credits, Red for losses/debts).
- **Suggested Stack:** Modern JS Framework (React, Vue, Svelte, nuxt w/ SSG mode(static site generation)) + Tailwind CSS.