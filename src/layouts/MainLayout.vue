<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isCollapsed = ref(false)
const user = computed(() => userStore.user)

const menuItems = [
  { route: 'dashboard', icon: 'el-icon-monitor', title: '仪表盘' },
  { route: 'devices', icon: 'el-icon-cpu', title: '设备管理' },
  { route: 'topology', icon: 'el-icon-connection', title: '网络拓扑' },
  { route: 'resources', icon: 'el-icon-data-line', title: '资源优化' },
  { route: 'alerts', icon: 'el-icon-warning', title: '告警中心' }
]

const logout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout-container">
    <el-container class="h-full">
      <!-- 侧边栏 -->
      <el-aside width="auto" class="sidebar">
        <div class="sidebar-header">
          <img src="/vite.svg" alt="Logo" class="logo" v-if="!isCollapsed" />
          <img src="/vite.svg" alt="Logo" class="logo-small" v-else />
        </div>
        
        <el-menu
          :collapse="isCollapsed"
          :default-active="route.path"
          class="sidebar-menu"
          background-color="#001529"
          text-color="#fff"
          active-text-color="#1890ff"
          router
        >
          <el-menu-item 
            v-for="item in menuItems" 
            :key="item.route" 
            :index="`/${item.route === 'dashboard' ? '' : item.route}`"
            :route="`/${item.route === 'dashboard' ? '' : item.route}`"
          >
            <el-icon>
              <i :class="item.icon"></i>
            </el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </el-menu>
        
        <div class="sidebar-footer">
          <el-button 
            type="text" 
            class="toggle-sidebar-btn"
            @click="isCollapsed = !isCollapsed"
          >
            <el-icon>
              <i :class="isCollapsed ? 'el-icon-d-arrow-right' : 'el-icon-d-arrow-left'"></i>
            </el-icon>
          </el-button>
        </div>
      </el-aside>
      
      <el-container>
        <!-- 顶部栏 -->
        <el-header class="main-header">
          <div class="header-left">
            <h1 class="page-title">{{ route.meta.title }}</h1>
          </div>
          
          <div class="header-right">
            <el-dropdown trigger="click">
              <div class="user-profile">
                <el-avatar :src="user?.avatar" :size="32"></el-avatar>
                <span class="username">{{ user?.name }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="router.push('/user')">
                    <i class="el-icon-user"></i> 个人信息
                  </el-dropdown-item>
                  <el-dropdown-item @click="logout">
                    <i class="el-icon-switch-button"></i> 退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        
        <!-- 主要内容 -->
        <el-main>
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style scoped>
.layout-container {
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  background-color: #001529;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  height: 100%;
}

.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  height: 32px;
}

.logo-small {
  height: 24px;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
}

.sidebar-footer {
  padding: 12px;
  display: flex;
  justify-content: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.toggle-sidebar-btn {
  color: rgba(255, 255, 255, 0.65);
}

.toggle-sidebar-btn:hover {
  color: white;
}

.main-header {
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: rgba(0, 0, 0, 0.85);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-profile {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.username {
  margin-left: 8px;
  color: rgba(0, 0, 0, 0.65);
}

.el-main {
  background-color: #f0f2f5;
  padding: 24px;
  height: calc(100vh - 64px);
  overflow-y: auto;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>