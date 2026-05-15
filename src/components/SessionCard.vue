<script setup lang="ts">
import { ref } from 'vue'
import type { GameSession, Player, GameType } from '@/domain/types'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  session: GameSession
  players: Player[]
  gameTypes: GameType[]
}>()

const emit = defineEmits<{ select: []; delete: [] }>()

const showConfirm = ref(false)

function getPlayerName(id: string): string {
  return props.players.find((p) => p.id === id)?.name ?? id
}

function getGameTypeName(id: string): string {
  return props.gameTypes.find((g) => g.id === id)?.name ?? id
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatBuyIn(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="font-semibold text-gray-800 truncate">{{ session.title }}</h3>
        <p class="text-xs text-gray-500 mt-0.5">
          {{ getGameTypeName(session.gameTypeId) }} · {{ formatDate(session.date) }}
        </p>
        <p class="text-xs text-gray-500">
          Buy-in: {{ formatBuyIn(session.buyIn) }} · {{ session.participantIds.length }} players · {{ session.rounds.length }} rounds
        </p>
        <p class="text-xs text-gray-400 mt-1 truncate">
          {{ session.participantIds.map(getPlayerName).join(', ') }}
        </p>
      </div>
      <div class="flex flex-col gap-1 shrink-0">
        <button
          class="text-sm text-indigo-600 hover:underline min-h-[44px] px-2"
          @click="emit('select')"
        >
          Open
        </button>
        <button
          class="text-sm text-red-600 hover:underline min-h-[44px] px-2"
          @click="showConfirm = true"
        >
          Delete
        </button>
      </div>
    </div>

    <ConfirmDialog
      :open="showConfirm"
      :message="`Delete session &quot;${session.title}&quot;? All rounds will be lost.`"
      @confirm="emit('delete'); showConfirm = false"
      @cancel="showConfirm = false"
    />
  </div>
</template>
