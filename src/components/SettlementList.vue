<script setup lang="ts">
import type { Settlement, Player } from '@/domain/types'

const props = defineProps<{
  settlements: Settlement[]
  players: Player[]
}>()

function getPlayerName(id: string): string {
  return props.players.find((p) => p.id === id)?.name ?? id
}

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
</script>

<template>
  <div>
    <ul v-if="settlements.length > 0" class="space-y-2">
      <li
        v-for="(s, i) in settlements"
        :key="i"
        class="flex items-center gap-2 text-sm bg-gray-50 rounded-md px-3 py-2"
      >
        <span class="font-medium text-red-600">{{ getPlayerName(s.debtorId) }}</span>
        <span class="text-gray-500">must pay</span>
        <span class="font-medium text-green-600">{{ getPlayerName(s.creditorId) }}</span>
        <span class="ml-auto font-semibold tabular-nums text-gray-800">{{ formatAmount(s.amount) }}</span>
      </li>
    </ul>
    <p v-else class="text-sm text-gray-400 italic">All settled up!</p>
  </div>
</template>
