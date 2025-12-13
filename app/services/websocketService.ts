/**
 * WebSocket Service
 * =================
 * Manages WebSocket connections for real-time updates
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: Using 'any' for WebSocket message handling as data varies by subscription type

type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;

interface WebSocketConfig {
  url: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxRetries?: number;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private autoReconnect: boolean;
  private reconnectInterval: number;
  private maxRetries: number;
  private retryCount = 0;
  private isConnecting = false;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private onConnectHandlers: Set<ConnectionHandler> = new Set();
  private onDisconnectHandlers: Set<ConnectionHandler> = new Set();
  private onErrorHandlers: Set<MessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: WebSocketConfig) {
    this.url = config.url;
    this.autoReconnect = config.autoReconnect ?? true;
    this.reconnectInterval = config.reconnectInterval ?? 3000;
    this.maxRetries = config.maxRetries ?? 10;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('[WebSocket] Connected:', this.url);
        this.isConnecting = false;
        this.retryCount = 0;
        this.onConnectHandlers.forEach(handler => handler());
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.type || 'message';
          
          // Call specific handlers
          const handlers = this.messageHandlers.get(eventType);
          if (handlers) {
            handlers.forEach(handler => handler(data));
          }
          
          // Call wildcard handlers
          const wildcardHandlers = this.messageHandlers.get('*');
          if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => handler(data));
          }
        } catch (error) {
          console.error('[WebSocket] Parse error:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.isConnecting = false;
        this.onDisconnectHandlers.forEach(handler => handler());
        
        if (this.autoReconnect && this.retryCount < this.maxRetries) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnecting = false;
        this.onErrorHandlers.forEach(handler => handler(error));
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.isConnecting = false;
      
      if (this.autoReconnect && this.retryCount < this.maxRetries) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.retryCount++;
    const delay = this.reconnectInterval * Math.min(this.retryCount, 5);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.autoReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Not connected, cannot send message');
    }
  }

  on(event: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: MessageHandler): void {
    this.messageHandlers.get(event)?.delete(handler);
  }

  onConnect(handler: ConnectionHandler): void {
    this.onConnectHandlers.add(handler);
  }

  onDisconnect(handler: ConnectionHandler): void {
    this.onDisconnectHandlers.add(handler);
  }

  onError(handler: MessageHandler): void {
    this.onErrorHandlers.add(handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (this.isConnecting) return 'connecting';
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }
}

// =======================
// Bot WebSocket Manager
// =======================

class BotWebSocketManager {
  private ws: WebSocketService | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(): void {
    // Use Python backend WebSocket directly
    // In production, you might want to proxy through Next.js API route
    const wsUrl = process.env.NEXT_PUBLIC_BOT_WS_URL || 'ws://localhost:8000/ws';
    
    this.ws = new WebSocketService({
      url: wsUrl,
      autoReconnect: true,
      reconnectInterval: 3000,
      maxRetries: 10,
    });

    // Register message handlers
    this.ws.on('status', (data) => this.emit('status', data));
    this.ws.on('log', (data) => this.emit('log', data));
    this.ws.on('signal', (data) => this.emit('signal', data));
    this.ws.on('position', (data) => this.emit('position', data));
    this.ws.on('trade', (data) => this.emit('trade', data));
    this.ws.on('error', (data) => this.emit('error', data));
    this.ws.on('*', (data) => this.emit('message', data));

    this.ws.connect();
  }

  disconnect(): void {
    this.ws?.disconnect();
    this.ws = null;
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(handler => handler(data));
  }

  subscribe(event: string, handler: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  get isConnected(): boolean {
    return this.ws?.isConnected ?? false;
  }

  get connectionState(): string {
    return this.ws?.connectionState ?? 'disconnected';
  }
}

// =======================
// Binance WebSocket Manager
// =======================

class BinanceWebSocketManager {
  private connections: Map<string, WebSocket> = new Map();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  subscribeKline(symbol: string, interval: string, handler: (data: any) => void): () => void {
    const streamId = `${symbol.toLowerCase()}@kline_${interval}`;
    const key = `kline:${streamId}`;
    
    // Register handler
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler);

    // Create connection if not exists
    if (!this.connections.has(streamId)) {
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streamId}`);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.k) {
            const kline = {
              time: Math.floor(data.k.t / 1000),
              open: parseFloat(data.k.o),
              high: parseFloat(data.k.h),
              low: parseFloat(data.k.l),
              close: parseFloat(data.k.c),
              volume: parseFloat(data.k.v),
              isClosed: data.k.x,
            };
            this.listeners.get(key)?.forEach(h => h(kline));
          }
        } catch (error) {
          console.error('[Binance WS] Parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Binance WS] Error:', error);
      };

      ws.onclose = () => {
        console.log('[Binance WS] Closed:', streamId);
        this.connections.delete(streamId);
      };

      this.connections.set(streamId, ws);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(handler);
      
      // Close connection if no more listeners
      if (this.listeners.get(key)?.size === 0) {
        const ws = this.connections.get(streamId);
        if (ws) {
          ws.close();
          this.connections.delete(streamId);
        }
      }
    };
  }

  subscribeTicker(symbol: string, handler: (data: any) => void): () => void {
    const streamId = `${symbol.toLowerCase()}@miniTicker`;
    const key = `ticker:${streamId}`;
    
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler);

    if (!this.connections.has(streamId)) {
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streamId}`);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const ticker = {
            symbol: data.s,
            price: parseFloat(data.c),
            high: parseFloat(data.h),
            low: parseFloat(data.l),
            volume: parseFloat(data.v),
            quoteVolume: parseFloat(data.q),
          };
          this.listeners.get(key)?.forEach(h => h(ticker));
        } catch (error) {
          console.error('[Binance WS] Parse error:', error);
        }
      };

      this.connections.set(streamId, ws);
    }

    return () => {
      this.listeners.get(key)?.delete(handler);
      if (this.listeners.get(key)?.size === 0) {
        this.connections.get(streamId)?.close();
        this.connections.delete(streamId);
      }
    };
  }

  disconnectAll(): void {
    this.connections.forEach(ws => ws.close());
    this.connections.clear();
    this.listeners.clear();
  }
}

// Singleton instances
export const botWebSocket = new BotWebSocketManager();
export const binanceWebSocket = new BinanceWebSocketManager();

const websocketServices = {
  WebSocketService,
  botWebSocket,
  binanceWebSocket,
};

export default websocketServices;
