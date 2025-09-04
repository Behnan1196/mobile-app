import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

class APNsService {
  private currentUserId: string | null = null;

  /**
   * Initialize APNs service for iOS
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    console.log('🍎 Initializing APNs service for user:', userId);

    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ APNs permission granted');
        await this.getToken();
        this.setupMessageHandlers();
      } else {
        console.log('❌ APNs permission denied');
      }
    } catch (error) {
      console.error('❌ APNs initialization error:', error);
    }
  }

  /**
   * Get APNs token
   */
  private async getToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for APNs');
        return null;
      }

      const token = await messaging().getToken();
      console.log('🍎 APNs token obtained:', token);
      
      if (token) {
        await this.registerToken(token);
      }
      
      return token;
    } catch (error) {
      console.error('❌ APNs token error:', error);
      return null;
    }
  }

  /**
   * Register APNs token in database
   */
  private async registerToken(token: string): Promise<void> {
    if (!this.currentUserId) {
      console.error('❌ No user ID for APNs token registration');
      return;
    }

    const tokenData = {
      userId: this.currentUserId,
      token: token,
      platform: Platform.OS,
      tokenType: 'apns', // Use APNs for iOS push notifications
    };

    console.log('🍎 Registering APNs token:', tokenData);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenData),
      });

      if (response.ok) {
        console.log('✅ APNs token registered in database');
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to register APNs token:', errorText);
      }
    } catch (error) {
      console.error('❌ Error registering APNs token:', error);
    }
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('🍎 Background APNs message received:', remoteMessage);
      // Handle background notification here
    });

    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('🍎 Foreground APNs message received:', remoteMessage);
      // Handle foreground notification here
    });
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.currentUserId = null;
    console.log('🍎 APNs service cleaned up');
  }
}

export const apnsService = new APNsService();
