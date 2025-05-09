import { WebSocket as MockWebSocket } from 'mock-socket'
import { MockWebSocketServer } from '../../mock/websocket'

export class WebSocketFactory {
  private static instances: Map<string, WebSocket> = new Map()
  private static mockServers: Map<string, MockWebSocketServer> = new Map()
  private static connectionStatus: Map<string, boolean> = new Map()

  static createConnection(url: string): WebSocket {
    // 检查是否有现有的有效连接
    const existingWs = this.instances.get(url);
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      console.log(`复用现有WebSocket连接: ${url}`);
      return existingWs;
    }
    
    // 关闭任何现有连接
    this.closeConnection(url);
    
    // 确保不存在同类型的其他连接 (可选)
    if (url.includes('/ws/dashboard')) {
      // 关闭所有dashboard相关连接
      Array.from(this.instances.keys())
        .filter(u => u.includes('/ws/dashboard'))
        .forEach(u => this.closeConnection(u));
    } else if (url.includes('/ws/resources')) {
      // 关闭所有resources相关连接
      Array.from(this.instances.keys())
        .filter(u => u.includes('/ws/resources'))
        .forEach(u => this.closeConnection(u));
    }

    let ws: WebSocket

    if (import.meta.env.DEV) {
      // 开发环境：使用 mock
      try {
        const mockServer = new MockWebSocketServer(url)
        mockServer.connect().catch(err => {
          console.error('Failed to connect mock server:', err)
        })
        this.mockServers.set(url, mockServer)
        ws = new MockWebSocket(url) as unknown as WebSocket
      } catch (error) {
        console.error('Error creating mock WebSocket:', error)
        throw error
      }
    } else {
      // 生产环境：使用真实 WebSocket
      ws = new WebSocket(url)
    }

    // 添加一个额外的 onclose 监听器来更新连接状态
    const originalOnClose = ws.onclose
    ws.onclose = (event) => {
      this.connectionStatus.set(url, false)
      if (typeof originalOnClose === 'function') {
        originalOnClose.call(ws, event)
      }
    }

    this.instances.set(url, ws)
    this.connectionStatus.set(url, true)
    return ws
  }

  static closeConnection(url: string): void {
    const ws = this.instances.get(url)
    if (ws) {
      // 检查连接状态，避免重复关闭
      if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
        try {
          ws.close()
        } catch (error) {
          console.error(`Error closing WebSocket connection to ${url}:`, error)
        }
      }
      this.instances.delete(url)
    }

    if (import.meta.env.DEV) {
      const mockServer = this.mockServers.get(url)
      if (mockServer) {
        try {
          mockServer.disconnect()
        } catch (error) {
          console.error(`Error disconnecting mock server for ${url}:`, error)
        }
        this.mockServers.delete(url)
      }
    }

    this.connectionStatus.set(url, false)
  }

  static closeAll(): void {
    const urls = Array.from(this.instances.keys())
    urls.forEach(url => {
      this.closeConnection(url)
    })
  }

  static isConnected(url: string): boolean {
    return this.connectionStatus.get(url) === true
  }
} 