import { describe, it, expect } from 'vitest'
import { computeRoundDelta, computeSessionBalances } from '../calculations'
import type { GameSession } from '../types'

describe('computeRoundDelta', () => {
  it('Scenario 2.1: Alice wins 1 round — 3 players, buy-in $10 (1000 cents)', () => {
    const participantIds = ['alice', 'bob', 'charlie']
    const delta = computeRoundDelta(participantIds, 'alice', 1000)

    expect(delta['alice']).toBe(2000)   // (3-1) * 1000
    expect(delta['bob']).toBe(-1000)
    expect(delta['charlie']).toBe(-1000)

    const sum = Object.values(delta).reduce((a, b) => a + b, 0)
    expect(sum).toBe(0)
  })

  it('single loser pays winner when only 2 players', () => {
    const delta = computeRoundDelta(['alice', 'bob'], 'bob', 500)
    expect(delta['alice']).toBe(-500)
    expect(delta['bob']).toBe(500)
    expect(Object.values(delta).reduce((a, b) => a + b, 0)).toBe(0)
  })
})

describe('computeSessionBalances', () => {
  const baseSession: GameSession = {
    id: 's1',
    date: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    gameTypeId: 'gt1',
    buyIn: 1000,
    participantIds: ['alice', 'bob', 'charlie'],
    rounds: [],
  }

  it('Scenario 2.1: 1 round, Alice wins — balances sum to 0', () => {
    const session: GameSession = { ...baseSession, rounds: [{ winnerId: 'alice', timestamp: '2026-01-01T00:00:00.000Z' }] }
    const balances = computeSessionBalances(session)

    expect(balances['alice']).toBe(2000)
    expect(balances['bob']).toBe(-1000)
    expect(balances['charlie']).toBe(-1000)
    expect(Object.values(balances).reduce((a, b) => a + b, 0)).toBe(0)
  })

  it('Scenario 2.2: 2 rounds accumulated — Bob wins round 2', () => {
    const session: GameSession = {
      ...baseSession,
      rounds: [{ winnerId: 'alice', timestamp: '2026-01-01T00:00:00.000Z' }, { winnerId: 'bob', timestamp: '2026-01-01T00:01:00.000Z' }],
    }
    const balances = computeSessionBalances(session)

    // Round 1: Alice +2000, Bob -1000, Charlie -1000
    // Round 2: Bob +2000, Alice -1000, Charlie -1000
    // Total: Alice +1000, Bob +1000, Charlie -2000
    expect(balances['alice']).toBe(1000)
    expect(balances['bob']).toBe(1000)
    expect(balances['charlie']).toBe(-2000)
    expect(Object.values(balances).reduce((a, b) => a + b, 0)).toBe(0)
  })

  it('Scenario 2.3: Undo last round — removing round 2 reverts to round-1 state', () => {
    const twoRounds: GameSession = {
      ...baseSession,
      rounds: [{ winnerId: 'alice', timestamp: '2026-01-01T00:00:00.000Z' }, { winnerId: 'bob', timestamp: '2026-01-01T00:01:00.000Z' }],
    }
    const oneRound: GameSession = {
      ...baseSession,
      rounds: [{ winnerId: 'alice', timestamp: '2026-01-01T00:00:00.000Z' }],
    }

    const balancesAfterUndo = computeSessionBalances(oneRound)
    const expectedAfterRound1 = computeSessionBalances(twoRounds)

    // Verify that after undo (1 round) we have round-1 state
    expect(balancesAfterUndo['alice']).toBe(2000)
    expect(balancesAfterUndo['bob']).toBe(-1000)
    expect(balancesAfterUndo['charlie']).toBe(-1000)

    // Verify 2-round balances are different from 1-round
    expect(expectedAfterRound1['alice']).not.toBe(balancesAfterUndo['alice'])
  })

  it('empty session returns all participants at 0', () => {
    const balances = computeSessionBalances(baseSession)
    expect(balances['alice']).toBe(0)
    expect(balances['bob']).toBe(0)
    expect(balances['charlie']).toBe(0)
  })
})
