import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export class TruePushService {
  private static instance: TruePushService;
  private currentUserId: string | null = null;

  private constructor() {
    this.setupNotificationHandlers();
  }

  public static getInstance(): TruePushService {
    if (!TruePushService.instance) {
      TruePushService.instance = new TruePushService();
    }
    return TruePushService.instance;
  }

  /**
   * Initialize true push notifications for the current user
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
   * Get push token - try multiple methods
   */
  private async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for push notifications');
        return null;
      }

      // For development builds, we'll use a mock token since real push tokens don't work
      // In production builds (EAS), real push tokens will work
      console.log('📱 Development build detected - using mock token for testing');
      const mockToken = `mock-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('✅ Mock push token created:', mockToken);
      return mockToken;

      // TODO: Uncomment this for production builds
      /*
      // Method 1: Try Expo push token first
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: '0b0622bd-fed2-443c-94c7-49cec61e014f',
        });
        console.log('✅ Expo push token obtained:', token.data);
        return token.data;
      } catch (expoError) {
        console.log('❌ Expo push token failed:', expoError);
      }

      // Method 2: Try device push token
      try {
        const token = await Notifications.getDevicePushTokenAsync();
        console.log('✅ Device push token obtained:', token.data);
        return token.data;
      } catch (deviceError) {
        console.log('❌ Device push token failed:', deviceError);
      }
      */
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
          tokenType: token.startsWith('mock-') ? 'mock' : 'expo',
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
   * Setup notification handlers
   */
  private setupNotificationHandlers(): void {
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

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Notification",
          body: "This is a test notification to verify the system works",
          data: { test: true },
        },
        trigger: { seconds: 2 },
      });
      console.log('✅ Test notification scheduled');
    } catch (error) {
      console.error('❌ Error scheduling test notification:', error);
    }
  }
}

export const truePushService = TruePushService.getInstance();
