// src/types/notifications.types.ts
import firestore from '@react-native-firebase/firestore';

export type NotificationType =
  | 'maintenance'
  | 'success'
  | 'warning'
  | 'error'
  | 'emergency'
  | 'payment'
  | 'driver'
  | 'info'
  | 'trip'
  | 'booking';

export type NotificationAction =
  | 'fleet'
  | 'drivers'
  | 'operations'
  | 'reports'
  | 'emergency'
  | 'trip'
  | 'booking'
  | 'none';

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: firestore.Timestamp;
  read: boolean;
  action: NotificationAction;
  actionId?: string;
  transporterId: string;
  userId?: string;
  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
  expiresAt?: firestore.Timestamp;
};

export type NotificationStats = {
  total: number;
  unread: number;
  critical: number;
};