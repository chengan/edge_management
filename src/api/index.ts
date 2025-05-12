import service from './config'
import type { LoginParams, LoginResult, DashboardStats, Alert, UserProfile } from '../types/api'
import type { Device, DeviceDetail, AddDeviceRequest } from '../types/device'
import type { Alert as AlertType } from '../types/alert'
import type { Topology } from '../types/topology'

// API路径配置
const ApiPath = {
  LOGIN: '/login',
  DASHBOARD_STATS: '/dashboard/stats',
  DEVICES: '/devices',
  TOPOLOGY: '/topology',
  ALERTS: '/alerts',
  ALERT_PROCESS: '/alerts/:id/process',
  USER_PROFILE: '/user/profile',
  CHANGE_PASSWORD: '/user/change-password',
  DEVICE_RESTART: '/devices/:id/restart',
  DEVICE_CONFIG: '/devices/:id/config',
  RESOURCE_THRESHOLD: '/resource/threshold',
  RESOURCE_OPTIMIZE: '/resource/optimize',
  DEVICE_ADD: '/devices/add'
} as const

// API 方法
const api = {
  // 获取网络拓扑
  getTopology() {
    return service.get<any, Topology>(ApiPath.TOPOLOGY)
  },

  // 仪表盘统计
  getDashboardStats() {
    return service.get<any, DashboardStats>(ApiPath.DASHBOARD_STATS)
  },

  // 设备列表
  getDevices() {
    return service.get<any, Device[]>(ApiPath.DEVICES)
  },

  // 设备详情
  getDeviceDetail(id: number) {
    return service.get<any, DeviceDetail>(`${ApiPath.DEVICES}/${id}`)
  },

  // 用户登录
  login(params: LoginParams) {
    return service.post<any, LoginResult>(ApiPath.LOGIN, params)
  },

  // 获取用户信息
  getUserProfile() {
    return service.get<any, UserProfile>(ApiPath.USER_PROFILE)
  },

  // 更新用户信息
  updateUserProfile(data: Partial<UserProfile>) {
    return service.put<any, UserProfile>(ApiPath.USER_PROFILE, data)
  },

  // 修改密码
  changePassword(data: { oldPassword: string; newPassword: string }) {
    return service.put<any, void>(ApiPath.CHANGE_PASSWORD, data)
  },

  // 获取告警列表
  getAlerts(): Promise<AlertType[]> {
    return service.get<any, AlertType[]>(ApiPath.ALERTS)
  },

  // 确认告警
  acknowledgeAlert(alertId: number): Promise<void> {
    return service.put<any, void>(`${ApiPath.ALERTS}/${alertId}/acknowledge`)
  },

  // 处理告警
  processAlert(alertId: number, data: { status: 'processing' | 'processed', remark?: string }): Promise<void> {
    const url = ApiPath.ALERT_PROCESS.replace(':id', alertId.toString())
    return service.put<any, void>(url, data)
  },

  // 重启设备
  restartDevice(deviceId: number) {
    const url = ApiPath.DEVICE_RESTART.replace(':id', deviceId.toString())
    return service.post<any, void>(url)
  },

  // 更新设备配置
  updateDeviceConfig(deviceId: number, config: any) {
    const url = ApiPath.DEVICE_CONFIG.replace(':id', deviceId.toString())
    return service.post<any, void>(url, config)
  },

  // 更新资源阈值设置
  updateResourceThreshold(data: { cpuThreshold: number; memoryThreshold: number }) {
    return service.post<any, void>(ApiPath.RESOURCE_THRESHOLD, data)
  },

  // 触发资源优化
  triggerResourceOptimize() {
    return service.post<any, { message: string }>(ApiPath.RESOURCE_OPTIMIZE)
  },

  // 添加设备
  addDevice(params: AddDeviceRequest) {
    return service.post<any, void>(ApiPath.DEVICE_ADD, params)
  }
}

export default api