"use strict";
// import { Server, Socket } from 'socket.io'; // Uncomment after installing socket.io
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSockets = void 0;
const setupSockets = (io) => {
    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);
        // Driver or Passenger joins a specific trip room
        socket.on('join_trip', (tripId) => {
            socket.join(`trip_${tripId}`);
            console.log(`Socket ${socket.id} joined trip room: trip_${tripId}`);
        });
        // Driver emits their live location
        socket.on('driver_location_update', (data) => {
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
exports.setupSockets = setupSockets;
