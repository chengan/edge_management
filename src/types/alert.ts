export interface Alert {
  id: number
  timestamp: string
  deviceId: number
  deviceName: string
  type: 'cpu' | 'memory' | 'disk' | 'temperature' | 'offline' | 'network'
  level: 'critical' | 'error' | 'warning' | 'info'
  message: string
  acknowledged: boolean
  status: 'unprocessed' | 'processing' | 'processed'
  remark?: string
} 