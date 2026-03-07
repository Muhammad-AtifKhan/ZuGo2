import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

export const requestPermissionAndSaveToken = async (userId: string) => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      const token = await messaging().getToken();

      await firestore()
        .collection('drivers')
        .doc(userId)
        .set(
          { fcmToken: token },
          { merge: true }   // 🔥 safer than update - document exist na kare to create karega
        );

      console.log('✅ FCM Token Saved:', token);
    } else {
      console.log('❌ Notification permission denied');
    }
  } catch (error) {
    console.log('❌ Token Error:', error);
  }
};

export const listenForTokenRefresh = (userId: string) => {
  // ✅ Returns unsubscribe function for proper cleanup
  return messaging().onTokenRefresh(async token => {
    try {
      await firestore()
        .collection('drivers')
        .doc(userId)
        .set(
          { fcmToken: token },
          { merge: true }   // 🔥 safer than update
        );

      console.log('🔄 Token Updated:', token);
    } catch (error) {
      console.log('❌ Token Refresh Error:', error);
    }
  });
};