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
}

export interface GameSession {
  id: string
  title: string
  date: string         // ISO string
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
