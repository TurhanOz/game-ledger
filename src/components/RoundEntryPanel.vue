<script setup lang="ts">
import type { Player } from '@/domain/types'

const props = defineProps<{ participants: Player[] }>()
const emit = defineEmits<{ 'winner-selected': [playerId: string] }>()
</script>

<template>
  <div>
    <h3 class="font-semibold text-gray-700 mb-3">Who won this round?</h3>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <button
        v-for="player in props.participants"
        :key="player.id"
        class="min-h-[44px] min-w-[44px] px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors text-sm"
        @click="emit('winner-selected', player.id)"
      >
        {{ player.name }}
      </button>
    </div>
    <p v-if="props.participants.length === 0" class="text-sm text-gray-400 italic">
      No participants in this session.
    </p>
  </div>
</template>
