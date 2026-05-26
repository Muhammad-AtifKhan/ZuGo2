import { io, Socket } from 'socket.io-client';
import { supabase } from '../config/supabase';

const API_URL = 'http://localhost:5000/api';

class SocketService {
  private socket: Socket | null = null;
  private backendUrl: string;

  constructor() {
    this.backendUrl = API_URL.replace(/\/api$/, '');
  }

  public async connect(): Promise<Socket | null> {
    if (this.socket?.connected) {
      return this.socket;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('SocketConnection: No session found. Cannot authenticate socket.');
        return null;
      }

      const token = session.access_token;

      this.socket = io(this.backendUrl, {
        auth: {
          token
        },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket?.id);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
      });

      return this.socket;
    } catch (error) {
      console.error('Error connecting to socket:', error);
      return null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();
