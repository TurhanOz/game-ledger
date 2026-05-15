<script setup lang="ts">
import { computed } from 'vue'
import BalanceBadge from './BalanceBadge.vue'
import type { Player } from '@/domain/types'

const props = defineProps<{
  balances: Record<string, number>
  players: Player[]
}>()

const rows = computed(() =>
  Object.entries(props.balances)
    .map(([id, amount]) => ({
      id,
      name: props.players.find((p) => p.id === id)?.name ?? id,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount),
)
</script>

<template>
  <div v-if="rows.length > 0" class="overflow-x-auto">
    <table class="min-w-full text-sm">
      <thead>
        <tr class="border-b border-gray-200">
          <th class="text-left py-2 pr-4 font-medium text-gray-600">Player</th>
          <th class="text-right py-2 font-medium text-gray-600">Balance</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.id"
          class="border-b border-gray-100 last:border-0"
          :class="row.amount >= 0 ? 'bg-green-50' : 'bg-red-50'"
        >
          <td class="py-2 pr-4 text-gray-800">{{ row.name }}</td>
          <td class="py-2 text-right">
            <BalanceBadge :amount="row.amount" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <p v-else class="text-sm text-gray-400 italic">No data yet.</p>
</template>
