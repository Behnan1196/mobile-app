import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { truePushService } from '../services/truePushService';
import { backgroundNotificationService } from '../services/backgroundNotificationService';

export const NotificationTest: React.FC = () => {
  const handleTestNotification = async () => {
    try {
      await truePushService.scheduleTestNotification();
      console.log('Test notification triggered');
    } catch (error) {
      console.error('Error triggering test notification:', error);
    }
  };

  const handleTestBackgroundService = async () => {
    try {
      await backgroundNotificationService.testService();
    } catch (error) {
      console.error('Error testing background service:', error);
    }
  };

  const handleTestWebhook = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/notifications/test-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test message from mobile app',
          channelId: 'coaching-6dd5528d-83ba38a0',
        }),
      });

      const result = await response.json();
      console.log('Test webhook result:', result);
    } catch (error) {
      console.error('Error testing webhook:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Test</Text>
      <Text style={styles.subtitle}>
        Test if notifications work on this device
      </Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleTestNotification}
      >
        <Text style={styles.buttonText}>Test Notification</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton]} 
        onPress={handleTestBackgroundService}
      >
        <Text style={styles.buttonText}>Test Background Service</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.tertiaryButton]} 
        onPress={handleTestWebhook}
      >
        <Text style={styles.buttonText}>Test Webhook</Text>
      </TouchableOpacity>
      
      <Text style={styles.info}>
        Test notification: schedules in 2 seconds{'\n'}
        Test background service: checks if service is ready{'\n'}
        Test webhook: simulates incoming message
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  tertiaryButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  info: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});
