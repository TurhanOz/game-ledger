export interface Player {
  id: string
  name: string
}

export interface GameType {
  id: string
  name: string
}

export interface Round {
  winnerId: string
  timestamp: string
}

export interface GameSession {
  id: string
  date: string         // ISO date string (user-selected, day precision)
  createdAt: string    // ISO timestamp set at creation — primary sort/locking key
  gameTypeId: string
  buyIn: number        // stored as integer cents
  participantIds: string[]
  rounds: Round[]
}

export interface Refund {
  id: string
  emitterId: string    // who paid
  receptorId: string   // who received
  amount: number       // integer cents
  date: string
}

export interface AppState {
  players: Player[]
  gameTypes: GameType[]
  gameSessions: GameSession[]
  refunds: Refund[]
}

export interface Settlement {
  debtorId: string
  creditorId: string
  amount: number       // integer cents
}
