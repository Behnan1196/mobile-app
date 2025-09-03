import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';

interface ChatWithNotificationsProps {
  children: React.ReactNode;
  channelId?: string;
}

/**
 * Wrapper component that automatically tracks chat activity for smart notifications
 * Wrap your chat components with this to enable smart notification filtering
 */
export const ChatWithNotifications: React.FC<ChatWithNotificationsProps> = ({ 
  children, 
  channelId 
}) => {
  const { setChatActivity, isInitialized } = useNotifications();

  // Track when user enters/leaves chat
  useEffect(() => {
    if (!isInitialized) return;

    // Set chat activity to true when component mounts
    setChatActivity(true);

    // Set chat activity to false when component unmounts
    return () => {
      setChatActivity(false);
    };
  }, [setChatActivity, isInitialized, channelId]);

  // Track app state changes for more precise activity tracking
  useEffect(() => {
    if (!isInitialized) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App is in foreground and active
        setChatActivity(true);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is in background or inactive
        setChatActivity(false);
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [setChatActivity, isInitialized]);

  return <>{children}</>;
};
