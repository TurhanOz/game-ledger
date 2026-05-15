import { describe, it, expect } from 'vitest'
import { computeConsolidatedBalances, computeLedgerBalances } from '../ledger'
import type { GameSession, Refund } from '../types'

// Scenario 3.1 shared state:
// Session 1: 2 players, buy-in $5 (500 cents), 1 round, Alice wins
// Session 2: 2 players, buy-in $10 (1000 cents), 1 round, Alice wins
// Refund: Bob (emitter/paid) → Alice (receptor/received) $5 (500 cents)

const session1: GameSession = {
  id: 's1',
  title: 'Session 1',
  date: '2026-01-01T00:00:00.000Z',
  gameTypeId: 'gt1',
  buyIn: 500,
  participantIds: ['alice', 'bob'],
  rounds: [{ winnerId: 'alice' }],
}

const session2: GameSession = {
  id: 's2',
  title: 'Session 2',
  date: '2026-01-02T00:00:00.000Z',
  gameTypeId: 'gt1',
  buyIn: 1000,
  participantIds: ['alice', 'bob'],
  rounds: [{ winnerId: 'alice' }],
}

// Bob paid Alice $5 — Bob is emitter (who paid), Alice is receptor (who received)
const refund: Refund = {
  id: 'r1',
  emitterId: 'bob',
  receptorId: 'alice',
  amount: 500,
  date: '2026-01-03T00:00:00.000Z',
}

describe('computeConsolidatedBalances', () => {
  it('Scenario 3.1: Consolidated view ignores refunds entirely', () => {
    const balances = computeConsolidatedBalances([session1, session2])

    // Session 1: Alice wins 2-player, buy-in 500 → Alice +500, Bob -500
    // Session 2: Alice wins 2-player, buy-in 1000 → Alice +1000, Bob -1000
    // Total: Alice +1500, Bob -1500
    expect(balances['alice']).toBe(1500)
    expect(balances['bob']).toBe(-1500)
  })

  it('returns empty object for no sessions', () => {
    const balances = computeConsolidatedBalances([])
    expect(Object.keys(balances)).toHaveLength(0)
  })

  it('sums correctly across multiple sessions', () => {
    const sum = Object.values(computeConsolidatedBalances([session1, session2])).reduce(
      (a, b) => a + b,
      0,
    )
    expect(sum).toBe(0)
  })
})

describe('computeLedgerBalances', () => {
  it('Scenario 3.1: Ledger view applies refunds to consolidated balances', () => {
    const balances = computeLedgerBalances([session1, session2], [refund])

    // Consolidated: Alice +1500, Bob -1500
    // Bob paid Alice $5: Bob's debt reduces (+500), Alice's credit reduces (-500)
    // Result: Alice +1000, Bob -1000
    expect(balances['alice']).toBe(1000)
    expect(balances['bob']).toBe(-1000)
  })

  it('no refunds — ledger equals consolidated', () => {
    const consolidated = computeConsolidatedBalances([session1, session2])
    const ledger = computeLedgerBalances([session1, session2], [])

    expect(ledger['alice']).toBe(consolidated['alice'])
    expect(ledger['bob']).toBe(consolidated['bob'])
  })

  it('refund sum stays zero', () => {
    const balances = computeLedgerBalances([session1, session2], [refund])
    const sum = Object.values(balances).reduce((a, b) => a + b, 0)
    expect(sum).toBe(0)
  })
})
