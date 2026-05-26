// import { Server, Socket } from 'socket.io'; // Uncomment after installing socket.io

export const setupSockets = (io: any) => {
  io.on('connection', (socket: any) => {
    console.log(`New client connected: ${socket.id}`);

    // Driver or Passenger joins a specific trip room
    socket.on('join_trip', (tripId: string) => {
      socket.join(`trip_${tripId}`);
      console.log(`Socket ${socket.id} joined trip room: trip_${tripId}`);
    });

    // Driver emits their live location
    socket.on('driver_location_update', (data: { tripId: string, latitude: number, longitude: number }) => {
      // Broadcast this location to all passengers in the trip room
      io.to(`trip_${data.tripId}`).emit('location_updated', {
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
