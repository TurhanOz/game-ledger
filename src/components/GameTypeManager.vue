<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import ConfirmDialog from './ConfirmDialog.vue'

const store = useAppStore()

const newName = ref('')
const editId = ref<string | null>(null)
const editName = ref('')
const errorMessage = ref('')
const deleteTarget = ref<string | null>(null)

function submitAdd() {
  const name = newName.value.trim()
  if (!name) return
  store.addGameType(name)
  newName.value = ''
}

function startEdit(id: string, name: string) {
  editId.value = id
  editName.value = name
}

function submitEdit() {
  if (!editId.value) return
  const name = editName.value.trim()
  if (name) store.updateGameType(editId.value, name)
  editId.value = null
  editName.value = ''
}

function cancelEdit() {
  editId.value = null
  editName.value = ''
}

function requestDelete(id: string) {
  errorMessage.value = ''
  deleteTarget.value = id
}

function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    store.deleteGameType(deleteTarget.value)
  } catch {
    errorMessage.value = 'Cannot delete: game type is linked to an existing session.'
  }
  deleteTarget.value = null
}

function cancelDelete() {
  deleteTarget.value = null
}
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-gray-800 mb-3">Game Types</h2>

    <!-- Add game type form -->
    <form class="flex gap-2 mb-4" @submit.prevent="submitAdd">
      <input
        v-model="newName"
        type="text"
        placeholder="Game type name"
        class="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
      />
      <button
        type="submit"
        class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 min-h-[44px] min-w-[44px]"
      >
        Add
      </button>
    </form>

    <!-- Error message -->
    <p v-if="errorMessage" class="text-sm text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-md">
      {{ errorMessage }}
    </p>

    <!-- Game type list -->
    <ul class="space-y-2">
      <li
        v-for="gt in store.gameTypes"
        :key="gt.id"
        class="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-2"
      >
        <!-- Edit mode -->
        <template v-if="editId === gt.id">
          <input
            v-model="editName"
            type="text"
            class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            @keyup.enter="submitEdit"
            @keyup.escape="cancelEdit"
          />
          <button
            class="text-sm text-indigo-600 hover:underline min-h-[44px] px-2"
            @click="submitEdit"
          >
            Save
          </button>
          <button
            class="text-sm text-gray-500 hover:underline min-h-[44px] px-2"
            @click="cancelEdit"
          >
            Cancel
          </button>
        </template>
        <!-- View mode -->
        <template v-else>
          <span class="flex-1 text-sm text-gray-800">{{ gt.name }}</span>
          <button
            class="text-sm text-indigo-600 hover:underline min-h-[44px] px-2"
            @click="startEdit(gt.id, gt.name)"
          >
            Edit
          </button>
          <button
            class="text-sm text-red-600 hover:underline min-h-[44px] px-2"
            @click="requestDelete(gt.id)"
          >
            Delete
          </button>
        </template>
      </li>
    </ul>

    <p v-if="store.gameTypes.length === 0" class="text-sm text-gray-400 italic mt-2">
      No game types yet. Add one above.
    </p>

    <ConfirmDialog
      :open="deleteTarget !== null"
      message="Delete this game type? This action cannot be undone."
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
