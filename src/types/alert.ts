export interface Alert {
  id: string
  timestamp: string
  deviceId: string
  deviceName: string
  type: 'cpu' | 'memory' | 'disk' | 'temperature' | 'offline' | 'network'
  level: 'critical' | 'error' | 'warning' | 'info'
  message: string
  acknowledged: boolean
  status: 'unprocessed' | 'processing' | 'processed'
  remark?: string
} 