import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
})
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarketGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: any) {
    const commodity = String(payload?.commodity || '').toLowerCase();
    if (!commodity) {
      client.emit('subscribed', { ok: false, reason: 'commodity required' });
      return;
    }
    const room = `crop:${commodity}`;
    client.join(room);
    client.emit('subscribed', { ok: true, room });
    this.logger.log(`Client ${client.id} joined room ${room}`);
  }

  // used by MarketService
  broadcastMarketUpdates(diffs: any[], commodity?: string) {
    try {
      if (commodity) {
        this.server
          .to(`crop:${commodity.toLowerCase()}`)
          .emit('market-updates', diffs);
      } else {
        this.server.emit('market-updates', diffs);
      }
    } catch (err) {
      this.logger.warn('Failed to broadcast updates: ' + (err?.message || err));
    }
  }
}
