import { useState, useEffect, useRef } from 'react'

interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
}

export function useWebSocket(url: string) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = () => {
    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setError(null)
        console.log('WebSocket connected')
      }

      ws.onclose = () => {
        setConnected(false)
        console.log('WebSocket disconnected')
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }

      ws.onerror = (event) => {
        setError('WebSocket connection error')
        console.error('WebSocket error:', event)
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          message.timestamp = Date.now()
          setLastMessage(message)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }
    } catch (err) {
      setError('Failed to create WebSocket connection')
      console.error('WebSocket connection failed:', err)
    }
  }

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [url])

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  return {
    connected,
    error,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect
  }
}
