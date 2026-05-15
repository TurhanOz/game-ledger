<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import PlayerManager from '@/components/PlayerManager.vue'
import GameTypeManager from '@/components/GameTypeManager.vue'
import ImportExportPanel from '@/components/ImportExportPanel.vue'
import RefundForm from '@/components/RefundForm.vue'

const store = useAppStore()

function getPlayerName(id: string): string {
  return store.players.find((p) => p.id === id)?.name ?? id
}

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const sortedRefunds = computed(() =>
  [...store.refunds].sort((a, b) => b.date.localeCompare(a.date)),
)

function handleRefundSubmit(payload: { emitterId: string; receptorId: string; amount: number; date: string }) {
  store.addRefund(payload)
}
</script>

<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

    <!-- Players + Game Types: 2-col on desktop, stacked on mobile -->
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <PlayerManager />
      </div>
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <GameTypeManager />
      </div>
    </div>

    <!-- Refund form + list -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <RefundForm :players="store.players" @submit="handleRefundSubmit" />
    </div>

    <div v-if="sortedRefunds.length > 0" class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Recorded Refunds</h2>
      <ul class="space-y-2">
        <li
          v-for="refund in sortedRefunds"
          :key="refund.id"
          class="flex items-center gap-2 text-sm bg-gray-50 rounded-md px-3 py-2"
        >
          <span class="font-medium text-red-600">{{ getPlayerName(refund.emitterId) }}</span>
          <span class="text-gray-500">paid</span>
          <span class="font-medium text-green-600">{{ getPlayerName(refund.receptorId) }}</span>
          <span class="ml-auto tabular-nums font-semibold text-gray-800">{{ formatAmount(refund.amount) }}</span>
          <span class="text-gray-400 text-xs">{{ formatDate(refund.date) }}</span>
        </li>
      </ul>
    </div>

    <!-- Import / Export / Reset -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <ImportExportPanel />
    </div>
  </div>
</template>
