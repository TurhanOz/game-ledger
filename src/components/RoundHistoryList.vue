<script setup lang="ts">
import { ref } from 'vue'
import type { Round, Player } from '@/domain/types'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  rounds: Round[]
  players: Player[]
}>()

const emit = defineEmits<{ undo: [] }>()

const showConfirm = ref(false)

function getPlayerName(id: string): string {
  return props.players.find((p) => p.id === id)?.name ?? id
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold text-gray-700">Round History ({{ rounds.length }})</h3>
      <button
        v-if="rounds.length > 0"
        class="text-sm text-red-600 hover:underline min-h-[44px] px-2"
        @click="showConfirm = true"
      >
        ↩ Undo Last Round
      </button>
    </div>

    <ol v-if="rounds.length > 0" class="space-y-1 max-h-60 overflow-y-auto">
      <li
        v-for="(round, i) in rounds"
        :key="i"
        class="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded px-3 py-1.5"
      >
        <span class="text-gray-400 w-8 shrink-0">#{{ i + 1 }}</span>
        <span class="text-gray-800 font-medium">{{ getPlayerName(round.winnerId) }}</span>
        <span class="text-gray-400">won</span>
      </li>
    </ol>
    <p v-else class="text-sm text-gray-400 italic">No rounds played yet.</p>

    <ConfirmDialog
      :open="showConfirm"
      message="Undo the last round? This will revert the balance changes from that round."
      @confirm="emit('undo'); showConfirm = false"
      @cancel="showConfirm = false"
    />
  </div>
</template>
