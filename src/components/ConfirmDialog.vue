<script setup lang="ts">
defineProps<{ open: boolean; message: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="emit('cancel')" />
      <div class="relative bg-white rounded-lg shadow-xl p-6 mx-4 max-w-sm w-full">
        <p class="text-gray-800 mb-6">{{ message }}</p>
        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md min-h-[44px]"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-md min-h-[44px]"
            @click="emit('confirm')"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
