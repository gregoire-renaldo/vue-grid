import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Playlists from '../views/Playlists.vue';
import PlaylistDetail from '../views/PlaylistDetail.vue'; 

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView},
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    { path: '/playlists', name: 'Playlists', component: Playlists },
    { path: '/playlists/:id', name: 'PlaylistDetail', component: PlaylistDetail, props: true }
  ],
})

export default router
