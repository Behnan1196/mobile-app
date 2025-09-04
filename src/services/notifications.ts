import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { truePushService } from './truePushService';

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
    // Create notification channels immediately when service is created
    this.initializeChannels();
    // Request permissions immediately
    this.requestPermissions();
    // Initialize the service immediately (don't wait for user)
    this.initializeService();
  }

  /**
   * Initialize the notification service immediately (without user)
   */
  private initializeService(): void {
    console.log('🚀 Initializing notification service immediately...');
    // The service is ready to handle notifications as soon as it's created
    // Channels and permissions are already set up in constructor
    console.log('✅ Notification service ready for immediate use');
  }

  /**
   * Initialize notification service for the current user
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    // Always create notification channels first (even before permissions)
    await this.createNotificationChannels();
    
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

    // Use FCM for real push notifications
    console.log('🚀 Initializing FCM push notifications...');
    try {
      const { fcmService } = await import('./fcmService');
      await fcmService.initialize(userId);
      console.log('✅ FCM push notifications initialized');
    } catch (error) {
      console.log('⚠️ FCM initialization failed, using local notifications:', error);
      
      // Fallback to basic push tokens
      try {
        const token = await this.getPushToken();
        if (token) {
          await this.registerToken(token);
          console.log('✅ Fallback push token registered successfully:', token);
        } else {
          console.log('⚠️ Using local notifications (push tokens not available)');
        }
      } catch (fallbackError) {
        console.log('⚠️ Using local notifications (push token error):', fallbackError);
      }
    }

    console.log('Mobile notifications initialized successfully');
  }

  /**
   * Initialize notification channels immediately (synchronous)
   */
  private initializeChannels(): void {
    if (Platform.OS === 'android') {
      console.log('🔧 Creating notification channels immediately...');
      // Create channels immediately without waiting
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      }).catch(console.error);

      Notifications.setNotificationChannelAsync('chat', {
        name: 'Chat Messages',
        description: 'Notifications for new chat messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      }).catch(console.error);

      Notifications.setNotificationChannelAsync('general', {
        name: 'General',
        description: 'General app notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      }).catch(console.error);
    }
  }

  /**
   * Request notification permissions immediately (synchronous)
   */
  private requestPermissions(): void {
    console.log('🔐 Requesting notification permissions immediately...');
    Notifications.getPermissionsAsync().then(({ status }) => {
      console.log('🔐 Current permission status:', status);
      if (status !== 'granted') {
        console.log('🔐 Requesting notification permissions...');
        return Notifications.requestPermissionsAsync();
      }
      console.log('🔐 Notification permissions already granted');
      return { status };
    }).then(({ status }) => {
      console.log('🔐 Final permission status:', status);
      if (status === 'granted') {
        console.log('✅ Notification permissions granted');
      } else {
        console.warn('❌ Notification permissions denied');
      }
    }).catch((error) => {
      console.error('🔐 Error requesting permissions:', error);
    });
  }

  /**
   * Create notification channels for Android
   */
  private async createNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      // Create default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      // Create chat channel
      await Notifications.setNotificationChannelAsync('chat', {
        name: 'Chat Messages',
        description: 'Notifications for new chat messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      // Create general channel
      await Notifications.setNotificationChannelAsync('general', {
        name: 'General',
        description: 'General app notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
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

      // Use Expo push token (works in development and production)
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: '0b0622bd-fed2-443c-94c7-49cec61e014f', // From app.json
        });
        console.log('✅ Expo push token obtained:', token.data);
        return token.data;
      } catch (expoError) {
        console.log('❌ Expo push token failed:', expoError);
        return null;
      }
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
   * Handle incoming chat message (for local notifications when push tokens fail)
   */
  async handleIncomingMessage(message: any, sender: any): Promise<void> {
    console.log('🔔 handleIncomingMessage called, isInChat:', this.isInChat);
    
    // Only show local notification if user is not in chat
    if (this.isInChat) {
      console.log('🔔 User is in chat, skipping notification');
      return;
    }

    // Check if we have notification permissions
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('🔔 No notification permissions, requesting...');
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        console.warn('🔔 Notification permissions denied, cannot show notification');
        return;
      }
    }

    console.log('🔔 User not in chat, showing local notification');
    try {
      await this.scheduleLocalNotification(
        `New message from ${sender.name}`,
        message.text.length > 100 ? message.text.substring(0, 100) + '...' : message.text,
        {
          channelId: message.cid,
          messageId: message.id,
          senderId: sender.id,
          type: 'chat_message'
        },
        0, // Show immediately
        'chat'
      );
      console.log('🔔 Local notification scheduled successfully');
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
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
    seconds: number = 0,
    channelId: string = 'default'
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId }),
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
