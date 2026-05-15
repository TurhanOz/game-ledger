# SPEC DIFF 1 — Functional Changes Applied to V1.1

> **Baseline:** V1.0 (initial specification)  
> **Target:** V1.1 (`spec.md`)  
> **Date:** 2026-05-15

---

## Summary of Changes

Four functional adjustments were made relative to the initial V1.0 specification.

---

### CHANGE 1 — Removed: Session Title Field

**V1.0 behaviour:** A `GameSession` had a `title` string field editable by the user during session creation.

**V1.1 behaviour:** `GameSession.title` is entirely removed from the data model. Sessions carry no user-defined title. They are identified in the UI solely by their game type name and date.

**Impact:**
- `GameSession` entity: drop `title` property.
- Session creation form: remove title input field.
- Session list and session header: derive display label from `gameType.name + date`.

---

### CHANGE 2 — Added: Round Winner Timestamp

**V1.0 behaviour:** A round entry stored only `{ winnerId: UUID }`.

**V1.1 behaviour:** A round entry stores `{ winnerId: UUID, timestamp: Date }`. The timestamp is recorded automatically as `new Date().toISOString()` at the exact moment the winner button is tapped.

**Impact:**
- `Round` entity: add mandatory `timestamp` field (ISO 8601 string).
- Fast Round Entry action: capture and persist `timestamp` alongside `winnerId`.
- Round History list: display the timestamp for each round entry.

---

### CHANGE 3 — Changed: Session List Ordered Latest First

**V1.0 behaviour:** Sessions on the Dashboard were listed in insertion order (oldest first).

**V1.1 behaviour:** Sessions on the Dashboard are ordered **descending by `date`** (latest first).

**Impact:**
- Dashboard session list: sort `gameSessions` by `date` descending before rendering.
- No data model change required.

---

### CHANGE 4 — Added: Session Locking Policy (Latest-Session-Only Mutations)

**V1.0 behaviour:** Any session could have new rounds added, its last round undone, or itself deleted at any time.

**V1.1 behaviour:** A strict **latest-session-only** mutation policy is enforced:

| Action | Latest session | All other sessions |
|---|---|---|
| Enter round winner | ✅ Allowed | ❌ Blocked |
| Undo last round | ✅ Allowed | ❌ Blocked |
| Delete session | ✅ Allowed (with confirmation) | ❌ Blocked |
| View rounds & balances | ✅ | ✅ |

- The "latest session" is defined as the session with the highest `date` value in `gameSessions`.
- Locked sessions display a visual lock indicator on their session card.
- The Fast Round Entry interface and the Delete Last Round button are hidden/disabled for locked sessions.

**Impact:**
- Store layer: `canMutateSession(sessionId)` guard before any write action.
- `SessionView`: conditionally render round entry panel and undo button based on lock status.
- `SessionCard`: display lock badge for non-latest sessions.
