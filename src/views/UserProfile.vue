<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import api from '../api'
import { ElMessage } from 'element-plus'
import { User, Message, Lock, Calendar } from '@element-plus/icons-vue'
import type { UserProfile } from '../types/api'
import CryptoJS from 'crypto-js'

const userStore = useUserStore()
const loading = ref(true)
const saving = ref(false)
const changePasswordDialogVisible = ref(false)
const changingPassword = ref(false)

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const userForm = ref<UserProfile>({
  id: '',
  username: '',
  email: '',
  role: ''
})

// 密码复杂度校验规则
const passwordRules = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true
}

const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < passwordRules.minLength) {
    return { valid: false, message: `密码长度至少需要${passwordRules.minLength}个字符` }
  }
  
  if (passwordRules.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, message: '密码需要包含大写字母' }
  }
  
  if (passwordRules.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, message: '密码需要包含小写字母' }
  }
  
  if (passwordRules.requireNumbers && !/[0-9]/.test(password)) {
    return { valid: false, message: '密码需要包含数字' }
  }
  
  if (passwordRules.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: '密码需要包含特殊字符' }
  }
  
  return { valid: true, message: '' }
}

const fetchUserProfile = async () => {
  try {
    loading.value = true
    const response = await api.getUserProfile()
    userForm.value = response
  } catch (error) {
    console.error('获取用户信息失败:', error)
    ElMessage.error('加载用户信息失败')
  } finally {
    loading.value = false
  }
}

const updateProfile = async () => {
  try {
    saving.value = true
    // 创建更新对象，只包含可以更新的字段
    const updateData = {
      email: userForm.value.email,
      username: userForm.value.username
    }
    await api.updateUserProfile(updateData)
    ElMessage.success('个人信息更新成功')
    // 更新store中的用户信息
    const newUserData = {
      ...userStore.user,
      ...updateData
    }
    userStore.user.value = newUserData
    localStorage.setItem('user', JSON.stringify(newUserData))
  } catch (error) {
    console.error('更新个人信息失败:', error)
    ElMessage.error('更新个人信息失败')
  } finally {
    saving.value = false
  }
}

const handleChangePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.error('两次输入的新密码不一致')
    return
  }

  // 验证新密码复杂度
  const validation = validatePassword(passwordForm.value.newPassword)
  if (!validation.valid) {
    ElMessage.error(validation.message)
    return
  }

  try {
    changingPassword.value = true
    // 对新旧密码进行MD5加密
    const encryptedOldPassword = CryptoJS.MD5(passwordForm.value.oldPassword).toString()
    const encryptedNewPassword = CryptoJS.MD5(passwordForm.value.newPassword).toString()
    
    await api.changePassword({
      oldPassword: encryptedOldPassword,
      newPassword: encryptedNewPassword
    })
    ElMessage.success('密码修改成功')
    changePasswordDialogVisible.value = false
    // 清空表单
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    console.error('修改密码失败:', error)
    ElMessage.error('修改密码失败')
  } finally {
    changingPassword.value = false
  }
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return '管理员'
    case 'user':
      return '普通用户'
    default:
      return role
  }
}

onMounted(() => {
  fetchUserProfile()
})
</script>

<template>
  <div class="user-profile">
    <div class="header">
      <h2 class="title">个人信息</h2>
    </div>

    <el-row :gutter="24">
      <!-- 左侧栏 -->
      <el-col :xs="24" :sm="24" :md="16" :lg="16" :xl="16">
        <!-- 基本信息 -->
        <el-card shadow="hover" class="profile-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">基本信息</span>
            </div>
          </template>

          <el-form
            v-loading="loading"
            :model="userForm"
            label-position="top"
            class="profile-form"
          >
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="用户名">
                  <el-input 
                    v-model="userForm.username"
                    placeholder="请输入用户名"
                    :prefix-icon="User"
                  />
                </el-form-item>
              </el-col>
              
              <el-col :span="12">
                <el-form-item label="邮箱">
                  <el-input 
                    v-model="userForm.email"
                    placeholder="请输入邮箱"
                    :prefix-icon="Message"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="角色">
                  <el-input 
                    :value="getRoleLabel(userForm.role)"
                    disabled
                    :prefix-icon="Lock"
                  />
                </el-form-item>
              </el-col>
              
              <el-col :span="12">
                <el-form-item label="ID">
                  <el-input 
                    v-model="userForm.id"
                    disabled
                    :prefix-icon="Calendar"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item class="form-actions">
              <el-button
                type="primary"
                :loading="saving"
                @click="updateProfile"
                class="save-button"
              >
                保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 安全设置 -->
        <el-card shadow="hover" class="security-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">安全设置</span>
            </div>
          </template>

          <div class="security-options">
            <div class="security-option">
              <div class="option-info">
                <h4>密码</h4>
                <p class="option-description">修改您的账户密码</p>
              </div>
              <el-button 
                type="primary" 
                plain
                @click="changePasswordDialogVisible = true"
              >
                修改密码
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧栏 -->
      <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <!-- 账户状态 -->
        <el-card shadow="hover" class="status-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">账户状态</span>
            </div>
          </template>

          <div class="status-info">
            <div class="status-item">
              <span class="status-label">状态</span>
              <el-tag type="success" effect="light" class="status-value">正常</el-tag>
            </div>

            <el-divider />

            <div class="status-item">
              <span class="status-label">角色</span>
              <span class="status-value">{{ getRoleLabel(userForm.role) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="changePasswordDialogVisible"
      title="修改密码"
      width="500px"
    >
      <el-form
        :model="passwordForm"
        label-position="top"
      >
        <el-form-item label="当前密码">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="changePasswordDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="changingPassword"
            @click="handleChangePassword"
          >
            确认修改
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.user-profile {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 64px);
}

.header {
  margin-bottom: 24px;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.card-header {
  padding: 0;
  border-bottom: none;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.profile-card,
.security-card,
.status-card {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.profile-form {
  padding-top: 16px;
}

.form-actions {
  margin-top: 24px;
  margin-bottom: 0;
  text-align: right;
}

.save-button {
  min-width: 120px;
}

.security-options {
  padding: 8px 0;
}

.security-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.option-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #1f2937;
}

.option-description {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.status-info {
  padding: 16px 0;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.status-label {
  font-size: 14px;
  color: #6b7280;
}

.status-value {
  font-weight: 500;
  color: #1f2937;
}

@media (max-width: 768px) {
  .user-profile {
    padding: 16px;
  }

  .title {
    font-size: 20px;
  }

  .security-option {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>