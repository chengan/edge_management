export interface WebSocketMessage {
  type: string
  data?: any
}

export type MessageHandler = (message: WebSocketMessage) => void 