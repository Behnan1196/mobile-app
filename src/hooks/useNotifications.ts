import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mobileNotificationService } from '../services/notifications';
import { NotificationLog, NotificationToken } from '../services/notifications';
import * as Notifications from 'expo-notifications';

export interface UseNotificationsReturn {
  // State
  isInitialized: boolean;
  isInChat: boolean;
  tokens: NotificationToken[];
  logs: NotificationLog[];
  permission: Notifications.NotificationPermissionsStatus;
  
  // Actions
  initialize: () => Promise<void>;
  setChatActivity: (isInChat: boolean) => void;
  refreshTokens: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  requestPermission: () => Promise<Notifications.NotificationPermissionsStatus>;
  scheduleLocalNotification: (title: string, body: string, data?: any, seconds?: number) => Promise<string>;
  cancelNotification: (notificationId: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  cleanup: () => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInChat, setIsInChat] = useState(false);
  const [tokens, setTokens] = useState<NotificationToken[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [permission, setPermission] = useState<Notifications.NotificationPermissionsStatus>({
    status: 'undetermined',
    canAskAgain: true,
    expires: 'never',
  });

  const initialize = useCallback(async () => {
    if (!user?.id) {
      console.warn('Cannot initialize notifications: user not authenticated');
      return;
    }

    try {
      // Check current permission status
      const currentPermission = await mobileNotificationService.getPermissionsStatus();
      setPermission(currentPermission);

      // Initialize notification service
      await mobileNotificationService.initialize(user.id);
      setIsInitialized(true);

      // Load initial data
      await Promise.all([
        refreshTokens(),
        refreshLogs(),
      ]);

      console.log('Mobile notifications initialized successfully');
    } catch (error) {
      console.error('Error initializing mobile notifications:', error);
    }
  }, [user?.id]);

  const setChatActivity = useCallback((inChat: boolean) => {
    setIsInChat(inChat);
    mobileNotificationService.setChatActivity(inChat);
  }, []);

  const refreshTokens = useCallback(async () => {
    try {
      const userTokens = await mobileNotificationService.getTokens();
      setTokens(userTokens);
    } catch (error) {
      console.error('Error refreshing tokens:', error);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      const userLogs = await mobileNotificationService.getLogs();
      setLogs(userLogs);
    } catch (error) {
      console.error('Error refreshing logs:', error);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<Notifications.NotificationPermissionsStatus> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      const permissionStatus = await Notifications.getPermissionsAsync();
      setPermission(permissionStatus);
      return permissionStatus;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return {
        status: 'denied',
        canAskAgain: false,
        expires: 'never',
      };
    }
  }, []);

  const scheduleLocalNotification = useCallback(async (
    title: string,
    body: string,
    data?: any,
    seconds: number = 0
  ): Promise<string> => {
    return await mobileNotificationService.scheduleLocalNotification(title, body, data, seconds);
  }, []);

  const cancelNotification = useCallback(async (notificationId: string): Promise<void> => {
    await mobileNotificationService.cancelNotification(notificationId);
  }, []);

  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    await mobileNotificationService.cancelAllNotifications();
  }, []);

  const cleanup = useCallback(() => {
    mobileNotificationService.cleanup();
    setIsInitialized(false);
    setIsInChat(false);
    setTokens([]);
    setLogs([]);
  }, []);

  // Initialize when user changes
  useEffect(() => {
    if (user?.id && !isInitialized) {
      initialize();
    } else if (!user?.id && isInitialized) {
      cleanup();
    }
  }, [user?.id, isInitialized, initialize, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Track app state changes for activity updates
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is in background, user is not actively using the app
        setChatActivity(false);
      }
    };

    // Note: In a real implementation, you would use AppState from react-native
    // import { AppState } from 'react-native';
    // const subscription = AppState.addEventListener('change', handleAppStateChange);
    // return () => subscription?.remove();

    // For now, we'll just return a cleanup function
    return () => {};
  }, [setChatActivity]);

  return {
    isInitialized,
    isInChat,
    tokens,
    logs,
    permission,
    initialize,
    setChatActivity,
    refreshTokens,
    refreshLogs,
    requestPermission,
    scheduleLocalNotification,
    cancelNotification,
    cancelAllNotifications,
    cleanup,
  };
};
