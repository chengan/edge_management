import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '仪表盘', requiresAuth: true }
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('../views/Devices.vue'),
        meta: { title: '设备管理', requiresAuth: true }
      },
      {
        path: 'devices/:id',
        name: 'device-detail',
        component: () => import('../views/DeviceDetail.vue'),
        meta: { title: '设备详情', requiresAuth: true }
      },
      {
        path: 'topology',
        name: 'topology',
        component: () => import('../views/Topology.vue'),
        meta: { title: '网络拓扑', requiresAuth: true }
      },
      {
        path: 'resources',
        name: 'resources',
        component: () => import('../views/Resources.vue'),
        meta: { title: '资源优化', requiresAuth: true }
      },
      {
        path: 'alerts',
        name: 'alerts',
        component: () => import('../views/Alerts.vue'),
        meta: { title: '告警中心', requiresAuth: true }
      },
      {
        path: 'user',
        name: 'user',
        component: () => import('../views/UserProfile.vue'),
        meta: { title: '个人信息', requiresAuth: true }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 导航守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.name === 'login' && userStore.isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router