import React from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import { ChatProvider } from './src/contexts/ChatContext';
import { NotificationProvider } from './src/components/NotificationProvider';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
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
