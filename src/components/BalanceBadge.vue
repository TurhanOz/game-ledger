<script setup lang="ts">
const props = defineProps<{ amount: number }>()

function formatAmount(cents: number): string {
  const abs = Math.abs(cents) / 100
  const sign = cents >= 0 ? '+' : '-'
  return `${sign}$${abs.toFixed(2)}`
}
</script>

<template>
  <span :class="props.amount >= 0 ? 'text-green-600' : 'text-red-600'" class="font-semibold tabular-nums">
    {{ formatAmount(props.amount) }}
  </span>
</template>
