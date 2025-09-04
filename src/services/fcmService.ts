import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

class FCMService {
  private currentUserId: string | null = null;
  private isInitialized = false;

  /**
   * Initialize FCM service immediately (without user)
   */
  async initializeImmediately(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔥 FCM already initialized');
      return;
    }

    console.log('🔥 Initializing FCM service immediately...');

    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ FCM permission granted');
        this.setupMessageHandlers();
        this.isInitialized = true;
        console.log('✅ FCM service ready for immediate use');
      } else {
        console.log('❌ FCM permission denied');
      }
    } catch (error) {
      console.error('❌ FCM initialization error:', error);
    }
  }

  /**
   * Initialize FCM service for specific user
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    console.log('🔥 Initializing FCM service for user:', userId);

    // Initialize immediately if not done yet
    if (!this.isInitialized) {
      await this.initializeImmediately();
    }

    try {
      // Get and register token for this user
      await this.getToken();
    } catch (error) {
      console.error('❌ FCM user initialization error:', error);
    }
  }

  /**
   * Get FCM token
   */
  private async getToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for FCM');
        return null;
      }

      const token = await messaging().getToken();
      console.log('🔥 FCM token obtained:', token);
      
      if (token) {
        await this.registerToken(token);
      }
      
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
      console.error('❌ No user ID for FCM token registration');
      return;
    }

    const tokenData = {
      userId: this.currentUserId,
      token: token,
      platform: Platform.OS,
      tokenType: 'fcm', // Use FCM for real push notifications
    };

    console.log('🔥 Registering FCM token:', tokenData);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenData),
      });

      if (response.ok) {
        console.log('✅ FCM token registered in database');
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to register FCM token:', errorText);
      }
    } catch (error) {
      console.error('❌ Error registering FCM token:', error);
    }
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('🔥 Foreground FCM message received:', remoteMessage);
      
      // Show local notification when app is in foreground
      if (remoteMessage.notification) {
        console.log('📱 Showing foreground notification:', remoteMessage.notification);
        // The notification will be shown automatically by FCM
      }
    });

    // Handle notification opened app
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('🔥 Notification opened app:', remoteMessage);
      
      // Handle navigation based on notification data
      if (remoteMessage.data) {
        console.log('📱 Notification data:', remoteMessage.data);
        // Navigate to appropriate screen based on data
      }
    });

    // Handle notification when app is opened
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('🔥 Notification caused app to open:', remoteMessage);
          
          // Handle navigation based on notification data
          if (remoteMessage.data) {
            console.log('📱 Initial notification data:', remoteMessage.data);
            // Navigate to appropriate screen based on data
          }
        }
      });
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.currentUserId = null;
    console.log('🔥 FCM service cleaned up');
  }
}

export const fcmService = new FCMService();