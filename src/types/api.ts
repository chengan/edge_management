// src/types/api.ts

import type { Alert } from './alert'

// 通用响应类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 登录参数类型
export interface LoginParams {
  username: string
  password: string
}

// 登录响应类型
export interface LoginResult {
  token: string
  user: UserProfile
}

// 用户信息接口
export interface UserProfile {
  id: number
  username: string
  email: string
  role: string
}

// 仪表板统计数据接口
export interface DashboardStats {
  totalDevices: number
  onlineDevices: number
  offlineDevices: number
  alertsCount: number
  cpuUsage: number
  memoryUsage: number
  networkIo: [number, number]
  storageUsage: number
}

// 注册参数类型
export interface RegisterParams {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export type { Alert }
