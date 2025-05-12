# 边缘监控系统 API 文档

## 目录
1. [登录/认证接口](#登录认证接口)
2. [仪表盘接口](#仪表盘接口)
3. [设备管理接口](#设备管理接口)
4. [网络拓扑接口](#网络拓扑接口)
5. [资源调度接口](#资源调度接口)
6. [告警管理接口](#告警管理接口)
7. [WebSocket接口](#websocket-接口)

## 数据类型定义

### 通用响应格式
```typescript
interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}
```

### 用户相关类型
```typescript
interface LoginParams {
  username: string
  password: string  // MD5加密后传输
}

interface UserProfile {
  id: string
  username: string
  email: string
  role: string
}

interface LoginResult {
  token: string
  user: UserProfile
}
```

### 设备相关类型
```typescript
interface Device {
  id: string
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
}
```

### 告警相关类型
```typescript
interface Alert {
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
```

### 拓扑图相关类型
```typescript
type NodeType = 'gateway' | 'edge' | 'sensor'
type DeviceStatus = 'online' | 'offline' | 'warning'

interface Node {
  id: string
  name: string
  type: NodeType
  status: DeviceStatus
  load: number
}

interface Edge {
  source: string
  target: string
  bandwidth: string
}

interface Topology {
  nodes: Node[]
  edges: Edge[]
}
```

## 接口说明

### 登录/认证接口

#### 1.1 用户登录
**接口URL**: `/login`  
**请求方式**: POST  
**URL示例**: `http://api.example.com/login`

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| username | string | 是 | 用户名，长度4-20个字符 |
| password | string | 是 | 密码，MD5加密后的32位小写字符串 |

**请求示例**:
```json
{
    "username": "admin",
    "password": "e10adc3949ba59abbe56e057f20f883e"  // 原密码：123456   
}
```

**响应字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| code | number | 状态码，200表示成功 |
| message | string | 响应消息 |
| data.token | string | JWT认证令牌 |
| data.user.id | string | 用户ID |
| data.user.username | string | 用户名 |
| data.user.name | string | 显示名称 |
| data.user.avatar | string | 头像URL |

**响应示例**:
```json
{
    "code": 200,
    "message": "登录成功",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
            "id": "1",
            "username": "admin",
            "name": "系统管理员",
            "avatar": "http://i.pravatar.cc/150?img=68",
            "email": "admin@example.com",
            "role": "administrator"
        }
    }
}
```

**错误响应示例**:
```json
{
    "code": 401,
    "message": "用户名或密码错误",
    "data": null
}
```

#### 1.2 获取用户信息
**接口URL**: `/api/user/info`  
**请求方式**: GET  
**URL示例**: `http://api.example.com/api/user/info`

**请求头说明**:
| 参数名 | 必填 | 说明 |
|-------|------|------|
| Authorization | 是 | Bearer + 空格 + token |

**请求头示例**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| userId | string | 用户ID |
| username | string | 用户名 |
| email | string | 电子邮箱 |
| role | string | 用户角色 |
| lastLoginTime | string | 最后登录时间(ISO 8601格式) |

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "userId": "1",
        "username": "admin",
        "email": "admin@example.com",
        "role": "administrator",
        "lastLoginTime": "2024-03-20T10:00:00Z"
    }
}
```

#### 1.3 修改用户信息
**接口URL**: `/api/user/update`  
**请求方式**: PUT  
**URL示例**: `http://api.example.com/api/user/update`

**请求头要求**:
同 1.2 获取用户信息

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| email | string | 否 | 新邮箱地址 |
| password | string | 否 | 新密码(MD5加密) |
| oldPassword | string | 否* | 原密码(MD5加密)，修改密码时必填 |

**请求示例**:
```json
{
    "email": "new_email@example.com",
    "password": "e10adc3949ba59abbe56e057f20f883e",
    "oldPassword": "d41d8cd98f00b204e9800998ecf8427e"
}
```

**响应示例**:
```json
{
    "code": 200,
    "message": "用户信息更新成功",
    "data": {
        "userId": "1",
        "username": "admin",
        "email": "new_email@example.com",
        "updateTime": "2024-03-20T10:30:00Z"
    }
}
```

**错误响应示例**:
```json
{
    "code": 400,
    "message": "原密码错误",
    "data": null
}
```

### 仪表盘接口

#### 2.1 获取核心指标数据
**接口URL**: `/api/dashboard/stats`  
**请求方式**: GET  
**URL示例**: `http://api.example.com/api/dashboard/stats`

**请求头要求**:
同 1.2 获取用户信息

**响应字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| totalDevices | number | 设备总数 |
| onlineDevices | number | 在线设备数 |
| offlineDevices | number | 离线设备数 |
| alertsCount | number | 告警总数 |
| cpuUsage | number | CPU使用率(%) |
| memoryUsage | number | 内存使用率(%) |
| networkUsage | number | 网络使用率(%) |
| diskUsage | number | 磁盘使用率(%) |

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "totalDevices": 471,        // 设备总数
        "onlineDevices": 96,        // 在线设备数
        "offlineDevices": 14,       // 离线设备数
        "alertsCount": 11,          // 告警总数
        "cpuUsage": 45.5,          // CPU使用率(%)
        "memoryUsage": 55.2,       // 内存使用率(%)
        "networkUsage": 25.8,      // 网络使用率(%)
        "diskUsage": 75.3          // 磁盘使用率(%)
    }
}
```

#### 2.2 仪表盘WebSocket实时数据
**WebSocket URL**: `ws://host/ws/dashboard`  
**消息类型**: 
1. 客户端请求:
```json
{
    "type": "GET_DASHBOARD_STATS"
}
```
2. 服务器推送:
```json
{
    "type": "DASHBOARD_STATS_UPDATE",
    "data": {
        "totalDevices": 471,
        "onlineDevices": 96,
        "offlineDevices": 14,
        "alertsCount": 11,
        "cpuUsage": 45.5,
        "memoryUsage": 55.2,
        "networkUsage": 25.8,
        "diskUsage": 75.3
    }
}
```

#### 2.3 获取设备状态分布数据
**接口URL**: `/api/dashboard/device-status`  
**请求方式**: GET  
**URL示例**: `http://api.example.com/api/dashboard/device-status`

**请求头要求**:
同 1.2 获取用户信息

**响应字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| statusDistribution | array | 状态分布数组 |
| statusDistribution[].status | string | 设备状态：online(在线)、offline(离线)、maintenance(维护中) |
| statusDistribution[].count | number | 该状态的设备数量 |
| statusDistribution[].percentage | number | 该状态的设备占比(%) |

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "statusDistribution": [
            {
                "status": "online",
                "count": 85,
                "percentage": 85
            },
            {
                "status": "offline",
                "count": 10,
                "percentage": 10
            },
            {
                "status": "maintenance",
                "count": 5,
                "percentage": 5
            }
        ]
    }
}
```

#### 2.4 获取资源使用趋势数据
**接口URL**: `/api/dashboard/resource-trends`  
**请求方式**: GET  
**URL示例**: `http://api.example.com/api/dashboard/resource-trends?timeRange=24h&interval=1h`

**请求头要求**:
同 1.2 获取用户信息

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| timeRange | string | 是 | 时间范围：24h(24小时)、7d(7天)、30d(30天) |
| interval | string | 是 | 数据间隔：1h(1小时)、1d(1天) |

**响应字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| timestamps | array | 时间戳数组，ISO 8601格式 |
| cpu | array | CPU使用率数组(%) |
| memory | array | 内存使用率数组(%) |
| network | array | 网络使用率数组(%) |
| storage | array | 存储使用率数组(%) |

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "timestamps": [
            "2024-03-20T00:00:00Z",
            "2024-03-20T01:00:00Z",
            "2024-03-20T02:00:00Z",
            "2024-03-20T03:00:00Z"
        ],
        "cpu": [65, 70, 68, 72], // CPU使用率(%)
        "memory": [75, 80, 78, 82], // 内存使用率(%)
        "network": [50, 55, 52, 58],  // 网络使用率(%)
        "storage": [60, 65, 63, 67] // 存储使用率(%)
    }
}
```

**错误响应示例**:
```json
{
    "code": 400,
    "message": "无效的时间范围参数",
    "data": null
}
```

### 设备管理接口

#### 3.1 获取设备列表
**接口URL**: `/api/devices`  
**请求方式**: GET  
**URL示例**: `http://api.example.com/api/devices?page=1&pageSize=10&status=online`

**请求头要求**:
同 1.2 获取用户信息

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |
| status | string | 否 | 设备状态筛选：online、offline、warning |
| group | string | 否 | 设备分组筛选 |
| keyword | string | 否 | 搜索关键词，匹配设备名称或IP |

**响应字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| total | number | 总记录数 |
| devices | array | 设备列表 |
| devices[].id | string | 设备ID |
| devices[].name | string | 设备名称 |
| devices[].ip | string | IP地址 |
| devices[].status | string | 设备状态 |
| devices[].cpu | number | CPU使用率(%) |
| devices[].memory | number | 内存使用率(%) |
| devices[].disk | number | 磁盘使用率(%) |
| devices[].temperature | number | 温度(℃) |
| devices[].group | string | 设备分组 |
| devices[].lastSeen | string | 最后在线时间 |

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "total": 471,
        "devices": [
            {
                "id": "device-001",
                "name": "Edge-Device-1234",
                "ip": "192.168.1.100",
                "status": "online",
                "cpu": 65.5,
                "memory": 75.2,
                "disk": 60.8,
                "temperature": 45.5,
                "group": "Production",
                "lastSeen": "2024-03-20T10:00:00Z"
            },
            {
                "id": "device-002",
                "name": "Edge-Device-5678",
                "ip": "192.168.1.101",
                "status": "warning",
                "cpu": 85.5,
                "memory": 90.2,
                "disk": 78.8,
                "temperature": 62.5,
                "group": "Production",
                "lastSeen": "2024-03-20T10:01:00Z"
            }
        ]
    }
}
```

#### 3.2 获取设备详情
**接口URL**: `/api/devices/{deviceId}`  
**请求方式**: GET  
**URL示例**: `http://api.example.com/api/devices/device-001`

**请求头要求**:
同 1.2 获取用户信息

**路径参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| deviceId | string | 是 | 设备ID |

**响应字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | string | 设备ID |
| name | string | 设备名称 |
| ip | string | IP地址 |
| status | string | 设备状态 |
| model | string | 设备型号 |
| firmwareVersion | string | 固件版本 |
| group | string | 设备分组 |
| uptime | string | 运行时长 |
| cpu | number | CPU使用率(%) |
| memory | number | 内存使用率(%) |
| network.in | number | 网络入流量(MB/s) |
| network.out | number | 网络出流量(MB/s) |
| tasks | array | 运行中的任务列表 |
| tasks[].name | string | 任务名称 |
| tasks[].cpu | number | 任务CPU使用率(%) |
| tasks[].memory | number | 任务内存使用率(%) |
| tasks[].status | string | 任务状态 |
| lastSeen | string | 最后在线时间 |

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "id": "device-001",
        "name": "Edge-Device-1234",
        "ip": "192.168.1.100",
        "status": "online",
        "model": "XM-100",
        "firmwareVersion": "2.3.5",
        "group": "Production",
        "uptime": "720小时",
        "cpu": 65.5,
        "memory": 75.2,
        "network": {
            "in": 12.5,
            "out": 8.3
        },
        "tasks": [
            {
                "name": "数据采集",
                "cpu": 35.5,
                "memory": 45.2,
                "status": "running"
            },
            {
                "name": "数据处理",
                "cpu": 25.5,
                "memory": 35.2,
                "status": "running"
            }
        ],
        "lastSeen": "2024-03-20T10:00:00Z"
    }
}
```

#### 3.3 设备重启
**接口URL**: `/api/devices/{deviceId}/restart`  
**请求方式**: POST  
**URL示例**: `http://api.example.com/api/devices/device-001/restart`

**请求头要求**:
同 1.2 获取用户信息

**路径参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| deviceId | string | 是 | 设备ID |

**响应示例**:
```json
{
    "code": 200,
    "message": "设备重启指令已发送",
    "data": {
        "taskId": "restart-task-001",
        "deviceId": "device-001",
        "status": "pending",
        "estimatedTime": 60
    }
}
```

**错误响应示例**:
```json
{
    "code": 404,
    "message": "设备不存在",
    "data": null
}
```

#### 3.4 设备配置更新
**接口URL**: `/api/devices/{deviceId}/config`  
**请求方式**: POST  
**URL示例**: `http://api.example.com/api/devices/device-001/config`

**请求头要求**:
同 1.2 获取用户信息

**路径参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| deviceId | string | 是 | 设备ID |

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| resourceLimit.cpu | number | 否 | CPU使用上限(%) |
| resourceLimit.memory | number | 否 | 内存使用上限(%) |
| resourceLimit.storage | number | 否 | 存储使用上限(%) |
| networkSettings.bandwidth | string | 否 | 带宽限制 |
| networkSettings.priority | string | 否 | 网络优先级：high、medium、low |

**请求示例**:
```json
{
    "resourceLimit": {
        "cpu": 80,
        "memory": 85,
        "storage": 90
    },
    "networkSettings": {
        "bandwidth": "100M",
        "priority": "high"
    }
}
```

**响应示例**:
```json
{
    "code": 200,
    "message": "设备配置已更新",
    "data": {
        "deviceId": "device-001",
        "updateTime": "2024-03-20T10:30:00Z",
        "config": {
            "resourceLimit": {
                "cpu": 80,
                "memory": 85,
                "storage": 90
            },
            "networkSettings": {
                "bandwidth": "100M",
                "priority": "high"
            }
        }
    }
}
```

#### 3.5 设备WebSocket实时数据
**WebSocket URL**: `ws://host/ws/device/{deviceId}`  
**消息类型**: 
1. 客户端请求:
```json
{
    "type": "GET_DEVICE_INFO"
}
```
2. 服务器推送:
```json
{
    "type": "DEVICE_UPDATE",
    "data": {
        "id": "device-001",
        "name": "设备-device-001",
        "status": "online",
        "cpu": 65.5,
        "memory": 75.2,
        "network": {
            "in": 12.5,
            "out": 8.3
        },
        "tasks": [
            {
                "name": "数据采集",
                "cpu": 35.5,
                "memory": 45.2,
                "status": "running"
            }
        ]
    }
}
```

### 网络拓扑接口

#### 4.1 获取拓扑图数据
**接口URL**: `/api/topology`  
**请求方式**: GET  
**URL示例**: `http://api.example.com/api/topology`

**请求头要求**:
同 1.2 获取用户信息

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| group | string | 否 | 设备分组筛选 |
| depth | number | 否 | 拓扑图层级深度，默认2 |

**响应字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| nodes | array | 节点列表 |
| nodes[].id | string | 节点ID |
| nodes[].name | string | 节点名称 |
| nodes[].type | string | 节点类型：gateway(网关)、edge(边缘设备)、sensor(传感器) |
| nodes[].status | string | 节点状态：online(在线)、offline(离线)、warning(警告) |
| nodes[].load | number | 节点负载(%) |
| nodes[].coordinates | object | 节点坐标 |
| nodes[].coordinates.x | number | X坐标 |
| nodes[].coordinates.y | number | Y坐标 |
| links | array | 连接列表 |
| links[].source | string | 源节点ID |
| links[].target | string | 目标节点ID |
| links[].type | string | 连接类型：network(网络)、data(数据) |
| links[].bandwidth | string | 带宽 |
| links[].status | string | 连接状态：active(活跃)、inactive(非活跃)、error(错误) |

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "nodes": [
            {
                "id": "gateway_001",
                "name": "主网关",
                "type": "gateway",
                "status": "online",
                "load": 45.5,
                "coordinates": {
                    "x": 100,
                    "y": 100
                }
            },
            {
                "id": "edge_001",
                "name": "边缘设备1",
                "type": "edge",
                "status": "online",
                "load": 65.5,
                "coordinates": {
                    "x": 200,
                    "y": 150
                }
            },
            {
                "id": "sensor_001",
                "name": "温度传感器1",
                "type": "sensor",
                "status": "online",
                "load": 25.5,
                "coordinates": {
                    "x": 300,
                    "y": 200
                }
            }
        ],
        "links": [
            {
                "source": "gateway_001",
                "target": "edge_001",
                "type": "network",
                "bandwidth": "1Gbps",
                "status": "active"
            },
            {
                "source": "edge_001",
                "target": "sensor_001",
                "type": "data",
                "bandwidth": "100Mbps",
                "status": "active"
            }
        ]
    }
}
```

**错误响应示例**:
```json
{
    "code": 400,
    "message": "无效的拓扑图层级深度",
    "data": null
}
```

### 资源调度接口

#### 5.1 设置资源阈值
**接口URL**: `/api/resource/threshold`  
**请求方式**: POST  
**URL示例**: `http://api.example.com/api/resource/threshold`

**请求头要求**:
同 1.2 获取用户信息

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| thresholds.cpu.warning | number | 是 | CPU警告阈值(%) |
| thresholds.cpu.critical | number | 是 | CPU严重阈值(%) |
| thresholds.memory.warning | number | 是 | 内存警告阈值(%) |
| thresholds.memory.critical | number | 是 | 内存严重阈值(%) |
| thresholds.storage.warning | number | 是 | 存储警告阈值(%) |
| thresholds.storage.critical | number | 是 | 存储严重阈值(%) |

**请求示例**:
```json
{
    "thresholds": {
        "cpu": {
            "warning": 70,
            "critical": 90
        },
        "memory": {
            "warning": 75,
            "critical": 90
        },
        "storage": {
            "warning": 80,
            "critical": 95
        }
    }
}
```

**响应示例**:
```json
{
    "code": 200,
    "message": "资源阈值设置已更新",
    "data": {
        "updateTime": "2024-03-20T10:30:00Z",
        "thresholds": {
            "cpu": {
                "warning": 70,
                "critical": 90
            },
            "memory": {
                "warning": 75,
                "critical": 90
            },
            "storage": {
                "warning": 80,
                "critical": 95
            }
        }
    }
}
```

#### 5.2 资源优化
**接口URL**: `/api/resource/optimize`  
**请求方式**: POST  
**URL示例**: `http://api.example.com/api/resource/optimize`

**请求头要求**:
同 1.2 获取用户信息

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| strategy | string | 否 | 优化策略：auto(自动)、cpu_first(CPU优先)、memory_first(内存优先)，默认auto |
| deviceIds | array | 否 | 需要优化的设备ID列表，为空则优化所有设备 |

**请求示例**:
```json
{
    "strategy": "cpu_first",
    "deviceIds": ["device-001", "device-002"]
}
```

**响应字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| taskId | string | 优化任务ID |
| status | string | 任务状态：pending(等待中)、running(执行中)、completed(已完成) |
| estimatedTime | number | 预计完成时间(秒) |
| devices | array | 优化设备列表 |
| devices[].id | string | 设备ID |
| devices[].name | string | 设备名称 |
| devices[].currentLoad | object | 当前负载 |
| devices[].targetLoad | object | 目标负载 |

**响应示例**:
```json
{
    "code": 200,
    "message": "资源优化任务已启动",
    "data": {
        "taskId": "optimize-task-001",
        "status": "running",
        "estimatedTime": 120,
        "devices": [
            {
                "id": "device-001",
                "name": "Edge-Device-1234",
                "currentLoad": {
                    "cpu": 85,
                    "memory": 90,
                    "storage": 70
                },
                "targetLoad": {
                    "cpu": 65,
                    "memory": 75,
                    "storage": 70
                }
            },
            {
                "id": "device-002",
                "name": "Edge-Device-5678",
                "currentLoad": {
                    "cpu": 75,
                    "memory": 85,
                    "storage": 65
                },
                "targetLoad": {
                    "cpu": 60,
                    "memory": 70,
                    "storage": 65
                }
            }
        ]
    }
}
```

**错误响应示例**:
```json
{
    "code": 400,
    "message": "无效的优化策略",
    "data": null
}
```

#### 5.3 资源WebSocket实时数据
**WebSocket URL**: `ws://host/ws/resources`  
**消息类型**: 
1. 客户端请求:
```json
{
    "type": "GET_RESOURCE_STATUS"
}
```

### 告警管理接口

#### 6.1 获取告警列表
**接口URL**: `/api/alerts`  
**请求方式**: GET  
**URL示例**: `http://api.example.com/api/alerts?page=1&pageSize=10&level=critical&status=unprocessed`

**请求头要求**:
同 1.2 获取用户信息

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |
| level | string | 否 | 告警级别：critical、error、warning、info |
| status | string | 否 | 处理状态：unprocessed、processing、processed |
| deviceId | string | 否 | 设备ID |
| startTime | string | 否 | 开始时间，ISO 8601格式 |
| endTime | string | 否 | 结束时间，ISO 8601格式 |

**响应字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| total | number | 总记录数 |
| alerts | array | 告警列表 |
| alerts[].id | string | 告警ID |
| alerts[].timestamp | string | 告警时间 |
| alerts[].deviceId | string | 设备ID |
| alerts[].deviceName | string | 设备名称 |
| alerts[].type | string | 告警类型：cpu、memory、disk、temperature、offline、network |
| alerts[].level | string | 告警级别：critical、error、warning、info |
| alerts[].message | string | 告警消息 |
| alerts[].acknowledged | boolean | 是否已确认 |
| alerts[].status | string | 处理状态：unprocessed、processing、processed |
| alerts[].remark | string | 处理备注 |

**响应示例**:
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "total": 125,
        "alerts": [
            {
                "id": "alert-001",
                "timestamp": "2024-03-20T10:00:00Z",
                "deviceId": "device-001",
                "deviceName": "Edge-Device-1234",
                "type": "cpu",
                "level": "critical",
                "message": "CPU使用率超过90%",
                "acknowledged": false,
                "status": "unprocessed",
                "remark": ""
            },
            {
                "id": "alert-002",
                "timestamp": "2024-03-20T09:55:00Z",
                "deviceId": "device-002",
                "deviceName": "Edge-Device-5678",
                "type": "memory",
                "level": "warning",
                "message": "内存使用率超过75%",
                "acknowledged": true,
                "status": "processing",
                "remark": "正在进行内存优化"
            }
        ]
    }
}
```

#### 6.2 告警确认
**接口URL**: `/api/alerts/{alertId}/acknowledge`  
**请求方式**: PUT  
**URL示例**: `http://api.example.com/api/alerts/alert-001/acknowledge`

**请求头要求**:
同 1.2 获取用户信息

**路径参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| alertId | string | 是 | 告警ID |

**响应示例**:
```json
{
    "code": 200,
    "message": "告警确认成功",
    "data": {
        "id": "alert-001",
        "acknowledged": true,
        "acknowledgedAt": "2024-03-20T10:30:00Z",
        "acknowledgedBy": {
            "id": "1",
            "username": "admin",
            "name": "系统管理员"
        }
    }
}
```

#### 6.3 告警处理
**接口URL**: `/api/alerts/{alertId}/process`  
**请求方式**: PUT  
**URL示例**: `http://api.example.com/api/alerts/alert-001/process`

**请求头要求**:
同 1.2 获取用户信息

**路径参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| alertId | string | 是 | 告警ID |

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| status | string | 是 | 处理状态：processing(处理中)、processed(已处理) |
| remark | string | 是 | 处理备注 |
| solution | string | 否 | 解决方案 |
| relatedTaskId | string | 否 | 关联的任务ID |

**请求示例**:
```json
{
    "status": "processed",
    "remark": "已完成CPU资源优化",
    "solution": "通过资源调度降低CPU使用率",
    "relatedTaskId": "optimize-task-001"
}
```

**响应示例**:
```json
{
    "code": 200,
    "message": "告警处理成功",
    "data": {
        "id": "alert-001",
        "status": "processed",
        "processedAt": "2024-03-20T11:00:00Z",
        "processedBy": {
            "id": "1",
            "username": "admin",
            "name": "系统管理员"
        },
        "solution": "通过资源调度降低CPU使用率",
        "relatedTaskId": "optimize-task-001"
    }
}
```

**错误响应示例**:
```json
{
    "code": 404,
    "message": "告警不存在",
    "data": null
}
```

## WebSocket 接口

### WebSocket连接
**WebSocket URL**: `ws://host/ws/{type}`  
**URL示例**: 
- 仪表盘数据: `ws://api.example.com/ws/dashboard`
- 设备详情数据: `ws://api.example.com/ws/device/device-001`
- 资源监控数据: `ws://api.example.com/ws/resources`

**连接参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| token | string | 是 | 认证token，通过URL参数传递 |
| type | string | 是 | 连接类型：dashboard、device/{deviceId}、resources |

**连接示例**:
```
ws://api.example.com/ws/dashboard?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 消息类型说明

#### 1. 仪表盘数据 (`ws://host/ws/dashboard`)

**字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| type | string | 消息类型：DASHBOARD_STATS_UPDATE |
| data.totalDevices | number | 设备总数 |
| data.onlineDevices | number | 在线设备数 |
| data.offlineDevices | number | 离线设备数 |
| data.alertsCount | number | 告警总数 |
| data.resourceUsage | object | 资源使用情况 |
| data.resourceUsage.cpu | number | CPU使用率(%) |
| data.resourceUsage.memory | number | 内存使用率(%) |
| data.resourceUsage.disk | number | 磁盘使用率(%) |
| data.resourceUsage.network | object | 网络使用情况 |

**消息示例**:
```json
{
    "type": "DASHBOARD_STATS_UPDATE",
    "data": {
        "totalDevices": 471,
        "onlineDevices": 96,
        "offlineDevices": 14,
        "alertsCount": 11,
        "resourceUsage": {
            "cpu": 45.5,
            "memory": 55.2,
            "disk": 75.3,
            "network": {
                "in": 125.5,
                "out": 86.3
            }
        },
        "timestamp": "2024-03-20T10:00:00Z"
    }
}
```

#### 2. 设备详情数据 (`ws://host/ws/device/{deviceId}`)

**字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| type | string | 消息类型：DEVICE_UPDATE |
| data.id | string | 设备ID |
| data.name | string | 设备名称 |
| data.status | string | 设备状态 |
| data.cpu | number | CPU使用率(%) |
| data.memory | number | 内存使用率(%) |
| data.network | object | 网络使用情况 |
| data.tasks | array | 运行中的任务列表 |

**消息示例**:
```json
{
    "type": "DEVICE_UPDATE",
    "data": {
        "id": "device-001",
        "name": "Edge-Device-1234",
        "status": "online",
        "cpu": 65.5,
        "memory": 75.2,
        "network": {
            "in": 12.5,
            "out": 8.3
        },
        "tasks": [
            {
                "name": "数据采集",
                "cpu": 35.5,
                "memory": 45.2,
                "status": "running"
            }
        ],
        "timestamp": "2024-03-20T10:00:00Z"
    }
}
```

#### 3. 资源监控数据 (`ws://host/ws/resources`)

**字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| type | string | 消息类型：DEVICE_STATUS_UPDATE |
| data.cpu | number | CPU使用率(%) |
| data.memory | number | 内存使用率(%) |
| data.disk | number | 磁盘使用率(%) |
| data.network | object | 网络使用情况 |
| data.network.in | number | 网络入流量(MB/s) |
| data.network.out | number | 网络出流量(MB/s) |

**消息示例**:
```json
{
    "type": "DEVICE_STATUS_UPDATE",
    "data": {
        "cpu": 65.5,
        "memory": 75.2,
        "disk": 60.8,
        "network": {
            "in": 12.5,
            "out": 8.3
        },
        "timestamp": "2024-03-20T10:00:00Z"
    }
}
```

### WebSocket错误处理

**错误消息字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| type | string | 消息类型：ERROR |
| code | number | 错误码 |
| message | string | 错误消息 |

**错误消息示例**:
```json
{
    "type": "ERROR",
    "code": 1001,
    "message": "认证失败，请重新登录"
}
```

**常见错误码说明**:
| 错误码 | 说明 |
|-------|------|
| 1001 | 认证失败 |
| 1002 | 设备不存在 |
| 1003 | 连接超时 |
| 1004 | 服务器内部错误 |
| 1005 | 无效的消息格式 |
| 1006 | 连接已断开 |

### WebSocket心跳机制

**心跳消息字段说明**:
| 字段名 | 类型 | 说明 |
|-------|------|------|
| type | string | 消息类型：HEARTBEAT |
| timestamp | number | 时间戳(毫秒) |

**心跳请求示例**:
```json
{
    "type": "HEARTBEAT",
    "timestamp": 1710921600000
}
```

**心跳响应示例**:
```json
{
    "type": "HEARTBEAT_ACK",
    "timestamp": 1710921600000,
    "serverTime": "2024-03-20T10:00:00Z"
}
```

**注意事项**:
1. 客户端需要每30秒发送一次心跳消息
2. 如果60秒内未收到心跳消息，服务器将断开连接
3. 心跳超时后需要重新建立连接
4. 建议客户端实现自动重连机制，重连间隔建议采用指数退避算法