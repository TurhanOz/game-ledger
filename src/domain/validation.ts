import type { AppState, GameSession, Refund } from './types'

/**
 * Returns false if the player is referenced by any session or refund.
 * Hard-blocks deletion to preserve relational integrity.
 */
export function canDeletePlayer(
  playerId: string,
  sessions: GameSession[],
  refunds: Refund[],
): boolean {
  const inSession = sessions.some((s) => s.participantIds.includes(playerId))
  if (inSession) return false

  const inRefund = refunds.some(
    (r) => r.emitterId === playerId || r.receptorId === playerId,
  )
  return !inRefund
}

/**
 * Returns false if the game type is referenced by any session.
 * Hard-blocks deletion to preserve relational integrity.
 */
export function canDeleteGameType(gameTypeId: string, sessions: GameSession[]): boolean {
  return !sessions.some((s) => s.gameTypeId === gameTypeId)
}

/**
 * Validates the shape of a parsed JSON object and returns it as AppState.
 * Throws a descriptive Error if any field is missing or has the wrong type.
 * Used for localStorage hydration and JSON import.
 */
export function parseAndValidateAppState(raw: unknown): AppState {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Invalid state: root must be a plain object')
  }

  const obj = raw as Record<string, unknown>

  if (!Array.isArray(obj['players'])) throw new Error('Invalid state: players must be an array')
  if (!Array.isArray(obj['gameTypes'])) throw new Error('Invalid state: gameTypes must be an array')
  if (!Array.isArray(obj['gameSessions'])) throw new Error('Invalid state: gameSessions must be an array')
  if (!Array.isArray(obj['refunds'])) throw new Error('Invalid state: refunds must be an array')

  for (const item of obj['players'] as unknown[]) {
    assertString((item as Record<string, unknown>)['id'], 'player.id')
    assertString((item as Record<string, unknown>)['name'], 'player.name')
  }

  for (const item of obj['gameTypes'] as unknown[]) {
    assertString((item as Record<string, unknown>)['id'], 'gameType.id')
    assertString((item as Record<string, unknown>)['name'], 'gameType.name')
  }

  for (const item of obj['gameSessions'] as unknown[]) {
    const s = item as Record<string, unknown>
    assertString(s['id'], 'gameSession.id')
    assertString(s['date'], 'gameSession.date')
    // createdAt is optional for backward-compatibility with older exports
    if (s['createdAt'] !== undefined) assertString(s['createdAt'], 'gameSession.createdAt')
    assertString(s['gameTypeId'], 'gameSession.gameTypeId')
    if (typeof s['buyIn'] !== 'number') throw new Error('Invalid state: gameSession.buyIn must be a number')
    if (!Array.isArray(s['participantIds'])) throw new Error('Invalid state: gameSession.participantIds must be an array')
    if (!Array.isArray(s['rounds'])) throw new Error('Invalid state: gameSession.rounds must be an array')

    for (const pid of s['participantIds'] as unknown[]) {
      if (typeof pid !== 'string') throw new Error('Invalid state: participantId must be a string')
    }

    for (const round of s['rounds'] as unknown[]) {
      assertString((round as Record<string, unknown>)['winnerId'], 'round.winnerId')
      assertString((round as Record<string, unknown>)['timestamp'], 'round.timestamp')
    }
  }

  for (const item of obj['refunds'] as unknown[]) {
    const r = item as Record<string, unknown>
    assertString(r['id'], 'refund.id')
    assertString(r['emitterId'], 'refund.emitterId')
    assertString(r['receptorId'], 'refund.receptorId')
    assertString(r['date'], 'refund.date')
    if (typeof r['amount'] !== 'number') throw new Error('Invalid state: refund.amount must be a number')
  }

  return obj as unknown as AppState
}

function assertString(value: unknown, field: string): void {
  if (typeof value !== 'string') {
    throw new Error(`Invalid state: ${field} must be a string`)
  }
}
