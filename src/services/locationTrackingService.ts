// Location tracking via Socket.IO — no Firestore needed

import BackgroundService from 'react-native-background-actions';
import Geolocation from '@react-native-community/geolocation';
import { Platform } from 'react-native';
import SocketService from './socket';

const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(resolve, time));

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

class LocationTrackingService {
  private isTracking = false;
  private driverId: string | null = null;
  private tripId: string | null = null;

  private getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date(),
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: Platform.OS === 'ios', timeout: 30000, maximumAge: 10000 }
      );
    });
  }

  private backgroundTrackingTask = async (taskDataArguments: any) => {
    const { delay } = taskDataArguments;

    // Connect to socket before starting the loop
    const socket = await SocketService.connect();

    await new Promise(async (resolve) => {
      while (BackgroundService.isRunning() && this.isTracking) {
        try {
          if (this.driverId) {
            const location = await this.getCurrentLocation();
            
            // Emit precisely to the socket server
            if (socket?.connected && this.tripId) {
              socket.emit('driver_location_update', {
                tripId: this.tripId,
                driverId: this.driverId,
                latitude: location.latitude,
                longitude: location.longitude,
                timestamp: new Date().toISOString()
              });
              console.log('✅ Background location emitted via socket');
            } else {
              console.log('⚠️ Socket not connected or tripId missing, skipping emission');
            }
          }
        } catch (error) {
          console.error('Background location error:', error);
        }
        await sleep(delay);
      }
      resolve(undefined);
    });
  };

  public async startTracking(driverId: string, tripId: string | null = null) {
    if (this.isTracking || BackgroundService.isRunning()) {
      return;
    }

    this.driverId = driverId;
    this.tripId = tripId;
    this.isTracking = true;

    try {
      const options = {
        taskName: 'DriverLocationTracking',
        taskTitle: 'ZuGo Active Duty',
        taskDesc: 'Tracking background location for your duty',
        taskIcon: {
          name: 'ic_launcher',
          type: 'mipmap',
        },
        color: '#4CAF50',
        linkingURI: 'zugo://trip',
        parameters: { delay: 5000 }, // 5 seconds strictly
      };

      await BackgroundService.start(this.backgroundTrackingTask, options);
    } catch (error) {
      console.error('Failed to start centralized location tracking:', error);
      this.isTracking = false;
    }
  }

  public async stopTracking() {
    this.isTracking = false;
    this.driverId = null;
    this.tripId = null;
    
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
    }
  }

  public isCurrentlyTracking() {
    return this.isTracking;
  }
}

export default new LocationTrackingService();
