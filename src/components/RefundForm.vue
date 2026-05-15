<script setup lang="ts">
import { ref } from 'vue'
import type { Player } from '@/domain/types'

const props = defineProps<{ players: Player[] }>()

interface RefundPayload {
  emitterId: string
  receptorId: string
  amount: number
  date: string
}

const emit = defineEmits<{ submit: [payload: RefundPayload] }>()

const emitterId = ref('')
const receptorId = ref('')
const amount = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const errorMessage = ref('')

function handleSubmit() {
  errorMessage.value = ''

  if (!emitterId.value) { errorMessage.value = 'Select who paid.'; return }
  if (!receptorId.value) { errorMessage.value = 'Select who received.'; return }
  if (emitterId.value === receptorId.value) { errorMessage.value = 'Payer and receiver must be different.'; return }

  const parsed = parseFloat(amount.value)
  if (!amount.value || isNaN(parsed) || parsed <= 0) { errorMessage.value = 'Enter a valid positive amount.'; return }

  emit('submit', {
    emitterId: emitterId.value,
    receptorId: receptorId.value,
    amount: parsed,
    date: date.value,
  })

  emitterId.value = ''
  receptorId.value = ''
  amount.value = ''
  date.value = new Date().toISOString().slice(0, 10)
}
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-gray-800 mb-3">Record Refund</h2>

    <form class="space-y-3" @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">From (paid)</label>
          <select
            v-model="emitterId"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] bg-white"
          >
            <option value="">Select player...</option>
            <option v-for="p in props.players" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">To (received)</label>
          <select
            v-model="receptorId"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] bg-white"
          >
            <option value="">Select player...</option>
            <option v-for="p in props.players" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
          <input
            v-model="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            v-model="date"
            type="date"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          />
        </div>
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        class="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 min-h-[44px]"
      >
        Record Refund
      </button>
    </form>
  </div>
</template>
