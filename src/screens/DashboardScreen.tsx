import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getAssignedPartner } from '../services/assignments';
import { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { User } from '../types';
import { NotificationTest } from '../components/NotificationTest';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [assignedPartner, setAssignedPartner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAssignedPartner();
    }
  }, [user]);

  const loadAssignedPartner = async () => {
    try {
      console.log('Loading assigned partner for user:', user?.id, user?.role);
      setLoading(true);
      const partner = await getAssignedPartner(user!.id, user!.role);
      console.log('Assigned partner result:', partner);
      setAssignedPartner(partner);
    } catch (error) {
      console.error('Error loading assigned partner:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleChatPress = () => {
    if (assignedPartner) {
      navigation.navigate('Chat', { partner: assignedPartner });
    }
  };

  const handleNavigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const getPartnerDisplayText = () => {
    if (loading) return 'Loading...';
    if (!assignedPartner) return 'No partner assigned';
    return `Chat with ${assignedPartner.name}`;
  };

  const getPartnerSubtext = () => {
    if (loading) return 'Please wait...';
    if (!assignedPartner) return 'Contact admin for assignment';
    return user?.role === 'coach' ? 'Your assigned student' : 'Your assigned coach';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.welcomeText}>
          Welcome, {user?.name} ({user?.role})
        </Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={[styles.card, !assignedPartner && styles.cardDisabled]} 
          onPress={handleChatPress}
          disabled={!assignedPartner}
        >
          <Text style={styles.cardTitle}>Chat</Text>
          <Text style={styles.cardSubtitle}>{getPartnerDisplayText()}</Text>
          <Text style={styles.cardDetail}>{getPartnerSubtext()}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={handleNavigateToProfile}>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.cardSubtitle}>Manage your account</Text>
        </TouchableOpacity>

        <NotificationTest />

        {user?.role === 'coach' && (
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardTitle}>Students</Text>
            <Text style={styles.cardSubtitle}>
              {assignedPartner ? `Assigned: ${assignedPartner.name}` : 'No students assigned'}
            </Text>
          </TouchableOpacity>
        )}

        {user?.role === 'student' && (
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardTitle}>My Coach</Text>
            <Text style={styles.cardSubtitle}>
              {assignedPartner ? `Assigned: ${assignedPartner.name}` : 'No coach assigned'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Temporary test button - remove after debugging */}
      <TouchableOpacity 
        style={[styles.signOutButton, { backgroundColor: '#007AFF', marginTop: 10 }]} 
        onPress={() => {
          console.log('Testing assignment query...');
          loadAssignedPartner();
        }}
      >
        <Text style={styles.signOutButtonText}>Test Assignment Query</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  cardDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    margin: 20,
    padding: 15,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
