import React, { useEffect } from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import { ChatProvider } from './src/contexts/ChatContext';
import { NotificationProvider } from './src/components/NotificationProvider';
import AppNavigator from './src/navigation/AppNavigator';
import { fcmService } from './src/services/fcmService';

export default function App() {
  useEffect(() => {
    // Initialize FCM immediately when app starts
    console.log('🚀 App starting - initializing FCM immediately...');
    fcmService.initializeImmediately().catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <ChatProvider>
        <NotificationProvider>
          <AppNavigator />
        </NotificationProvider>
      </ChatProvider>
    </AuthProvider>
  );
}
