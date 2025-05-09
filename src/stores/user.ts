import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  
  const isAuthenticated = computed(() => !!token.value)
  
  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }
  
  function setUser(userData: any) {
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
  }
  
  async function login(username: string, password: string) {
    try {
      const response = await api.login({ username, password })
      setToken(response.token)
      setUser(response.user)
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }
  
  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
  
  return {
    token,
    user,
    isAuthenticated,
    login,
    logout
  }
})