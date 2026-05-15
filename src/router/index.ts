import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import SessionView from '../views/SessionView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHashHistory('/game-ledger/'),
  routes: [
    { path: '/', component: DashboardView },
    { path: '/session/:id', component: SessionView },
    { path: '/settings', component: SettingsView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
