import type { GameSession, Refund } from './types'
import { computeSessionBalances } from './calculations'

/**
 * Sums session balances across all sessions. Refunds are ignored entirely.
 * Values are in integer cents.
 */
export function computeConsolidatedBalances(
  sessions: GameSession[],
): Record<string, number> {
  const balances: Record<string, number> = {}
  for (const session of sessions) {
    const sessionBalances = computeSessionBalances(session)
    for (const [id, amount] of Object.entries(sessionBalances)) {
      balances[id] = (balances[id] ?? 0) + amount
    }
  }
  return balances
}

/**
 * Builds ledger balances from consolidated balances with refunds applied.
 * emitter (who paid) balance increases (debt decreases).
 * receptor (who received) balance decreases (credit decreases).
 * Values are in integer cents.
 */
export function computeLedgerBalances(
  sessions: GameSession[],
  refunds: Refund[],
): Record<string, number> {
  const balances = computeConsolidatedBalances(sessions)
  for (const refund of refunds) {
    balances[refund.emitterId] = (balances[refund.emitterId] ?? 0) + refund.amount
    balances[refund.receptorId] = (balances[refund.receptorId] ?? 0) - refund.amount
  }
  return balances
}
