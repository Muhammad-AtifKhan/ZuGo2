import auth from '@react-native-firebase/auth';

/** Sign out only when a Firebase session exists (avoids auth/no-current-user). */
export async function safeSignOut(): Promise<void> {
  if (auth().currentUser) {
    await auth().signOut();
  }
}
