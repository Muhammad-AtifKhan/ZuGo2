import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';
import auth from '@react-native-firebase/auth';

class SocketService {
  private socket: Socket | null = null;
  private backendUrl: string;

  constructor() {
    // Determine the base URL without the /api path
    this.backendUrl = API_URL.replace(/\/api$/, '');
  }

  public async connect(): Promise<Socket | null> {
    if (this.socket?.connected) {
      return this.socket;
    }

    try {
      const currentUser = auth().currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      if (!token) {
        console.warn('SocketConnection: No Firebase user found. Cannot authenticate socket.');
        return null;
      }

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

      this.socket.on('disconnect', (reason) => {
        console.log('⚠️ Socket disconnected:', reason);
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
