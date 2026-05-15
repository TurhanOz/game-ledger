import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../app'

// ── localStorage mock ────────────────────────────────────────────────────────
function createLocalStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    clear: vi.fn(() => { store = {} }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    _reset: () => { store = {} },
  }
}

let localStorageMock: ReturnType<typeof createLocalStorageMock>

beforeEach(() => {
  localStorageMock = createLocalStorageMock()
  vi.stubGlobal('localStorage', localStorageMock)
  setActivePinia(createPinia())
})

// ── Scenario 1.1: Player Management ─────────────────────────────────────────
describe('Scenario 1.1 — Player Management', () => {
  it('adds a player with a UUID v4 and makes it available in state', () => {
    const store = useAppStore()
    store.addPlayer('Alice')

    expect(store.players).toHaveLength(1)
    expect(store.players[0].name).toBe('Alice')
    expect(store.players[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('deletes an unlinked player successfully', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    const aliceId = store.players[0].id

    store.deletePlayer(aliceId)

    expect(store.players).toHaveLength(0)
  })
})

// ── Scenario 1.2: Prevent Linked Player Deletion ─────────────────────────────
describe('Scenario 1.2 — Prevent linked player deletion', () => {
  it('throws and preserves state when deleting a player linked to a session', () => {
    const store = useAppStore()
    store.addPlayer('Bob')
    store.addGameType('Poker')

    const bobId = store.players[0].id
    const gameTypeId = store.gameTypes[0].id

    store.createSession({
      title: 'Friday Night Poker',
      date: new Date().toISOString(),
      gameTypeId,
      buyIn: 10,
      participantIds: [bobId],
    })

    expect(() => store.deletePlayer(bobId)).toThrow()
    expect(store.players).toHaveLength(1)
    expect(store.players[0].id).toBe(bobId)
  })

  it('throws when deleting a player linked to a refund', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addPlayer('Bob')

    const aliceId = store.players[0].id
    const bobId = store.players[1].id

    store.addRefund({
      emitterId: bobId,
      receptorId: aliceId,
      amount: 5,
      date: new Date().toISOString(),
    })

    expect(() => store.deletePlayer(bobId)).toThrow()
    expect(() => store.deletePlayer(aliceId)).toThrow()
    expect(store.players).toHaveLength(2)
  })
})

// ── Scenario 5.1: localStorage Sync ─────────────────────────────────────────
describe('Scenario 5.1 — localStorage sync', () => {
  it('calls localStorage.setItem when a round is added', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addPlayer('Bob')
    store.addGameType('Poker')

    const aliceId = store.players[0].id
    const bobId = store.players[1].id
    const gameTypeId = store.gameTypes[0].id

    store.createSession({
      title: 'Test Session',
      date: new Date().toISOString(),
      gameTypeId,
      buyIn: 10,
      participantIds: [aliceId, bobId],
    })

    const sessionId = store.gameSessions[0].id
    localStorageMock.setItem.mockClear()

    store.addRound(sessionId, aliceId)

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'game-ledger-state',
      expect.any(String),
    )

    const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1]
    const saved = JSON.parse(lastCall[1] as string)
    expect(saved.gameSessions[0].rounds).toHaveLength(1)
    expect(saved.gameSessions[0].rounds[0].winnerId).toBe(aliceId)
  })

  it('persists the full AppState structure on every mutation', () => {
    const store = useAppStore()
    store.addPlayer('Alice')

    const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1]
    const saved = JSON.parse(lastCall[1] as string)

    expect(saved).toHaveProperty('players')
    expect(saved).toHaveProperty('gameTypes')
    expect(saved).toHaveProperty('gameSessions')
    expect(saved).toHaveProperty('refunds')
    expect(saved.players[0].name).toBe('Alice')
  })
})

// ── Scenario 5.2: State Reset ─────────────────────────────────────────────────
describe('Scenario 5.2 — State Reset (Clean Session)', () => {
  it('clears localStorage and resets all state arrays on resetAll()', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addGameType('Poker')

    store.resetAll()

    expect(localStorageMock.clear).toHaveBeenCalled()
    expect(store.players).toHaveLength(0)
    expect(store.gameTypes).toHaveLength(0)
    expect(store.gameSessions).toHaveLength(0)
    expect(store.refunds).toHaveLength(0)
  })
})

// ── Additional store action coverage ─────────────────────────────────────────
describe('GameType management', () => {
  it('adds a game type with a UUID', () => {
    const store = useAppStore()
    store.addGameType('Chess')

    expect(store.gameTypes).toHaveLength(1)
    expect(store.gameTypes[0].name).toBe('Chess')
    expect(store.gameTypes[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('throws when deleting a game type linked to a session', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addGameType('Chess')

    const aliceId = store.players[0].id
    const gameTypeId = store.gameTypes[0].id

    store.createSession({
      title: 'Chess Night',
      date: new Date().toISOString(),
      gameTypeId,
      buyIn: 5,
      participantIds: [aliceId],
    })

    expect(() => store.deleteGameType(gameTypeId)).toThrow()
    expect(store.gameTypes).toHaveLength(1)
  })

  it('deletes an unlinked game type', () => {
    const store = useAppStore()
    store.addGameType('Chess')
    const id = store.gameTypes[0].id

    store.deleteGameType(id)

    expect(store.gameTypes).toHaveLength(0)
  })
})

describe('Session management', () => {
  it('stores buyIn as integer cents', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addGameType('Poker')

    const aliceId = store.players[0].id
    const gameTypeId = store.gameTypes[0].id

    store.createSession({
      title: 'Test',
      date: new Date().toISOString(),
      gameTypeId,
      buyIn: 0.10,
      participantIds: [aliceId],
    })

    expect(store.gameSessions[0].buyIn).toBe(10)
  })

  it('deletes a session by id', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addGameType('Poker')

    const aliceId = store.players[0].id
    const gameTypeId = store.gameTypes[0].id

    store.createSession({
      title: 'Test',
      date: new Date().toISOString(),
      gameTypeId,
      buyIn: 10,
      participantIds: [aliceId],
    })

    const sessionId = store.gameSessions[0].id
    store.deleteSession(sessionId)

    expect(store.gameSessions).toHaveLength(0)
  })

  it('deletes the last round only', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addPlayer('Bob')
    store.addGameType('Poker')

    const aliceId = store.players[0].id
    const bobId = store.players[1].id
    const gameTypeId = store.gameTypes[0].id

    store.createSession({
      title: 'Test',
      date: new Date().toISOString(),
      gameTypeId,
      buyIn: 10,
      participantIds: [aliceId, bobId],
    })

    const sessionId = store.gameSessions[0].id
    store.addRound(sessionId, aliceId)
    store.addRound(sessionId, bobId)

    expect(store.gameSessions[0].rounds).toHaveLength(2)

    store.deleteLastRound(sessionId)

    expect(store.gameSessions[0].rounds).toHaveLength(1)
    expect(store.gameSessions[0].rounds[0].winnerId).toBe(aliceId)
  })
})

describe('Refund management', () => {
  it('stores refund amount as integer cents', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addPlayer('Bob')

    const aliceId = store.players[0].id
    const bobId = store.players[1].id

    store.addRefund({
      emitterId: bobId,
      receptorId: aliceId,
      amount: 5.50,
      date: new Date().toISOString(),
    })

    expect(store.refunds).toHaveLength(1)
    expect(store.refunds[0].amount).toBe(550)
    expect(store.refunds[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })
})

describe('Computed getters', () => {
  it('consolidatedBalances reflects session outcomes', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addPlayer('Bob')
    store.addGameType('Poker')

    const aliceId = store.players[0].id
    const bobId = store.players[1].id
    const gameTypeId = store.gameTypes[0].id

    store.createSession({
      title: 'Test',
      date: new Date().toISOString(),
      gameTypeId,
      buyIn: 10,
      participantIds: [aliceId, bobId],
    })

    const sessionId = store.gameSessions[0].id
    store.addRound(sessionId, aliceId)

    // Alice wins 1 round in a 2-player game: +1000 cents ($10)
    expect(store.consolidatedBalances[aliceId]).toBe(1000)
    expect(store.consolidatedBalances[bobId]).toBe(-1000)
  })

  it('ledgerBalances applies refunds on top of consolidated balances', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addPlayer('Bob')
    store.addGameType('Poker')

    const aliceId = store.players[0].id
    const bobId = store.players[1].id
    const gameTypeId = store.gameTypes[0].id

    store.createSession({
      title: 'Test',
      date: new Date().toISOString(),
      gameTypeId,
      buyIn: 10,
      participantIds: [aliceId, bobId],
    })

    const sessionId = store.gameSessions[0].id
    store.addRound(sessionId, aliceId)

    // Bob pays Alice $5 (500 cents)
    store.addRefund({
      emitterId: bobId,
      receptorId: aliceId,
      amount: 5,
      date: new Date().toISOString(),
    })

    // Consolidated: Alice +1000, Bob -1000
    // Ledger: Bob paid 500, so Bob -1000 + 500 = -500; Alice +1000 - 500 = +500
    expect(store.ledgerBalances[aliceId]).toBe(500)
    expect(store.ledgerBalances[bobId]).toBe(-500)
  })

  it('simplifiedSettlements produces correct transactions', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addPlayer('Bob')
    store.addGameType('Poker')

    const aliceId = store.players[0].id
    const bobId = store.players[1].id
    const gameTypeId = store.gameTypes[0].id

    store.createSession({
      title: 'Test',
      date: new Date().toISOString(),
      gameTypeId,
      buyIn: 10,
      participantIds: [aliceId, bobId],
    })

    const sessionId = store.gameSessions[0].id
    store.addRound(sessionId, aliceId)

    expect(store.simplifiedSettlements).toHaveLength(1)
    expect(store.simplifiedSettlements[0].debtorId).toBe(bobId)
    expect(store.simplifiedSettlements[0].creditorId).toBe(aliceId)
    expect(store.simplifiedSettlements[0].amount).toBe(1000)
  })
})

describe('Export / Import', () => {
  it('exportData returns valid JSON of the current state', () => {
    const store = useAppStore()
    store.addPlayer('Alice')
    store.addGameType('Poker')

    const json = store.exportData()
    const parsed = JSON.parse(json)

    expect(parsed.players[0].name).toBe('Alice')
    expect(parsed.gameTypes[0].name).toBe('Poker')
  })

  it('importData replaces state with parsed JSON', () => {
    const store = useAppStore()
    store.addPlayer('Alice')

    const snapshot = store.exportData()

    store.resetAll()
    expect(store.players).toHaveLength(0)

    store.importData(snapshot)
    expect(store.players).toHaveLength(1)
    expect(store.players[0].name).toBe('Alice')
  })

  it('importData throws on invalid JSON structure', () => {
    const store = useAppStore()
    const badJson = JSON.stringify({ players: 'not-an-array' })
    expect(() => store.importData(badJson)).toThrow()
  })
})
