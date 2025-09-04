import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { Notifications } from 'expo-notifications';

export class FCMService {
  private static instance: FCMService;
  private currentUserId: string | null = null;

  private constructor() {
    this.setupMessageHandlers();
  }

  public static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  /**
   * Initialize FCM for the current user
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    try {
      // Request permission for notifications
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ FCM Authorization status:', authStatus);
        
        // Get FCM token
        const token = await this.getFCMToken();
        if (token) {
          await this.registerToken(token);
          console.log('✅ FCM token registered successfully:', token);
        }
      } else {
        console.log('❌ FCM permission denied');
      }
    } catch (error) {
      console.error('❌ FCM initialization error:', error);
    }
  }

  /**
   * Get FCM token
   */
  private async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('✅ FCM token obtained:', token);
      return token;
    } catch (error) {
      console.error('❌ FCM token error:', error);
      return null;
    }
  }

  /**
   * Register FCM token in database
   */
  private async registerToken(token: string): Promise<void> {
    if (!this.currentUserId) {
      console.error('❌ No user ID for token registration');
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.currentUserId,
          token: token,
          platform: Platform.OS,
          tokenType: 'fcm',
        }),
      });

      if (response.ok) {
        console.log('✅ FCM token registered in database');
      } else {
        console.error('❌ Failed to register FCM token:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error registering FCM token:', error);
    }
  }

  /**
   * Setup message handlers for FCM
   */
  private setupMessageHandlers(): void {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📱 FCM background message received:', remoteMessage);
      
      // Show local notification for background messages
      if (remoteMessage.notification) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification.title || 'New Message',
            body: remoteMessage.notification.body || 'You have a new message',
            data: remoteMessage.data,
          },
          trigger: null, // Show immediately
        });
      }
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('📱 FCM foreground message received:', remoteMessage);
      
      // Show local notification for foreground messages
      if (remoteMessage.notification) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification.title || 'New Message',
            body: remoteMessage.notification.body || 'You have a new message',
            data: remoteMessage.data,
          },
          trigger: null, // Show immediately
        });
      }
    });
  }

  /**
   * Check if FCM is available
   */
  isAvailable(): boolean {
    try {
      return messaging().isDeviceRegisteredForRemoteMessages !== undefined;
    } catch {
      return false;
    }
  }
}

export const fcmService = FCMService.getInstance();
