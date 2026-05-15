<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="p-4">
    <button
      class="mb-4 text-indigo-600 hover:underline text-sm"
      @click="goBack"
    >
      ← Back to Dashboard
    </button>
    <h1 class="text-2xl font-bold text-gray-800">Session</h1>
    <p class="mt-2 text-gray-500">Session ID: {{ route.params.id }}</p>
    <p class="mt-1 text-gray-500">Round entry and history will appear here.</p>
  </div>
</template>
