<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <main class="flex-1 pb-16">
      <RouterView />
    </main>

    <!-- Bottom navigation bar -->
    <nav class="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-50">
      <RouterLink
        to="/"
        class="flex flex-col items-center gap-1 text-xs text-gray-600 hover:text-indigo-600 active:text-indigo-700 min-w-[44px] min-h-[44px] justify-center"
        active-class="text-indigo-600 font-semibold"
      >
        <span class="text-lg">🎮</span>
        <span>Dashboard</span>
      </RouterLink>
      <RouterLink
        to="/settings"
        class="flex flex-col items-center gap-1 text-xs text-gray-600 hover:text-indigo-600 active:text-indigo-700 min-w-[44px] min-h-[44px] justify-center"
        active-class="text-indigo-600 font-semibold"
      >
        <span class="text-lg">⚙️</span>
        <span>Settings</span>
      </RouterLink>
    </nav>
  </div>
</template>
