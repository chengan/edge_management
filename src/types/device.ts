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
  storage: number
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
  username?: string
  password?: string
  status: 'online' | 'offline' | 'warning'
  model?: string
  firmwareVersion?: string
  group?: string
  uptime?: number
  cpu: number
  memory: number
  storage?: number
  network?: string
  networkIo?: [number, number]
  tasks?: string
  parsedTasks?: string[]
  lastSeen?: string
  restApi?: null | string
}

export interface AddDeviceRequest {
  ip: string
  username: string
  deviceName: string
  password: string
  group: string
  model: string
  firmwareVersion: string
}

export interface DeviceQueryParams {
  page: number;
  pageSize: number;
  status?: string;
  group?: string;
  keyword?: string;
}

export interface DeviceListResponse {
  total: number;
  devices: Device[];
} 