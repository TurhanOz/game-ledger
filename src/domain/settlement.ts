import type { Settlement } from './types'

/**
 * Min-Max Cash Flow debt simplification algorithm.
 * Produces the minimum number of transactions needed to settle all debts.
 * Input balances are in integer cents (positive = creditor, negative = debtor).
 * Returns Settlement[] with amounts in integer cents.
 */
export function simplifyDebts(ledgerBalances: Record<string, number>): Settlement[] {
  const creditors: Array<{ id: string; amount: number }> = []
  const debtors: Array<{ id: string; amount: number }> = []

  for (const [id, balance] of Object.entries(ledgerBalances)) {
    if (balance > 0) {
      creditors.push({ id, amount: balance })
    } else if (balance < 0) {
      debtors.push({ id, amount: -balance })
    }
    // Zero balances are ignored
  }

  // Sort descending so largest amounts are processed first
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const settlements: Settlement[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]

    const amount = Math.min(creditor.amount, debtor.amount)
    settlements.push({ debtorId: debtor.id, creditorId: creditor.id, amount })

    creditor.amount -= amount
    debtor.amount -= amount

    if (creditor.amount === 0) ci++
    if (debtor.amount === 0) di++
  }

  return settlements
}
