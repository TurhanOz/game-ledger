import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Player, GameType, GameSession, Refund, Settlement } from '@/domain/types'
import { computeConsolidatedBalances } from '@/domain/ledger'
import { computeLedgerBalances } from '@/domain/ledger'
import { simplifyDebts } from '@/domain/settlement'
import { canDeletePlayer, canDeleteGameType, parseAndValidateAppState } from '@/domain/validation'

const STORAGE_KEY = 'game-ledger-state'

export const useAppStore = defineStore('app', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const players = ref<Player[]>([])
  const gameTypes = ref<GameType[]>([])
  const gameSessions = ref<GameSession[]>([])
  const refunds = ref<Refund[]>([])

  // ── Hydrate from localStorage ──────────────────────────────────────────────
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = parseAndValidateAppState(JSON.parse(saved))
      players.value = parsed.players
      gameTypes.value = parsed.gameTypes
      gameSessions.value = parsed.gameSessions
      refunds.value = parsed.refunds
    } catch {
      // Corrupt state — start fresh
    }
  }

  // ── Persist on every mutation ──────────────────────────────────────────────
  watch(
    () => ({
      players: players.value,
      gameTypes: gameTypes.value,
      gameSessions: gameSessions.value,
      refunds: refunds.value,
    }),
    (state) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    },
    { deep: true, flush: 'sync' },
  )

  // ── Getters ────────────────────────────────────────────────────────────────
  const consolidatedBalances = computed<Record<string, number>>(() =>
    computeConsolidatedBalances(gameSessions.value),
  )

  const ledgerBalances = computed<Record<string, number>>(() =>
    computeLedgerBalances(gameSessions.value, refunds.value),
  )

  const simplifiedSettlements = computed<Settlement[]>(() =>
    simplifyDebts(ledgerBalances.value),
  )

  // ── Player Actions ─────────────────────────────────────────────────────────
  function addPlayer(name: string): void {
    players.value.push({ id: crypto.randomUUID(), name })
  }

  function updatePlayer(id: string, name: string): void {
    const player = players.value.find((p) => p.id === id)
    if (player) player.name = name
  }

  function deletePlayer(id: string): void {
    if (!canDeletePlayer(id, gameSessions.value, refunds.value)) {
      throw new Error(`Cannot delete player "${id}": still referenced by a session or refund.`)
    }
    players.value = players.value.filter((p) => p.id !== id)
  }

  // ── GameType Actions ───────────────────────────────────────────────────────
  function addGameType(name: string): void {
    gameTypes.value.push({ id: crypto.randomUUID(), name })
  }

  function updateGameType(id: string, name: string): void {
    const gt = gameTypes.value.find((g) => g.id === id)
    if (gt) gt.name = name
  }

  function deleteGameType(id: string): void {
    if (!canDeleteGameType(id, gameSessions.value)) {
      throw new Error(`Cannot delete game type "${id}": still referenced by a session.`)
    }
    gameTypes.value = gameTypes.value.filter((g) => g.id !== id)
  }

  // ── Session Actions ────────────────────────────────────────────────────────
  interface CreateSessionPayload {
    date: string
    gameTypeId: string
    buyIn: number      // dollars — stored as integer cents
    participantIds: string[]
  }

  function createSession(payload: CreateSessionPayload): void {
    gameSessions.value.push({
      id: crypto.randomUUID(),
      date: payload.date,
      createdAt: new Date().toISOString(),
      gameTypeId: payload.gameTypeId,
      buyIn: Math.round(payload.buyIn * 100),
      participantIds: payload.participantIds,
      rounds: [],
    })
  }

  // ── Locking ────────────────────────────────────────────────────────────────
  // Sort key: "date\x00createdAt" — date is primary, createdAt breaks same-day ties.
  // When both are equal (e.g. rapid test creation), the session added LAST to the
  // array wins (reduce with >= naturally selects the last element on equality).
  function sessionSortKey(s: GameSession): string {
    return s.date + '\x00' + (s.createdAt ?? '')
  }

  const latestSessionId = computed(() => {
    if (gameSessions.value.length === 0) return null
    const winner = gameSessions.value.reduce((best, curr) =>
      sessionSortKey(curr) >= sessionSortKey(best) ? curr : best
    )
    return winner.id
  })

  function canMutateSession(id: string): boolean {
    return id === latestSessionId.value
  }

  function deleteSession(id: string): void {
    if (!canMutateSession(id)) {
      throw new Error(`Cannot delete session "${id}": session is locked.`)
    }
    gameSessions.value = gameSessions.value.filter((s) => s.id !== id)
  }

  // ── Round Actions ──────────────────────────────────────────────────────────
  function addRound(sessionId: string, winnerId: string): void {
    if (!canMutateSession(sessionId)) return
    const session = gameSessions.value.find((s) => s.id === sessionId)
    if (session) session.rounds.push({ winnerId, timestamp: new Date().toISOString() })
  }

  function deleteLastRound(sessionId: string): void {
    if (!canMutateSession(sessionId)) return
    const session = gameSessions.value.find((s) => s.id === sessionId)
    if (session && session.rounds.length > 0) {
      session.rounds.pop()
    }
  }

  // ── Refund Actions ─────────────────────────────────────────────────────────
  interface AddRefundPayload {
    emitterId: string
    receptorId: string
    amount: number     // dollars — stored as integer cents
    date: string
  }

  function addRefund(payload: AddRefundPayload): void {
    refunds.value.push({
      id: crypto.randomUUID(),
      emitterId: payload.emitterId,
      receptorId: payload.receptorId,
      amount: Math.round(payload.amount * 100),
      date: payload.date,
    })
  }

  // ── Data Management ────────────────────────────────────────────────────────
  function resetAll(): void {
    players.value = []
    gameTypes.value = []
    gameSessions.value = []
    refunds.value = []
    localStorage.clear()
  }

  function exportData(): string {
    return JSON.stringify({
      players: players.value,
      gameTypes: gameTypes.value,
      gameSessions: gameSessions.value,
      refunds: refunds.value,
    })
  }

  function importData(json: string): void {
    const parsed = parseAndValidateAppState(JSON.parse(json))
    players.value = parsed.players
    gameTypes.value = parsed.gameTypes
    gameSessions.value = parsed.gameSessions
    refunds.value = parsed.refunds
  }

  return {
    // State
    players,
    gameTypes,
    gameSessions,
    refunds,
    // Getters
    consolidatedBalances,
    ledgerBalances,
    simplifiedSettlements,
    // Player actions
    addPlayer,
    updatePlayer,
    deletePlayer,
    // GameType actions
    addGameType,
    updateGameType,
    deleteGameType,
    // Session actions
    createSession,
    deleteSession,
    latestSessionId,
    canMutateSession,
    // Round actions
    addRound,
    deleteLastRound,
    // Refund actions
    addRefund,
    // Data management
    resetAll,
    exportData,
    importData,
  }
})
