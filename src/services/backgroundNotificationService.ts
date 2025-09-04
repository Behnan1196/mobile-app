import { streamChatService } from './streamChat';
import { mobileNotificationService } from './notifications';
import { User } from '../types';

export class BackgroundNotificationService {
  private static instance: BackgroundNotificationService;
  private isInitialized = false;
  private currentUser: User | null = null;
  private currentPartner: User | null = null;

  private constructor() {}

  public static getInstance(): BackgroundNotificationService {
    if (!BackgroundNotificationService.instance) {
      BackgroundNotificationService.instance = new BackgroundNotificationService();
    }
    return BackgroundNotificationService.instance;
  }

  /**
   * Initialize background notifications for a user
   * This establishes Stream connection for notifications without entering chat
   */
  async initialize(user: User, partner: User): Promise<void> {
    if (this.isInitialized && this.currentUser?.id === user.id) {
      console.log('🔄 Background notification service already initialized for this user');
      return;
    }

    try {
      console.log('🚀 Initializing background notification service...');
      console.log('👤 User:', user.name, user.role);
      console.log('🤝 Partner:', partner.name, partner.role);
      
      this.currentUser = user;
      this.currentPartner = partner;

      // Initialize Stream Chat for notifications only
      await streamChatService.initialize(user);
      
      // Get the chat channel for notifications
      // Determine student and coach IDs based on roles
      const studentId = user.role === 'student' ? user.id : partner.id;
      const coachId = user.role === 'coach' ? user.id : partner.id;
      const channel = await streamChatService.getOrCreateChannel(studentId, coachId);
      
      if (channel) {
        // Set up message listeners for notifications
        this.setupNotificationListeners(channel);
        console.log('✅ Background notification service initialized successfully');
        this.isInitialized = true;
      } else {
        console.error('❌ Failed to get channel for background notifications');
      }
    } catch (error) {
      console.error('❌ Error initializing background notification service:', error);
    }
  }

  /**
   * Setup message listeners for background notifications
   */
  private setupNotificationListeners(channel: any): void {
    try {
      console.log('👂 Setting up background notification listeners...');
      console.log('📺 Channel ID:', channel.id);
      console.log('📺 Channel type:', channel.type);
      
      // Listen for new messages
      channel.on('message.new', (event: any) => {
        console.log('📱 Background notification - New message received:', event.message);
        console.log('📱 Message text:', event.message.text);
        console.log('📱 Message user:', event.message.user.name);
        
        // Show local notification if push tokens aren't available
        mobileNotificationService.handleIncomingMessage(event.message, event.message.user);
      });

      // Also listen for any channel events
      channel.on('*', (event: any) => {
        console.log('📱 Background notification - Channel event:', event.type, event);
      });

      console.log('✅ Background notification listeners set up successfully');
      console.log('🔔 Ready to receive notifications!');
    } catch (error) {
      console.error('❌ Error setting up background notification listeners:', error);
    }
  }

  /**
   * Clean up background notification service
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up background notification service...');
      
      if (this.currentUser && this.currentPartner) {
        await streamChatService.disconnect();
      }
      
      this.isInitialized = false;
      this.currentUser = null;
      this.currentPartner = null;
      
      console.log('✅ Background notification service cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up background notification service:', error);
    }
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Test the background notification service
   */
  async testService(): Promise<void> {
    console.log('🧪 Testing background notification service...');
    console.log('📊 Service initialized:', this.isInitialized);
    console.log('👤 Current user:', this.currentUser?.name);
    console.log('🤝 Current partner:', this.currentPartner?.name);
    
    if (this.isInitialized) {
      console.log('✅ Background notification service is ready!');
    } else {
      console.log('❌ Background notification service is not initialized');
    }
  }
}

export const backgroundNotificationService = BackgroundNotificationService.getInstance();
