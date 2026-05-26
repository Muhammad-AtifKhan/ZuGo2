import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';

export const createHighPriorityChannel = async () => {
  // Check and create channel on Android
  return await notifee.createChannel({
    id: 'zugo-high-priority',
    name: 'ZuGo High Priority',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
  });
};

export const displayHeadsUpNotification = async (remoteMessage: any) => {
  const channelId = await createHighPriorityChannel();

  const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'New Notification';
  const body = remoteMessage.notification?.body || remoteMessage.data?.message || 'Tap to view details';

  await notifee.displayNotification({
    title,
    body,
    data: remoteMessage.data,
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
      // Ensure popup even when locked
      fullScreenAction: {
        id: 'default',
        launchActivity: 'default',
      },
    },
  });
};

// Start listening for background messages
export const setupBackgroundMessageHandler = () => {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
    await displayHeadsUpNotification(remoteMessage);
  });
};

// Start listening for foreground messages
export const setupForegroundMessageHandler = () => {
  return messaging().onMessage(async remoteMessage => {
    console.log('Message handled in the foreground!', remoteMessage);
    await displayHeadsUpNotification(remoteMessage);
  });
};
