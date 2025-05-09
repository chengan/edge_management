// 节点类型
export type NodeType = 'gateway' | 'edge' | 'sensor'

// 设备状态
export type DeviceStatus = 'online' | 'offline' | 'warning'

// 节点
export interface Node {
  id: string
  name: string
  type: NodeType
  status: DeviceStatus
  load: number
}

// 连接
export interface Edge {
  source: string
  target: string
  bandwidth: string
}

// 拓扑图数据
export interface Topology {
  nodes: Node[]
  edges: Edge[]
} 