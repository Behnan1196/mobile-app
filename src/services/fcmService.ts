import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

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
   * Initialize push notifications for the current user
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    try {
      // Request permission for notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        console.log('✅ Push notification permission granted');
        
        // Get push token
        const token = await this.getPushToken();
        if (token) {
          await this.registerToken(token);
          console.log('✅ Push token registered successfully:', token);
        }
      } else {
        console.log('❌ Push notification permission denied');
      }
    } catch (error) {
      console.error('❌ Push notification initialization error:', error);
    }
  }

  /**
   * Get push token
   */
  private async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for push notifications');
        return null;
      }

      // Use Expo push token (works in development and production)
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '0b0622bd-fed2-443c-94c7-49cec61e014f', // From app.json
      });
      console.log('✅ Expo push token obtained:', token.data);
      return token.data;
    } catch (error) {
      console.error('❌ Push token error:', error);
      return null;
    }
  }

  /**
   * Register push token in database
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
          tokenType: 'expo',
        }),
      });

      if (response.ok) {
        console.log('✅ Push token registered in database');
      } else {
        console.error('❌ Failed to register push token:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error registering push token:', error);
    }
  }

  /**
   * Setup message handlers for push notifications
   */
  private setupMessageHandlers(): void {
    // Handle notification received while app is running
    Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Push notification received while app is running:', notification);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Push notification tapped:', response);
    });
  }

  /**
   * Check if push notifications are available
   */
  isAvailable(): boolean {
    return Device.isDevice;
  }
}

export const fcmService = FCMService.getInstance();
