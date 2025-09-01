// Re-export shared types
export * from '../../../shared/types';

// Mobile-specific types can be added here if needed
export interface MobileNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | 'none';
  badge?: number;
}
