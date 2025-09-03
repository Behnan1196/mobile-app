import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface NotificationToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'web' | 'ios' | 'android';
  token_type: 'fcm' | 'expo' | 'apns';
  is_active: boolean;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  status: 'sent' | 'delivered' | 'failed' | 'suppressed';
  platform?: string;
  error_message?: string;
  sent_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  is_in_chat: boolean;
  last_activity: string;
  platform?: string;
  updated_at: string;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class MobileNotificationService {
  private isInChat = false;
  private currentUserId: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  constructor() {
    this.setupNotificationListeners();
  }

  /**
   * Initialize notification service for the current user
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Notification permission denied');
      return;
    }

    // Get push token
    try {
      const token = await this.getPushToken();
      if (token) {
        await this.registerToken(token);
        console.log('Push token registered:', token);
      }
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  }

  /**
   * Get push notification token
   */
  private async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for push notifications');
        return null;
      }

      // Use Expo push token instead of FCM
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '0b0622bd-fed2-443c-94c7-49cec61e014f', // From app.json
      });

      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register notification token for the current user
   */
  async registerToken(token: string): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const tokenType = 'expo';

    const { error } = await supabase
      .from('notification_tokens')
      .upsert({
        user_id: this.currentUserId,
        token,
        platform,
        token_type: tokenType,
        is_active: true,
      }, {
        onConflict: 'user_id,platform'
      });

    if (error) {
      console.error('Error registering notification token:', error);
      throw error;
    }
  }

  /**
   * Update user activity status
   */
  async updateActivity(isInChat: boolean): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    this.isInChat = isInChat;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    const { error } = await supabase
      .from('user_activity')
      .upsert({
        user_id: this.currentUserId,
        is_in_chat: isInChat,
        last_activity: new Date().toISOString(),
        platform,
      }, {
        onConflict: 'user_id,platform'
      });

    if (error) {
      console.error('Error updating user activity:', error);
    }
  }

  /**
   * Set chat activity status
   */
  setChatActivity(isInChat: boolean): void {
    this.updateActivity(isInChat);
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    // Listen for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      
      // Handle notification received while app is in foreground
      // You can customize the behavior here
    });

    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      const data = response.notification.request.content.data;
      
      // Handle navigation based on notification data
      if (data?.type === 'chat_message' && data?.channelId) {
        // Navigate to chat screen with specific channel
        // This would be handled by your navigation system
        console.log('Navigate to chat:', data.channelId);
      }
    });
  }

  /**
   * Log notification delivery
   */
  async logNotification(
    type: string,
    title: string,
    body: string,
    status: 'sent' | 'delivered' | 'failed' | 'suppressed',
    platform?: string,
    errorMessage?: string
  ): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    const { error } = await supabase
      .from('notification_logs')
      .insert({
        user_id: this.currentUserId,
        type,
        title,
        body,
        status,
        platform: platform || Platform.OS,
        error_message: errorMessage,
      });

    if (error) {
      console.error('Error logging notification:', error);
    }
  }

  /**
   * Get user's notification tokens
   */
  async getTokens(): Promise<NotificationToken[]> {
    if (!this.currentUserId) {
      return [];
    }

    const { data, error } = await supabase
      .from('notification_tokens')
      .select('*')
      .eq('user_id', this.currentUserId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching notification tokens:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get user's notification logs
   */
  async getLogs(limit = 50): Promise<NotificationLog[]> {
    if (!this.currentUserId) {
      return [];
    }

    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('user_id', this.currentUserId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notification logs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if user is currently in chat
   */
  isUserInChat(): boolean {
    return this.isInChat;
  }

  /**
   * Schedule a local notification (for testing or specific use cases)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    seconds: number = 0
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: seconds > 0 ? { seconds } : null,
    });

    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get notification permissions status
   */
  async getPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
    
    this.currentUserId = null;
    this.isInChat = false;
  }
}

// Export singleton instance
export const mobileNotificationService = new MobileNotificationService();
