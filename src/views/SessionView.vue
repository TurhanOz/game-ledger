<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { computeSessionBalances } from '@/domain/calculations'
import BalanceTable from '@/components/BalanceTable.vue'
import RoundEntryPanel from '@/components/RoundEntryPanel.vue'
import RoundHistoryList from '@/components/RoundHistoryList.vue'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const sessionId = route.params.id as string

const session = computed(() => store.gameSessions.find((s) => s.id === sessionId))

// Redirect to dashboard if session not found
if (!session.value) {
  router.replace('/')
}

const participants = computed(() =>
  (session.value?.participantIds ?? [])
    .map((id) => store.players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined),
)

const sessionBalances = computed(() =>
  session.value ? computeSessionBalances(session.value) : {},
)

const gameTypeName = computed(() => {
  if (!session.value) return ''
  return store.gameTypes.find((g) => g.id === session.value!.gameTypeId)?.name ?? session.value.gameTypeId
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatBuyIn(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function handleWinnerSelected(playerId: string) {
  store.addRound(sessionId, playerId)
}

function handleUndo() {
  store.deleteLastRound(sessionId)
}
</script>

<template>
  <div class="p-4 max-w-2xl mx-auto">
    <button
      class="mb-4 text-indigo-600 hover:underline text-sm min-h-[44px] flex items-center gap-1"
      @click="router.push('/')"
    >
      ← Back to Dashboard
    </button>

    <template v-if="session">
      <!-- Session header -->
      <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h1 class="text-xl font-bold text-gray-800">{{ session.title }}</h1>
        <p class="text-sm text-gray-500 mt-1">
          {{ gameTypeName }} · {{ formatDate(session.date) }} · Buy-in {{ formatBuyIn(session.buyIn) }}
        </p>
        <p class="text-sm text-gray-500">
          {{ participants.map(p => p.name).join(', ') }}
        </p>
      </div>

      <!-- Session balances -->
      <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h2 class="font-semibold text-gray-700 mb-3">Session Balances</h2>
        <BalanceTable :balances="sessionBalances" :players="store.players" />
      </div>

      <!-- Round entry -->
      <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <RoundEntryPanel :participants="participants" @winner-selected="handleWinnerSelected" />
      </div>

      <!-- Round history -->
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <RoundHistoryList
          :rounds="session.rounds"
          :players="store.players"
          @undo="handleUndo"
        />
      </div>
    </template>

    <div v-else class="text-gray-500 text-sm">Session not found. Redirecting…</div>
  </div>
</template>
