import { Server, WebSocket as MockWebSocket } from 'mock-socket'
import type { WebSocketMessage } from '../utils/websocket/types'

interface DeviceStatus {
  cpu: number
  memory: number
  disk: number
  network: {
    in: number
    out: number
  }
}

// 为了解决类型问题，使用 mock-socket 中的 Server.Client 类型
type MockSocketClient = any; // 暂时使用 any 来解决类型兼容问题

export class MockWebSocketServer {
  private mockServer: Server | null = null
  private url: string
  private updateInterval: NodeJS.Timeout | null = null
  private connected: boolean = false
  private clientSockets: Set<MockSocketClient> = new Set()
  private serverType: 'dashboard' | 'resources' | 'device' | 'default' = 'default'
  private deviceId: string | null = null

  constructor(url: string) {
    this.url = url
    
    // 根据URL确定服务器类型
    if (url.includes('/ws/dashboard')) {
      this.serverType = 'dashboard'
      console.log('创建仪表盘专用WebSocket服务器')
    } else if (url.includes('/ws/resources')) {
      this.serverType = 'resources'
      console.log('创建资源监控专用WebSocket服务器')
    } else if (url.includes('/ws/device/')) {
      this.serverType = 'device'
      // 从URL中提取设备ID，但不包含额外的时间戳或其他参数
      const matches = url.match(/\/ws\/device\/([^\/]+)/)
      this.deviceId = matches ? matches[1] : null
      console.log(`创建设备详情专用WebSocket服务器，设备ID: ${this.deviceId}`)
    } else {
      console.log('创建通用WebSocket服务器')
    }
  }

  private generateDeviceStatus(): DeviceStatus {
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: {
        in: Math.random() * 100,
        out: Math.random() * 100
      }
    }
  }

  private generateDashboardStats(): any {
    return {
      totalDevices: 471,
      onlineDevices: 96,
      offlineDevices: 14,
      alertsCount: 11,
      cpuUsage: parseFloat((Math.random() * 30 + 40).toFixed(2)),  // 40-70%范围随机
      memoryUsage: parseFloat((Math.random() * 30 + 40).toFixed(2)),
      networkUsage: parseFloat((Math.random() * 30 + 10).toFixed(2)),
      diskUsage: parseFloat((Math.random() * 20 + 70).toFixed(2))
    };
  }

  private generateResourceStatus(): DeviceStatus {
    // 可以生成针对资源页面的数据
    return this.generateDeviceStatus();
  }

  private generateDeviceData(deviceId: string): any {
    // 基础设备数据
    return {
      id: deviceId,
      name: `设备-${deviceId}`,
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      status: Math.random() > 0.8 ? 'offline' : Math.random() > 0.7 ? 'warning' : 'online',
      model: 'XM-100',
      firmwareVersion: '2.3.5',
      group: Math.random() > 0.7 ? 'Production' : Math.random() > 0.5 ? 'Testing' : 'Development',
      uptime: `${Math.floor(Math.random() * 720)}小时`,
      cpu: parseFloat((Math.random() * 100).toFixed(2)),
      memory: parseFloat((Math.random() * 100).toFixed(2)),
      network: {
        in: parseFloat((Math.random() * 20).toFixed(2)),
        out: parseFloat((Math.random() * 15).toFixed(2))
      },
      tasks: [
        {
          name: '数据采集',
          cpu: parseFloat((Math.random() * 100).toFixed(2)),
          memory: parseFloat((Math.random() * 100).toFixed(2)),
          status: Math.random() > 0.8 ? 'stopped' : Math.random() > 0.6 ? 'paused' : 'running'
        },
        {
          name: '数据处理',
          cpu: parseFloat((Math.random() * 100).toFixed(2)),
          memory: parseFloat((Math.random() * 100).toFixed(2)),
          status: Math.random() > 0.8 ? 'stopped' : Math.random() > 0.6 ? 'paused' : 'running'
        }
      ],
      lastSeen: new Date().toISOString()
    };
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 防止重复连接
        if (this.connected || this.mockServer) {
          this.disconnect();
        }

        // 创建 WebSocket 服务器
        this.mockServer = new Server(this.url)
        this.connected = true
        
        // 处理客户端连接
        this.mockServer.on('connection', (socket: MockSocketClient) => {
          console.log('Client connected to mock WebSocket server')
          
          // 跟踪客户端连接
          this.clientSockets.add(socket);
          
          // 发送初始数据
          const initialStatus = this.generateDeviceStatus()
          socket.send(JSON.stringify({
            type: 'DEVICE_STATUS',
            data: initialStatus
          }))

          // 设置定时器，模拟实时数据更新
          if (this.updateInterval) {
            clearInterval(this.updateInterval);
          }
          
          this.updateInterval = setInterval(() => {
            if (!this.connected) {
              if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
              }
              return;
            }
            
            // 根据服务器类型发送不同的消息
            if (this.serverType === 'dashboard' || this.serverType === 'default') {
              // 发送仪表盘数据更新
              this.broadcastMessage({
                type: 'DASHBOARD_STATS_UPDATE',
                data: this.generateDashboardStats()
              });
            }
            
            if (this.serverType === 'resources' || this.serverType === 'default') {
              // 发送资源监控数据更新
              const status = this.generateDeviceStatus()
              this.broadcastMessage({
                type: 'DEVICE_STATUS_UPDATE',
                data: status
              });
            }
            
            if (this.serverType === 'device' && this.deviceId) {
              // 发送设备详情更新
              this.broadcastMessage({
                type: 'DEVICE_UPDATE',
                data: this.generateDeviceData(this.deviceId)
              });
            }
          }, 5000)

          // 处理客户端消息
          socket.on('message', (messageData: string | ArrayBuffer) => {
            try {
              const message = JSON.parse(messageData.toString()) as WebSocketMessage
              console.log('Received message:', message)

              switch (message.type) {
                case 'GET_DEVICE_STATUS':
                  const status = this.generateDeviceStatus()
                  socket.send(JSON.stringify({
                    type: 'DEVICE_STATUS',
                    data: status
                  }))
                  break

                case 'GET_DASHBOARD_STATS':
                  if (this.serverType === 'dashboard' || this.serverType === 'default') {
                    const dashboardStats = this.generateDashboardStats()
                    socket.send(JSON.stringify({
                      type: 'DASHBOARD_STATS',
                      data: dashboardStats
                    }))
                  }
                  break
                  
                case 'GET_RESOURCE_STATUS':
                  if (this.serverType === 'resources' || this.serverType === 'default') {
                    const resourceStatus = this.generateResourceStatus()
                    socket.send(JSON.stringify({
                      type: 'RESOURCE_STATUS',
                      data: resourceStatus
                    }))
                  }
                  break

                case 'COMMAND':
                  socket.send(JSON.stringify({
                    type: 'COMMAND_RESPONSE',
                    data: {
                      success: true,
                      message: `Command ${message.data?.command} executed successfully`
                    }
                  }))
                  break

                case 'GET_DEVICE_INFO':
                  if (this.serverType === 'device' && this.deviceId) {
                    const deviceData = this.generateDeviceData(this.deviceId);
                    socket.send(JSON.stringify({
                      type: 'DEVICE_STATUS',
                      data: deviceData
                    }));
                  }
                  break
              }
            } catch (err) {
              console.error('Error handling WebSocket message:', err);
            }
          })
          
          // 处理客户端断开连接
          socket.on('close', () => {
            console.log('Client disconnected from mock WebSocket server');
            this.clientSockets.delete(socket);
          });
        })

        resolve()
      } catch (error) {
        console.error('Failed to create mock WebSocket server:', error)
        this.connected = false;
        reject(error)
      }
    })
  }
  
  private broadcastMessage(message: WebSocketMessage): void {
    const messageString = JSON.stringify(message);
    this.clientSockets.forEach(socket => {
      try {
        socket.send(messageString);
      } catch (err) {
        console.error('Error sending message to client:', err);
      }
    });
  }

  public disconnect() {
    this.connected = false;
    
    // 清除定时器
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    
    // 关闭所有客户端连接
    this.clientSockets.forEach(socket => {
      try {
        socket.close();
      } catch (err) {
        console.error('Error closing client socket:', err);
      }
    });
    this.clientSockets.clear();
    
    // 关闭服务器
    if (this.mockServer) {
      try {
        this.mockServer.close()
      } catch (err) {
        console.error('Error closing mock server:', err);
      }
      this.mockServer = null
    }
    
    console.log('Mock WebSocket server disconnected');
  }
  
  public isConnected(): boolean {
    return this.connected;
  }
} 