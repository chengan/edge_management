import Mock from 'mockjs'
import CryptoJS from 'crypto-js'
import type { AddDeviceRequest } from '../types/device'

// Set up mock response delay
Mock.setup({
  timeout: '200-600'
})

console.log('Mock初始化完成，开始配置接口...')

interface MockUser {
  username: string
  password: string
  id: number
  name: string
  avatar: string
}

interface MockUsers {
  [key: string]: MockUser
}

// 预设的用户数据，密码使用MD5加密
const users: MockUsers = {
  admin: {
    username: 'admin',
    // admin123 的 MD5 值
    password: '0192023a7bbd73250516f069df18b500',
    id: 1,
    name: 'Administrator',
    avatar: 'https://i.pravatar.cc/150?img=68'
  }
}

// Login API
Mock.mock(new RegExp('/login'), 'post', (options: any) => {
  console.log('Mock登录接口被调用:', {
    body: options.body,
    url: options.url,
    type: options.type
  })
  
  const { username, password } = JSON.parse(options.body)
  const user = users[username]
  
  if (user && password === user.password) {
    return {
      code: 200,
      data: {
        token: 'mock-token-abc123',
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          avatar: user.avatar
        }
      },
      message: 'Login successful'
    }
  } else {
    return {
      code: 401,
      data: null,
      message: 'Invalid username or password'
    }
  }
})

// Dashboard statistics
Mock.mock('/api/dashboard/stats', 'get', (options: any) => {
  console.log('Mock拦截到仪表盘请求:', options)
  const result = {
    code: 200,
    data: {
      totalDevices: Mock.Random.integer(100, 500),
      onlineDevices: Mock.Random.integer(80, 400),
      offlineDevices: Mock.Random.integer(1, 20),
      alertsCount: Mock.Random.integer(0, 15),
      cpuUsage: Mock.Random.float(10, 80, 2, 2),
      memoryUsage: Mock.Random.float(30, 90, 2, 2),
      networkIo: [
        Mock.Random.integer(100000000, 500000000),
        Mock.Random.integer(10000000, 100000000)
      ],
      storageUsage: Mock.Random.float(20, 85, 2, 2)
    }
  }
  console.log('Mock生成的仪表盘数据:', result)
  return result
})

// Devices list - 修复版本
Mock.mock('/api/devices', 'post', (options: any) => {
  console.log('设备列表查询请求:', options)
  
  // 从请求体获取参数
  const params = JSON.parse(options.body) || {
    page: 1,
    pageSize: 10,
    status: '',
    group: '',
    keyword: ''
  }
  
  // 创建固定设备数据用于测试
  const createDevices = () => {
    const devices = []
    for (let i = 0; i < 36; i++) {
      devices.push({
        id: 1000 + i,
        name: `Edge-Device-${1000 + i}`,
        ip: `192.168.1.${100 + i}`,
        status: ['online', 'offline', 'warning'][i % 3],
        model: `Model-${['A', 'B', 'C'][i % 3]}`,
        firmwareVersion: `v${1 + (i % 5)}.0`,
        cpu: 10 + (i % 70),
        memory: 20 + (i % 60),
        disk: 30 + (i % 50),
        group: ['Production', 'Testing', 'Development'][i % 3],
        uptime: `${1 + i} days`,
        network: {
          in: 1000 * i,
          out: 500 * i
        },
        tasks: [
          {
            name: `Task-${i}`,
            cpu: 5 + (i % 20),
            memory: 10 + (i % 30),
            status: 'running'
          }
        ],
        lastSeen: new Date().toISOString(),
        bandwidth: 100 + (i * 10),
        environment: ['Production', 'Testing', 'Development'][i % 3]
      })
    }
    return devices
  }
  
  // 所有设备数据
  const allDevices = createDevices()
  
  // 过滤设备
  let filteredDevices = [...allDevices]
  
  if (params.status) {
    filteredDevices = filteredDevices.filter(device => device.status === params.status)
  }
  
  if (params.group) {
    filteredDevices = filteredDevices.filter(device => device.group === params.group)
  }
  
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase()
    filteredDevices = filteredDevices.filter(device =>
      device.name.toLowerCase().includes(keyword) ||
      device.ip.includes(keyword)
    )
  }
  
  // 计算分页
  const total = filteredDevices.length
  const start = (params.page - 1) * params.pageSize
  const end = start + params.pageSize
  const pageData = filteredDevices.slice(start, end)
  
  return {
    code: 200,
    data: {
      list: pageData,
      total: total
    }
  }
})

// Single device details
Mock.mock(new RegExp('/api/devices/.*'), 'get', (options: any) => {
  const id = options.url.split('/').pop()
  return {
    code: 200,
    data: {
      id,
      name: `设备-${Mock.Random.integer(1000, 9999)}`,
      ip: Mock.Random.ip(),
      status: Mock.Random.pick(['online', 'offline', 'warning']),
      cpu: Mock.Random.float(0, 100, 2, 2),
      memory: Mock.Random.float(0, 100, 2, 2),
      storageUsage: Mock.Random.float(0,100,2,2),
      networkIo: [
        Mock.Random.integer(1000000, 50000000),
        Mock.Random.integer(100000, 10000000)
      ],
      temperature: Mock.Random.float(30, 70, 2, 2),
      model: `Model-${Mock.Random.character('ABCDEFG')}${Mock.Random.integer(10, 99)}`,
      firmwareVersion: `v${Mock.Random.float(1, 5, 1, 2)}`,
      tasks: Array(Mock.Random.integer(1, 5)).fill(0).map((_, idx) => ({
        id: Mock.Random.guid(),
        name: `Task-${idx + 1}`,
        cpu: Mock.Random.float(5, 30, 2, 2),
        memory: Mock.Random.float(10, 40, 2, 2),
        status: Mock.Random.pick(['running', 'paused', 'stopped'])
      })),
      group: Mock.Random.pick(['Production', 'Testing', 'Development']),
      lastSeen: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
      uptime: `${Mock.Random.integer(1, 60)} days, ${Mock.Random.integer(0, 23)} hours`
    }
  }
})

// Network topology data
Mock.mock('/api/topology', 'get', () => {
  const nodes = []
  const edges = []
  
  // Generate nodes
  for (let i = 0; i < 15; i++) {
    nodes.push({
      id: `device-${i}`,
      name: `Edge-${i}`,
      type: Mock.Random.pick(['gateway', 'edge', 'sensor']),
      status: Mock.Random.pick(['online', 'offline', 'warning']),
      load: Mock.Random.float(0, 100, 2, 2)
    })
  }
  
  // Generate edges (connections)
  for (let i = 1; i < nodes.length; i++) {
    // Connect to at least one other node
    edges.push({
      source: `device-${i}`,
      target: `device-${Mock.Random.integer(0, i-1)}`,
      bandwidth: `${Mock.Random.integer(10, 1000)} Mbps`
    })
    
    // Some nodes have more connections
    if (Mock.Random.boolean()) {
      const target = Mock.Random.integer(0, nodes.length - 1)
      if (`device-${target}` !== `device-${i}`) {
        edges.push({
          source: `device-${i}`,
          target: `device-${target}`,
          bandwidth: `${Mock.Random.integer(10, 1000)} Mbps`
        })
      }
    }
  }
  
  return {
    code: 200,
    data: { nodes, edges }
  }
})

// Alerts list
Mock.mock('/api/alerts', 'get', () => {
  const alerts = []
  for (let i = 0; i < Mock.Random.integer(5, 15); i++) {
    alerts.push({
      id: Mock.Random.integer(1000, 9999),
      deviceId: Mock.Random.integer(1000, 9999),
      deviceName: `设备-${Mock.Random.integer(1000, 9999)}`,
      type: Mock.Random.pick(['cpu', 'memory', 'disk', 'temperature', 'offline', 'network']),
      level: Mock.Random.pick(['info', 'warning', 'error', 'critical']),
      message: Mock.Random.sentence(5, 15),
      timestamp: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
      acknowledged: Mock.Random.boolean(),
      status: Mock.Random.pick(['unprocessed', 'processing', 'processed']),
      remark: Mock.Random.boolean() ? Mock.Random.sentence(3, 6) : ''
    })
  }
  return {
    code: 200,
    data: alerts
  }
})

// 告警确认
Mock.mock(new RegExp('/api/alerts/.*/acknowledge'), 'put', (options: any) => {
  console.log('Mock拦截到告警确认请求:', options)
  return {
    code: 200,
    data: null,
    message: '告警确认成功'
  }
})

// 告警处理
Mock.mock(new RegExp('/api/alerts/.*/process'), 'put', (options: any) => {
  console.log('Mock拦截到告警处理请求:', options)
  const { status, remark } = JSON.parse(options.body)
  return {
    code: 200,
    data: null,
    message: status === 'processed' ? '告警已处理完成' : '告警处理中'
  }
})

// User profile
Mock.mock('/api/user/profile', 'get', () => {
  console.log('Mock拦截到获取用户信息请求')
  return {
    code: 200,
    data: {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin'
    }
  }
})

// Update user profile
Mock.mock('/api/user/profile', 'put', (options: any) => {
  console.log('Mock拦截到更新用户信息请求:', options)
  const updateData = JSON.parse(options.body)
  return {
    code: 200,
    data: {
      id: '1',
      ...updateData,
      role: 'admin'
    },
    message: '用户信息更新成功'
  }
})

// Change password
Mock.mock('/api/user/change-password', 'put', (options: any) => {
  console.log('Mock拦截到修改密码请求:', options)
  const { oldPassword, newPassword } = JSON.parse(options.body)
  
  // 模拟密码验证 - admin123 的 MD5 值是 0192023a7bbd73250516f069df18b500
  if (oldPassword === '0192023a7bbd73250516f069df18b500') {
    // 密码验证通过，更新密码
    users.admin.password = newPassword
    return {
      code: 200,
      data: null,
      message: '密码修改成功'
    }
  } else {
    console.log('当前密码错误', {
      received: oldPassword,
      expected: '0192023a7bbd73250516f069df18b500'
    })
    return {
      code: 400,
      data: null,
      message: '当前密码错误'
    }
  }
})

// 设备重启
Mock.mock(new RegExp('/api/devices/.*/restart'), 'post', (options: any) => {
  console.log('Mock拦截到设备重启请求:', options)
  const deviceId = options.url.split('/')[3]
  return {
    code: 200,
    data: null,
    message: `设备 ${deviceId} 重启指令已发送`
  }
})

// 设备配置更新
Mock.mock(new RegExp('/api/devices/.*/config'), 'post', (options: any) => {
  console.log('Mock拦截到设备配置更新请求:', options)
  const deviceId = options.url.split('/')[3]
  const config = JSON.parse(options.body)
  return {
    code: 200,
    data: null,
    message: `设备 ${deviceId} 配置已更新`
  }
})

// 资源阈值设置
Mock.mock('/api/resource/threshold', 'post', (options: any) => {
  console.log('Mock拦截到资源阈值设置请求:', options)
  const thresholds = JSON.parse(options.body)
  return {
    code: 200,
    data: null,
    message: '资源阈值设置已更新'
  }
})

// 资源优化
Mock.mock('/api/resource/optimize', 'post', () => {
  console.log('Mock拦截到资源优化请求')
  return {
    code: 200,
    data: {
      message: '资源优化任务已启动，预计需要 1-2 分钟完成优化'
    }
  }
})

// 添加设备
Mock.mock('/api/devices/add', 'post', (options: any) => {
  try {
    const params = JSON.parse(options.body) as AddDeviceRequest
    console.log('Mock新增设备:', params)
    
    // 参数验证
    if (!params.name || !params.ip) {
      return {
        code: 400,
        data: null,
        message: '设备名称和IP不能为空'
      }
    }

    return {
      code: 200,
      data: null,
      message: '设备添加成功'
    }
  } catch (error) {
    return {
      code: 500,
      data: null,
      message: '服务器错误'
    }
  }
})

// Register API
Mock.mock(new RegExp('/register'), 'post', (options: any) => {
  console.log('Mock注册接口被调用:', {
    body: options.body,
    url: options.url,
    type: options.type
  })
  
  const { username, email, password } = JSON.parse(options.body)
  
  // 检查用户名是否已存在
  if (users[username]) {
    return {
      code: 400,
      data: null,
      message: '用户名已存在'
    }
  }
  
  // 模拟新用户注册
  const newUserId = Object.keys(users).length + 1
  users[username] = {
    username,
    password,
    id: newUserId,
    name: username,
    avatar: `https://i.pravatar.cc/150?img=${newUserId + 70}`
  }
  
  console.log('新用户注册成功:', users[username])
  
  return {
    code: 200,
    data: {
      token: `mock-token-${username}-${newUserId}`,
      user: {
        id: newUserId,
        username,
        email,
        role: 'user'
      }
    },
    message: '注册成功'
  }
})

export default Mock