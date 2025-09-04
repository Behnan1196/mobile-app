import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

class FCMService {
  private currentUserId: string | null = null;

  /**
   * Initialize FCM service
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    console.log('🔥 Initializing FCM service for user:', userId);

    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ FCM permission granted');
        await this.getToken();
        this.setupMessageHandlers();
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
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('🔥 Background FCM message received:', remoteMessage);
      // Handle background notification here
    });

    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('🔥 Foreground FCM message received:', remoteMessage);
      // Handle foreground notification here
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