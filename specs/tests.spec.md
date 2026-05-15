# TEST SPECIFICATIONS: GAME LEDGER (TDD GUIDE)

This document outlines the core test scenarios that must be implemented to validate the business logic, state transitions, and edge cases of the Game Ledger application. Each test scenario must be independent.

---

## 1. REFERENCE DATA VALIDATION

### Test Scenario 1.1: Player Management
*   **GIVEN:** An empty player registry.
*   **WHEN:** A user adds a player named "Alice".
*   **THEN:** A unique UUID must be generated, and "Alice" must exist in the state.
*   **WHEN:** A user attempts to delete "Alice" while she is NOT linked to any game session.
*   **THEN:** "Alice" is successfully removed from the registry.

### Test Scenario 1.2: Prevent Linked Player Deletion
*   **GIVEN:** A player "Bob" who is part of an active or past `gameSession`.
*   **WHEN:** A user attempts to delete "Bob".
*   **THEN:** The system must throw an error or reject the action, preserving data integrity.

---

## 2. GAME SESSION & ROUND CALCULATIONS

### Test Scenario 2.1: Basic Round Ledger Calculations
*   **GIVEN:** A game session with 3 players (Alice, Bob, Charlie) and a buy-in (cave) of $10.
*   **WHEN:** 1 round is played, and **Alice wins**.
*   **THEN:** 
    *   Alice's session balance must be: $+20$ (calculated as $(3 - 1) \times 10$)
    *   Bob's session balance must be: $-10$
    *   Charlie's session balance must be: $-10$
    *   The sum of all session balances must equal exactly $0$.

### Test Scenario 2.2: Consecutive Rounds Accumulation
*   **GIVEN:** A game session with 3 players (Alice, Bob, Charlie), a buy-in (cave) of $10$, and an initial session balance from a previous round where Alice won (Initial Balances -> Alice: $+20$, Bob: $-10$, Charlie: $-10$).
*   **WHEN:** A new round is played, and **Bob wins**.
*   **THEN:** 
    *   Alice's session balance becomes: $+20 - 10 = +10$
    *   Bob's session balance becomes: $-10 + 20 = +10$
    *   Charlie's session balance becomes: $-10 - 10 = -20$
    *   The sum of all session balances must equal exactly $0$.

### Test Scenario 2.3: Undo Last Round
*   **GIVEN:** A game session with 3 players (Alice, Bob, Charlie), a buy-in (cave) of $10$, and 2 rounds already recorded (Round 1: Alice won, Round 2: Bob won), resulting in current balances of (Alice: $+10$, Bob: $+10$, Charlie: $-20$).
*   **WHEN:** The user triggers the "Delete Last Round" (Undo) action.
*   **THEN:** 
    *   Round 2 is removed from the session history.
    *   Balances revert exactly to the state of Round 1 (Alice: $+20$, Bob: $-10$, Charlie: $-10$).

---

## 3. GLOBAL LEDGER VIEW & REFUNDS

### Test Scenario 3.1: Consolidated View vs Actual Ledger View
*   **GIVEN:** An application state containing:
    *   Session 1 (Buy-in $5$): 1 round played, Alice won against Bob (Alice: $+5$, Bob: $-5$).
    *   Session 2 (Buy-in $10$): 1 round played, Alice won against Bob (Alice: $+10$, Bob: $-10$).
    *   A global Refund transaction logged: **Bob paid Alice $5$**.
*   **WHEN:** Retrieving the dashboards.
*   **THEN:** 
    *   **Consolidated View (Raw Performance):** Alice is at $+15$, Bob is at $-15$ (Refunds are completely ignored).
    *   **Ledger View (Actual Debts):** Alice is at $+10$, Bob is at $-10$ (Accounted: $+15 - 5$ for Alice, $-15 + 5$ for Bob).

---

## 4. DEBT SIMPLIFICATION (MIN-MAX CASH FLOW)

### Test Scenario 4.1: Linear Debt Simplification (A -> B -> C)
*   **GIVEN:** The net Ledger View calculations state that:
    *   Alice owes Bob $10$.
    *   Bob owes Charlie $10$.
*   **WHEN:** Generating the **Simplified View (Settlement)**.
*   **THEN:** The system must output a single transaction:
    *   `"Alice must pay Charlie $10$"`
    *   Bob's name must not appear in the final required settlements.

### Test Scenario 4.2: Complex Multi-Player Settlement
*   **GIVEN:** The net Ledger View calculations state that:
    *   Alice: $+50$ (Creditor)
    *   Bob: $-30$ (Debtor)
    *   Charlie: $-20$ (Debtor)
*   **WHEN:** Generating the **Simplified View (Settlement)**.
*   **THEN:** The system must suggest exactly two transactions:
    *   `"Bob must pay Alice $30$"`
    *   `"Charlie must pay Alice $20$"`

---

## 5. PERSISTENCE & DATA INTEGRITY

### Test Scenario 5.1: LocalStorage Sync
*   **GIVEN:** The application state changes (e.g., a new round is added).
*   **WHEN:** The action completes.
*   **THEN:** `window.localStorage` must be updated with the exact stringified payload of the new global `AppState`.

### Test Scenario 5.2: State Reset (Clean Session)
*   **GIVEN:** An active state containing populated arrays for players, sessions, and history.
*   **WHEN:** The "Clean Session" action is triggered and confirmed.
*   **THEN:** `window.localStorage` must be cleared, and the internal `AppState` must immediately reset to empty arrays.