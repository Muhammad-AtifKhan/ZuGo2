import api from './api';

type DriverNotificationInput = {
  driverId: string;
  title: string;
  message: string;
  type?: string;
  priority?: 'high' | 'medium' | 'low';
  transporterId?: string;
  actionable?: boolean;
  actionType?: string;
  actionId?: string;
  data?: Record<string, any>;
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const sendDriverNotifications = async (items: DriverNotificationInput[]): Promise<void> => {
  if (!items.length) return;

  const chunks = chunk(items, 400);

  for (const part of chunks) {
    const payload = part.map(item => ({
      target: 'driver',
      driverId: item.driverId,
      transporterId: item.transporterId || null,
      title: item.title,
      message: item.message,
      type: item.type || 'system',
      priority: item.priority || 'medium',
      actionable: item.actionable || false,
      actionType: item.actionType || null,
      actionId: item.actionId || null,
      data: item.data || null,
      read: false
    }));

    try {
      await api.post('/notifications', payload);
    } catch (error) {
      console.error('Error sending driver notifications batch:', error);
    }
  }
};
