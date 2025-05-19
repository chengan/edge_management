import { WebSocketFactory } from './factory'
import type { WebSocketMessage, MessageHandler } from './types'

export class WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private messageHandlers: Set<MessageHandler> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private reconnectTimer: NodeJS.Timeout | null = null
  private periodicMessageTimer: NodeJS.Timeout | null = null
  private periodicMessage: WebSocketMessage | null = null
  private periodicInterval: number = 10000

  // 添加静态属性，用于共享连接和消息
  private static sharedConnections: Map<string, {
    ws: WebSocketService,
    refCount: number,
    messageTypes: Set<string>
  }> = new Map();

  constructor(url: string) {
    this.url = url
  }

  public async connect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    return new Promise((resolve, reject) => {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('WebSocket already connected');
          resolve();
          return;
        }
        
        if (this.ws) {
          try {
            this.disconnect();
          } catch (err) {
            console.error('Error during disconnect before reconnect:', err);
          }
        }
        
        this.ws = WebSocketFactory.createConnection(this.url)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          
          this.startPeriodicMessage()
          
          resolve()
        }

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data) as WebSocketMessage
            this.messageHandlers.forEach(handler => handler(data))
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (error: Event) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = (event: CloseEvent) => {
          console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`)
          
          this.stopPeriodicMessage()
          
          if (event.code !== 1000) {
            this.attemptReconnect()
          }
        }
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        reject(error)
      }
    })
  }

  public setPeriodicMessage(message: WebSocketMessage, interval: number = 10000): void {
    this.periodicMessage = message
    this.periodicInterval = interval
    
    this.startPeriodicMessage()
  }
  
  public stopPeriodicMessage(): void {
    if (this.periodicMessageTimer) {
      clearInterval(this.periodicMessageTimer)
      this.periodicMessageTimer = null
    }
  }
  
  private startPeriodicMessage(): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.periodicMessage) {
      this.stopPeriodicMessage()
      
      this.periodicMessageTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN && this.periodicMessage) {
          console.log(`发送定时消息: ${this.periodicMessage.type}`, this.periodicInterval + 'ms')
          this.send(this.periodicMessage)
        } else {
          this.stopPeriodicMessage()
        }
      }, this.periodicInterval)
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect in ${this.reconnectDelay}ms... (Attempt ${this.reconnectAttempts})`)
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        console.log('Reconnection attempt failed')
      })
    }, this.reconnectDelay)
  }

  public disconnect() {
    this.stopPeriodicMessage()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      WebSocketFactory.closeConnection(this.url)
      this.ws = null
    }
  }

  public send(message: WebSocketMessage) {
    if (!this.ws) {
      console.error('WebSocket is not initialized')
      return
    }
    
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else if (this.ws.readyState === WebSocket.CONNECTING) {
      console.warn('WebSocket is still connecting, message will be delayed')
      const checkAndSend = setInterval(() => {
        if (!this.ws) {
          clearInterval(checkAndSend)
          return
        }
        
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(message))
          clearInterval(checkAndSend)
        } else if (this.ws.readyState !== WebSocket.CONNECTING) {
          console.error('WebSocket connection failed while waiting to send message')
          clearInterval(checkAndSend)
        }
      }, 100)
      
      setTimeout(() => {
        clearInterval(checkAndSend)
      }, 5000)
    } else {
      console.error('WebSocket is not connected (readyState:', this.ws.readyState, ')')
    }
  }

  public onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler)
    return () => {
      this.messageHandlers.delete(handler)
    }
  }

  // 创建或获取共享连接
  public static getSharedConnection(url: string): WebSocketService {
    // 提取基础URL，忽略查询参数等
    const baseUrl = url.split('?')[0];
    
    // 查找是否已存在匹配的连接
    let connection = this.sharedConnections.get(baseUrl);
    
    if (connection) {
      // 增加引用计数
      connection.refCount++;
      console.log(`复用WebSocket连接: ${baseUrl}, 当前引用数: ${connection.refCount}`);
      return connection.ws;
    }
    
    // 创建新连接
    const ws = new WebSocketService(url);
    this.sharedConnections.set(baseUrl, {
      ws,
      refCount: 1,
      messageTypes: new Set()
    });
    
    console.log(`创建新WebSocket共享连接: ${baseUrl}`);
    return ws;
  }

  // 注册消息类型（防止重复发送相同请求）
  public registerPeriodicMessageType(type: string): boolean {
    const connection = WebSocketService.sharedConnections.get(this.url.split('?')[0]);
    if (!connection) return false;
    
    // 如果该类型消息已被注册，返回false
    if (connection.messageTypes.has(type)) return false;
    
    // 注册消息类型
    connection.messageTypes.add(type);
    return true;
  }

  // 释放共享连接
  public static releaseSharedConnection(url: string): void {
    const baseUrl = url.split('?')[0];
    const connection = this.sharedConnections.get(baseUrl);
    
    if (!connection) return;
    
    // 减少引用计数
    connection.refCount--;
    console.log(`释放WebSocket连接: ${baseUrl}, 当前引用数: ${connection.refCount}`);
    
    // 如果没有引用，关闭连接并删除
    if (connection.refCount <= 0) {
      connection.ws.disconnect();
      this.sharedConnections.delete(baseUrl);
      console.log(`关闭WebSocket共享连接: ${baseUrl}`);
    }
  }
} 