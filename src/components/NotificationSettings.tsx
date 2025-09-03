import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationSettingsProps {
  style?: any;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ style }) => {
  const {
    isInitialized,
    permission,
    tokens,
    logs,
    requestPermission,
    refreshTokens,
    refreshLogs,
    scheduleLocalNotification,
    cancelAllNotifications,
  } = useNotifications();

  const [isLoading, setIsLoading] = useState(false);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      await requestPermission();
      await refreshTokens();
    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request notification permission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await scheduleLocalNotification(
        'Test Notification',
        'This is a test notification from your coaching app',
        { type: 'test' },
        2
      );
      Alert.alert('Success', 'Test notification scheduled for 2 seconds');
    } catch (error) {
      console.error('Error scheduling test notification:', error);
      Alert.alert('Error', 'Failed to schedule test notification');
    }
  };

  const handleClearAllNotifications = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all scheduled notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAllNotifications();
              Alert.alert('Success', 'All notifications cleared');
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  const getPermissionStatusColor = (status: string) => {
    switch (status) {
      case 'granted':
        return '#10B981'; // green
      case 'denied':
        return '#EF4444'; // red
      default:
        return '#F59E0B'; // yellow
    }
  };

  const getPermissionStatusText = (status: string) => {
    switch (status) {
      case 'granted':
        return 'Enabled';
      case 'denied':
        return 'Disabled';
      default:
        return 'Not Set';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return '#10B981';
      case 'delivered':
        return '#3B82F6';
      case 'failed':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  if (!isInitialized) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Initializing notifications...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      {/* Permission Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Permission</Text>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionText}>
              Status: <Text style={[styles.permissionStatus, { color: getPermissionStatusColor(permission.status) }]}>
                {getPermissionStatusText(permission.status)}
              </Text>
            </Text>
            {permission.status === 'undetermined' && (
              <Text style={styles.permissionHint}>
                Tap "Request Permission" to enable notifications
              </Text>
            )}
          </View>
          {permission.status !== 'granted' && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleRequestPermission}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Requesting...' : 'Request Permission'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Test Notifications */}
      {permission.status === 'granted' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Notifications</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleTestNotification}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Send Test
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleClearAllNotifications}
            >
              <Text style={[styles.buttonText, styles.dangerButtonText]}>
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Registered Tokens */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registered Devices</Text>
          <TouchableOpacity onPress={refreshTokens}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        
        {tokens.length === 0 ? (
          <Text style={styles.emptyText}>No devices registered</Text>
        ) : (
          <View style={styles.tokensList}>
            {tokens.map((token) => (
              <View key={token.id} style={styles.tokenItem}>
                <View style={styles.tokenInfo}>
                  <Text style={styles.tokenPlatform}>{token.platform.toUpperCase()}</Text>
                  <Text style={styles.tokenDetails}>
                    {token.token_type.toUpperCase()} • {token.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <Text style={styles.tokenDate}>
                  {new Date(token.created_at || '').toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Notification Logs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Notifications</Text>
          <TouchableOpacity onPress={refreshLogs}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No notifications sent yet</Text>
        ) : (
          <View style={styles.logsList}>
            {logs.slice(0, 10).map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={styles.logContent}>
                  <Text style={styles.logTitle}>{log.title}</Text>
                  <Text style={styles.logBody}>{log.body}</Text>
                  <View style={styles.logTags}>
                    <View style={[styles.statusTag, { backgroundColor: getStatusColor(log.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(log.status) }]}>
                        {log.status}
                      </Text>
                    </View>
                    {log.platform && (
                      <View style={styles.platformTag}>
                        <Text style={styles.platformText}>{log.platform.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.logDate}>
                  {new Date(log.sent_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Smart Filtering Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Smart Notification Filtering</Text>
        <Text style={styles.infoText}>
          Notifications are automatically suppressed when you're actively using the chat. 
          This helps reduce interruptions and improves your experience.
        </Text>
        <View style={styles.infoList}>
          <Text style={styles.infoItem}>• No notifications when you're in the chat screen</Text>
          <Text style={styles.infoItem}>• Notifications resume when you're in other screens or the app is closed</Text>
          <Text style={styles.infoItem}>• All notifications are logged for your review</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 20,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  refreshText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  permissionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  permissionStatus: {
    fontWeight: '500',
  },
  permissionHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  secondaryButtonText: {
    color: '#374151',
  },
  dangerButtonText: {
    color: '#DC2626',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  tokensList: {
    gap: 12,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenPlatform: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textTransform: 'capitalize',
  },
  tokenDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tokenDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  logsList: {
    gap: 12,
    maxHeight: 300,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  logContent: {
    flex: 1,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  logBody: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  logTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  platformTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  platformText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
  },
  logDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 12,
  },
  infoSection: {
    backgroundColor: '#EFF6FF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  infoList: {
    marginTop: 12,
  },
  infoItem: {
    fontSize: 14,
    color: '#1D4ED8',
    lineHeight: 20,
  },
});
