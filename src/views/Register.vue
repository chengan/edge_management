<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import CryptoJS from 'crypto-js'

const router = useRouter()

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})
const loading = ref(false)
const registerError = ref('')

const validateForm = () => {
  if (!registerForm.username) {
    registerError.value = '请输入用户名'
    return false
  }
  if (!registerForm.email) {
    registerError.value = '请输入邮箱'
    return false
  }
  if (!registerForm.password) {
    registerError.value = '请输入密码'
    return false
  }
  if (!registerForm.confirmPassword) {
    registerError.value = '请确认密码'
    return false
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    registerError.value = '两次输入的密码不一致'
    return false
  }
  
  // 简单的邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(registerForm.email)) {
    registerError.value = '请输入有效的邮箱地址'
    return false
  }
  
  return true
}

const handleRegister = async () => {
  if (!validateForm()) {
    return
  }
  
  loading.value = true
  registerError.value = ''
  
  try {
    // 对密码进行MD5加密
    const encryptedPassword = CryptoJS.MD5(registerForm.password).toString()
    await api.register({
      username: registerForm.username,
      email: registerForm.email,
      password: encryptedPassword,
      confirmPassword: encryptedPassword
    })
    
    // 注册成功后跳转到登录页
    router.push({ name: 'login' })
  } catch (error) {
    registerError.value = '注册失败，请重试'
    console.error('注册错误:', error)
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="register-container">
    <div class="register-content">
      <div class="register-header">
        <img src="/vite.svg" alt="Logo" class="logo" />
        <h1 class="title">边缘设备监控系统</h1>
      </div>
      
      <el-form 
        :model="registerForm" 
        class="register-form"
        @submit.prevent="handleRegister"
      >
        <el-form-item>
          <h2 class="form-title">注册</h2>
        </el-form-item>
        
        <el-form-item v-if="registerError" class="error-message">
          {{ registerError }}
        </el-form-item>
        
        <el-form-item>
          <el-input
            v-model="registerForm.username"
            placeholder="用户名"
            prefix-icon="el-icon-user"
            autocomplete="username"
          />
        </el-form-item>
        
        <el-form-item>
          <el-input
            v-model="registerForm.email"
            placeholder="邮箱"
            prefix-icon="el-icon-message"
            autocomplete="email"
          />
        </el-form-item>
        
        <el-form-item>
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="密码"
            prefix-icon="el-icon-lock"
            autocomplete="new-password"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="确认密码"
            prefix-icon="el-icon-lock"
            autocomplete="new-password"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            class="register-button"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
        
        <el-form-item>
          <div class="login-link">
            已有账号？<el-link type="primary" @click="goToLogin">立即登录</el-link>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.register-content {
  width: 360px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 40px;
}

.register-header {
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

.register-form {
  width: 100%;
}

.register-button {
  width: 100%;
}

.error-message {
  color: #f5222d;
  text-align: center;
  margin-bottom: 16px;
}

.login-link {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
}
</style>
