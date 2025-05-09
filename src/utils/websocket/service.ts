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
} 