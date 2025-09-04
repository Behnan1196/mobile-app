import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';

// Register background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('🔥 Background FCM message received:', remoteMessage);
  
  // Handle background notification here
  // This is where you can process the notification when app is closed
  if (remoteMessage.notification) {
    console.log('📱 Background notification:', remoteMessage.notification);
  }
  
  if (remoteMessage.data) {
    console.log('📱 Background data:', remoteMessage.data);
  }
});

AppRegistry.registerComponent(appName, () => App);
