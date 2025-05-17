export interface Device {
  id: number
  name: string
  ip: string
  status: 'online' | 'offline' | 'warning'
  model: string
  firmwareVersion: string
  group: 'Production' | 'Testing' | 'Development'
  uptime: string
  cpu: number
  memory: number
  disk: number
  network: {
    in: number
    out: number
  }
  tasks: {
    name: string
    cpu: number
    memory: number
    status: 'running' | 'paused' | 'stopped'
  }[]
  lastSeen: string
  bandwidth: number
  environment: string
}

export interface DeviceNetworkInfo {
  in: number
  out: number
}

export interface DeviceDetail {
  id: number
  name: string
  ip: string
  status: 'online' | 'offline' | 'warning'
  model?: string
  firmwareVersion?: string
  group?: string
  uptime?: string
  cpu: number
  memory: number
  networkIo: [number, number]
  disk?: number
  tasks?: Array<{
    name: string
    cpu: number
    memory: number
    status: 'running' | 'paused' | 'stopped'
  }>
  lastSeen: string
}

export interface AddDeviceRequest {
  ip: string
  name: string
  username: string
  password: string
  cpu: number
  memory: number
  bandwidth: number
  environment: string
  config: Record<string, any>
} 