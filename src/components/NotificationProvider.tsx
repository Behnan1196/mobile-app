import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { initialize } = useNotifications();

  useEffect(() => {
    if (user?.id) {
      console.log('Initializing mobile notifications for user:', user.id);
      initialize().catch((error) => {
        console.error('Failed to initialize mobile notifications:', error);
      });
    }
  }, [user?.id, initialize]);

  return <>{children}</>;
};

