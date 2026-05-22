import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Playlists from '../views/Playlists.vue'
import PlaylistDetail from '../views/PlaylistDetail.vue'
import Explore from '../views/Explore.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/callback', name: 'Callback', component: HomeView },
    { path: '/playlists', name: 'Playlists', component: Playlists },
    { path: '/explore', name: 'Explore', component: Explore },
    { path: '/explor', redirect: '/explore' },
    {
      path: '/playlists/:id',
      name: 'PlaylistDetail',
      component: PlaylistDetail,
      props: true,
    },
  ],
})

export default router
