<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import CryptoJS from 'crypto-js'

const router = useRouter()
const userStore = useUserStore()

const loginForm = reactive({
  username: '',
  password: ''
})
const loading = ref(false)
const loginError = ref('')

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    loginError.value = '请输入用户名和密码'
    return
  }
  
  loading.value = true
  loginError.value = ''
  
  try {
    // 对密码进行MD5加密
    const encryptedPassword = CryptoJS.MD5(loginForm.password).toString()
    const success = await userStore.login(loginForm.username, encryptedPassword)
    if (success) {
      router.push('/')
    } else {
      loginError.value = '用户名或密码错误'
    }
  } catch (error) {
    loginError.value = '登录失败，请重试'
    console.error('登录错误:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-content">
      <div class="login-header">
        <img src="/vite.svg" alt="Logo" class="logo" />
        <h1 class="title">边缘设备监控系统</h1>
      </div>
      
      <el-form 
        :model="loginForm" 
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item>
          <h2 class="form-title">登录</h2>
        </el-form-item>
        
        <el-form-item v-if="loginError" class="error-message">
          {{ loginError }}
        </el-form-item>
        
        <el-form-item>
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            prefix-icon="el-icon-user"
            autocomplete="username"
          />
        </el-form-item>
        
        <el-form-item>
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            prefix-icon="el-icon-lock"
            autocomplete="current-password"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            class="login-button"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.login-content {
  width: 360px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  height: 48px;
  margin-bottom: 16px;
}

.title {
  font-size: 22px;
  color: rgba(0, 0, 0, 0.85);
  font-weight: 600;
  margin: 0;
}

.form-title {
  font-size: 18px;
  color: rgba(0, 0, 0, 0.85);
  text-align: center;
  margin-top: 0;
  margin-bottom: 24px;
}

.login-form {
  width: 100%;
}

.login-button {
  width: 100%;
}

.error-message {
  color: #f5222d;
  text-align: center;
  margin-bottom: 16px;
}

.hint-text {
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>