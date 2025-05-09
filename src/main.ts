import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import router from './router'

// 开发调试信息
if (import.meta.env.VITE_APP_DEBUG === 'true') {
  console.log('环境信息:', {
    环境: import.meta.env.VITE_APP_ENV,
    API地址: import.meta.env.VITE_API_BASE_URL,
    是否启用Mock: import.meta.env.VITE_ENABLE_MOCK,
    所有环境变量: import.meta.env
  })
}

async function setupApp() {
  // 先初始化Mock
  if (import.meta.env.VITE_ENABLE_MOCK === 'true') {
    console.log('正在加载Mock...')
    try {
      await import('./mock')
      console.log('Mock加载完成')
    } catch (err) {
      console.error('Mock加载失败:', err)
    }
  }

  // 然后创建应用
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.use(ElementPlus)
  app.mount('#app')
}

setupApp()