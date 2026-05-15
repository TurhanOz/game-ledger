<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import ConfirmDialog from './ConfirmDialog.vue'

const store = useAppStore()

const showResetConfirm = ref(false)
const showImportConfirm = ref(false)
const pendingImportJson = ref<string | null>(null)
const importError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function handleExport() {
  const json = store.exportData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ledger_data.json'
  a.click()
  URL.revokeObjectURL(url)
}

function handleImportFileChange(event: Event) {
  importError.value = ''
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    pendingImportJson.value = text
    showImportConfirm.value = true
  }
  reader.readAsText(file)
  if (fileInput.value) fileInput.value.value = ''
}

function confirmImport() {
  if (!pendingImportJson.value) return
  try {
    store.importData(pendingImportJson.value)
  } catch (err) {
    importError.value = err instanceof Error ? err.message : 'Invalid file format.'
  }
  pendingImportJson.value = null
  showImportConfirm.value = false
}

function cancelImport() {
  pendingImportJson.value = null
  showImportConfirm.value = false
}

function confirmReset() {
  store.resetAll()
  showResetConfirm.value = false
}
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-gray-800 mb-3">Data Management</h2>

    <div class="flex flex-wrap gap-3">
      <button
        class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 min-h-[44px]"
        @click="handleExport"
      >
        Export JSON
      </button>

      <label class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 min-h-[44px] flex items-center cursor-pointer">
        Import JSON
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="handleImportFileChange"
        />
      </label>

      <button
        class="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 min-h-[44px]"
        @click="showResetConfirm = true"
      >
        Reset All Data
      </button>
    </div>

    <p v-if="importError" class="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
      Import failed: {{ importError }}
    </p>

    <ConfirmDialog
      :open="showImportConfirm"
      message="Import this file? This will completely replace all current data."
      @confirm="confirmImport"
      @cancel="cancelImport"
    />

    <ConfirmDialog
      :open="showResetConfirm"
      message="Reset all data? This will permanently delete all players, sessions, and refunds from local storage."
      @confirm="confirmReset"
      @cancel="showResetConfirm = false"
    />
  </div>
</template>
