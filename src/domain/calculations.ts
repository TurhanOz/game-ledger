import type { GameSession } from './types'

/**
 * Computes the balance delta for a single round.
 * Winner gains (participantCount - 1) * buyInCents.
 * Each loser loses buyInCents.
 * All values are in integer cents. Sum of deltas is always 0.
 */
export function computeRoundDelta(
  participantIds: string[],
  winnerId: string,
  buyInCents: number,
): Record<string, number> {
  const delta: Record<string, number> = {}
  for (const id of participantIds) {
    delta[id] = id === winnerId
      ? (participantIds.length - 1) * buyInCents
      : -buyInCents
  }
  return delta
}

/**
 * Computes cumulative balance for each participant across all rounds in a session.
 * Values are in integer cents.
 */
export function computeSessionBalances(session: GameSession): Record<string, number> {
  const balances: Record<string, number> = {}
  for (const id of session.participantIds) {
    balances[id] = 0
  }
  for (const round of session.rounds) {
    const delta = computeRoundDelta(session.participantIds, round.winnerId, session.buyIn)
    for (const id of session.participantIds) {
      balances[id] += delta[id]
    }
  }
  return balances
}
