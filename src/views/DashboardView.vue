<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import BalanceTable from '@/components/BalanceTable.vue'
import SettlementList from '@/components/SettlementList.vue'
import SessionCard from '@/components/SessionCard.vue'

const store = useAppStore()
const router = useRouter()

// ── Mobile tab state ──────────────────────────────────────────────────────────
type Tab = 'consolidated' | 'ledger' | 'settlement'
const activeTab = ref<Tab>('consolidated')

// ── New session form ──────────────────────────────────────────────────────────
const showNewSessionForm = ref(false)
const formTitle = ref('')
const formDate = ref(new Date().toISOString().slice(0, 10))
const formGameTypeId = ref('')
const formBuyIn = ref('')
const formParticipantIds = ref<string[]>([])
const formError = ref('')

function openNewSessionForm() {
  formTitle.value = ''
  formDate.value = new Date().toISOString().slice(0, 10)
  formGameTypeId.value = store.gameTypes[0]?.id ?? ''
  formBuyIn.value = ''
  formParticipantIds.value = []
  formError.value = ''
  showNewSessionForm.value = true
}

function cancelNewSession() {
  showNewSessionForm.value = false
}

function toggleParticipant(id: string) {
  const idx = formParticipantIds.value.indexOf(id)
  if (idx >= 0) {
    formParticipantIds.value.splice(idx, 1)
  } else {
    formParticipantIds.value.push(id)
  }
}

function submitNewSession() {
  formError.value = ''
  if (!formTitle.value.trim()) { formError.value = 'Enter a session title.'; return }
  if (!formGameTypeId.value) { formError.value = 'Select a game type.'; return }
  const buyIn = parseFloat(formBuyIn.value)
  if (!formBuyIn.value || isNaN(buyIn) || buyIn <= 0) { formError.value = 'Enter a valid buy-in amount.'; return }
  if (formParticipantIds.value.length < 2) { formError.value = 'Select at least 2 participants.'; return }

  store.createSession({
    title: formTitle.value.trim(),
    date: formDate.value,
    gameTypeId: formGameTypeId.value,
    buyIn,
    participantIds: [...formParticipantIds.value],
  })
  showNewSessionForm.value = false
}

// ── Session actions ───────────────────────────────────────────────────────────
function openSession(id: string) {
  router.push(`/session/${id}`)
}

function deleteSession(id: string) {
  store.deleteSession(id)
}

// ── Sorted sessions (newest first) ───────────────────────────────────────────
const sortedSessions = computed(() =>
  [...store.gameSessions].sort((a, b) => b.date.localeCompare(a.date)),
)

const tabs: { key: Tab; label: string }[] = [
  { key: 'consolidated', label: 'Consolidated' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'settlement', label: 'Settlement' },
]
</script>

<template>
  <div class="p-4 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-800">Dashboard</h1>
      <button
        class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 min-h-[44px]"
        @click="openNewSessionForm"
      >
        + New Session
      </button>
    </div>

    <!-- ── Balances / Settlement panels ─────────────────────────────────────── -->

    <!-- Mobile: tab switcher -->
    <div class="md:hidden mb-6">
      <div class="flex border border-gray-200 rounded-lg overflow-hidden mb-4">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="flex-1 py-2 text-xs font-medium transition-colors min-h-[44px]"
          :class="activeTab === tab.key
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <template v-if="activeTab === 'consolidated'">
          <h2 class="font-semibold text-gray-700 mb-3">Consolidated Balances</h2>
          <BalanceTable :balances="store.consolidatedBalances" :players="store.players" />
        </template>
        <template v-else-if="activeTab === 'ledger'">
          <h2 class="font-semibold text-gray-700 mb-3">Ledger (After Refunds)</h2>
          <BalanceTable :balances="store.ledgerBalances" :players="store.players" />
        </template>
        <template v-else>
          <h2 class="font-semibold text-gray-700 mb-3">Settlement</h2>
          <SettlementList :settlements="store.simplifiedSettlements" :players="store.players" />
        </template>
      </div>
    </div>

    <!-- Desktop: 3-column grid -->
    <div class="hidden md:grid md:grid-cols-3 gap-4 mb-6">
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <h2 class="font-semibold text-gray-700 mb-3">Consolidated Balances</h2>
        <BalanceTable :balances="store.consolidatedBalances" :players="store.players" />
      </div>
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <h2 class="font-semibold text-gray-700 mb-3">Ledger (After Refunds)</h2>
        <BalanceTable :balances="store.ledgerBalances" :players="store.players" />
      </div>
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <h2 class="font-semibold text-gray-700 mb-3">Settlement</h2>
        <SettlementList :settlements="store.simplifiedSettlements" :players="store.players" />
      </div>
    </div>

    <!-- ── Session list ──────────────────────────────────────────────────────── -->
    <h2 class="text-lg font-semibold text-gray-800 mb-3">Sessions</h2>
    <div class="space-y-3">
      <SessionCard
        v-for="session in sortedSessions"
        :key="session.id"
        :session="session"
        :players="store.players"
        :game-types="store.gameTypes"
        @select="openSession(session.id)"
        @delete="deleteSession(session.id)"
      />
      <p v-if="sortedSessions.length === 0" class="text-sm text-gray-400 italic">
        No sessions yet. Create one to get started.
      </p>
    </div>

    <!-- ── New Session Modal ─────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showNewSessionForm" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="cancelNewSession" />
        <div class="relative bg-white rounded-lg shadow-xl p-6 mx-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">New Session</h2>

          <form class="space-y-4" @submit.prevent="submitNewSession">
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                v-model="formTitle"
                type="text"
                placeholder="e.g. Friday night poker"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
            </div>

            <!-- Date + Game Type -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  v-model="formDate"
                  type="date"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Game Type</label>
                <select
                  v-model="formGameTypeId"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] bg-white"
                >
                  <option value="">Select...</option>
                  <option v-for="gt in store.gameTypes" :key="gt.id" :value="gt.id">
                    {{ gt.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Buy-in -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Buy-in Amount ($)</label>
              <input
                v-model="formBuyIn"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
            </div>

            <!-- Participants -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Participants ({{ formParticipantIds.length }} selected)
              </label>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  v-for="player in store.players"
                  :key="player.id"
                  type="button"
                  class="px-3 py-2 text-sm rounded-md border transition-colors min-h-[44px]"
                  :class="formParticipantIds.includes(player.id)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
                  @click="toggleParticipant(player.id)"
                >
                  {{ player.name }}
                </button>
              </div>
              <p v-if="store.players.length === 0" class="text-sm text-gray-400 italic mt-1">
                No players yet — add some in Settings.
              </p>
            </div>

            <!-- Error -->
            <p v-if="formError" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {{ formError }}
            </p>

            <!-- Actions -->
            <div class="flex gap-3 justify-end pt-2">
              <button
                type="button"
                class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md min-h-[44px]"
                @click="cancelNewSession"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 min-h-[44px]"
              >
                Create Session
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
