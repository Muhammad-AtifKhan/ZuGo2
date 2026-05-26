import { Request, Response } from 'express';
import prisma from '../lib/prisma';

type NotificationCreateInput = {
  userId?: string | null;
  driverId?: string | null;
  transporterId?: string | null;
  target?: string;
  title?: string;
  message?: string;
  actionId?: string | null;
  isRead?: boolean;
  read?: boolean;
};

const toCreateData = (item: NotificationCreateInput) => ({
  userId: item.userId ?? null,
  driverId: item.driverId ?? null,
  transporterId: item.transporterId ?? null,
  target: item.target ?? 'passenger',
  title: item.title ?? '',
  message: item.message ?? '',
  actionId: item.actionId ?? null,
  isRead: item.isRead ?? item.read ?? false,
});

const formatNotification = (notification: {
  id: string;
  userId: string | null;
  driverId: string | null;
  transporterId: string | null;
  target: string;
  title: string;
  message: string;
  actionId: string | null;
  isRead: boolean;
  createdAt: Date;
}) => ({
  id: notification.id,
  userId: notification.userId,
  driverId: notification.driverId,
  transporterId: notification.transporterId,
  target: notification.target,
  title: notification.title,
  message: notification.message,
  actionId: notification.actionId,
  read: notification.isRead,
  createdAt: notification.createdAt.toISOString(),
});

// Create a new notification
export const createNotification = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (Array.isArray(data)) {
      const created = await prisma.$transaction(
        data.map((item: NotificationCreateInput) =>
          prisma.notification.create({ data: toCreateData(item) }),
        ),
      );

      return res.status(201).json({
        success: true,
        ids: created.map(n => n.id),
      });
    }

    const notification = await prisma.notification.create({
      data: toCreateData(data),
    });

    res.status(201).json(formatNotification(notification));
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const clearNotifications = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    await prisma.notification.deleteMany({
      where: { id: { in: ids } },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { userId, target, tripId } = req.query;

    if (!userId && !tripId) {
      return res.status(400).json({ error: 'Missing userId or tripId' });
    }

    let where: {
      actionId?: string;
      driverId?: string;
      transporterId?: string;
      userId?: string;
      target?: string;
    } = {};

    if (tripId) {
      where = { actionId: String(tripId) };
    } else if (target === 'driver') {
      where = {
        driverId: String(userId),
        target: 'driver',
      };
    } else if (target === 'transporter') {
      where = {
        transporterId: String(userId),
        target: 'transporter',
      };
    } else {
      where = { userId: String(userId) };
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications.map(formatNotification));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
