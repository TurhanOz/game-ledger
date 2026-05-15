import { describe, it, expect } from 'vitest'
import { simplifyDebts } from '../settlement'
import type { Settlement } from '../types'

describe('simplifyDebts', () => {
  it('Scenario 4.1: Linear chain A→B→C collapses to one transaction', () => {
    // Alice owes Bob $10, Bob owes Charlie $10
    // Net ledger balances: Alice -1000, Bob 0, Charlie +1000
    const ledgerBalances = { alice: -1000, bob: 0, charlie: 1000 }

    const settlements = simplifyDebts(ledgerBalances)

    expect(settlements).toHaveLength(1)
    expect(settlements[0]).toMatchObject<Settlement>({
      debtorId: 'alice',
      creditorId: 'charlie',
      amount: 1000,
    })

    // Bob must NOT appear in any settlement
    const ids = settlements.flatMap((s) => [s.debtorId, s.creditorId])
    expect(ids).not.toContain('bob')
  })

  it('Scenario 4.2: Multi-debtor settlement generates two transactions', () => {
    // Alice +5000, Bob -3000, Charlie -2000 (in cents)
    const ledgerBalances = { alice: 5000, bob: -3000, charlie: -2000 }

    const settlements = simplifyDebts(ledgerBalances)

    expect(settlements).toHaveLength(2)
    expect(settlements).toEqual(
      expect.arrayContaining<Settlement>([
        { debtorId: 'bob', creditorId: 'alice', amount: 3000 },
        { debtorId: 'charlie', creditorId: 'alice', amount: 2000 },
      ]),
    )
  })

  it('all-zero balances returns empty array', () => {
    const settlements = simplifyDebts({ alice: 0, bob: 0 })
    expect(settlements).toHaveLength(0)
  })

  it('empty balances returns empty array', () => {
    expect(simplifyDebts({})).toHaveLength(0)
  })

  it('settlement amounts are always positive', () => {
    const settlements = simplifyDebts({ alice: 3000, bob: -1500, charlie: -1500 })
    settlements.forEach((s) => expect(s.amount).toBeGreaterThan(0))
  })

  it('total amounts balance out (creditor side equals debtor side)', () => {
    const balances = { alice: 6000, bob: -2000, charlie: -3000, dave: -1000 }
    const settlements = simplifyDebts(balances)
    const totalDebtor = settlements.reduce((sum, s) => sum + s.amount, 0)
    expect(totalDebtor).toBe(6000)
  })
})
