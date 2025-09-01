import { StreamChat } from 'stream-chat';
import { supabase } from './supabase';
import { User } from '../types';

const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY!;
const API_URL = process.env.EXPO_PUBLIC_API_URL!;

class StreamChatService {
  private client: StreamChat | null = null;
  private currentUser: User | null = null;

  // Get user token from server
  private async getUserToken(user: User): Promise<string> {
    try {
      console.log('🔑 Requesting Stream token for user:', user.name);
      console.log('🌐 API URL:', API_URL);
      
      const response = await fetch(`${API_URL}/api/stream-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
        }),
      });

      console.log('📡 Token response status:', response.status);
      console.log('📡 Token response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token request failed:', errorText);
        throw new Error(`Failed to get token: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Token received successfully');
      return data.token;
    } catch (error) {
      console.error('❌ Error getting user token:', error);
      throw new Error(`Failed to get authentication token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Initialize Stream Chat client
  async initialize(user: User) {
    try {
      console.log('🚀 Initializing Stream Chat for user:', user.name);
      console.log('🔑 Stream API Key:', STREAM_API_KEY ? 'Present' : 'Missing');
      console.log('🌐 API URL:', API_URL);
      
      this.currentUser = user;
      
      // Create Stream Chat client
      this.client = StreamChat.getInstance(STREAM_API_KEY);
      console.log('📱 Stream Chat client created');
      
      // Get user token from server
      const token = await this.getUserToken(user);
      console.log('🔑 Token obtained, connecting user...');
      
      // Connect user to Stream
      await this.client.connectUser(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        } as any, // Type assertion to avoid TypeScript issues
        token
      );

      console.log('✅ Stream Chat connected successfully for user:', user.name);
      return this.client;
    } catch (error) {
      console.error('❌ Error initializing Stream Chat:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        user: user.name,
        apiKey: STREAM_API_KEY ? 'Present' : 'Missing',
        apiUrl: API_URL
      });
      throw error;
    }
  }

  // Get or create a chat channel between student and coach
  async getOrCreateChannel(studentId: string, coachId: string) {
    if (!this.client) {
      throw new Error('Stream Chat client not initialized');
    }

    try {
      // Create a shorter channel ID (truncate UUIDs to fit 64 char limit)
      // Format: coaching-{first8chars}-{first8chars}
      const shortStudentId = studentId.substring(0, 8);
      const shortCoachId = coachId.substring(0, 8);
      const channelId = `coaching-${shortStudentId}-${shortCoachId}`;
      
      console.log('Creating channel with ID:', channelId);
      console.log('Original IDs - Student:', studentId, 'Coach:', coachId);
      
      // Try to get existing channel
      let channel = this.client.channel('messaging', channelId, {
        members: [studentId, coachId],
      } as any); // Type assertion to avoid TypeScript issues

      // Create the channel if it doesn't exist
      await channel.create();
      
      console.log('Chat channel created/retrieved:', channelId);
      return channel;
    } catch (error) {
      console.error('Error getting/creating chat channel:', error);
      throw error;
    }
  }

  // Get chat messages for a channel
  async getMessages(channelId: string, limit: number = 50) {
    if (!this.client) {
      throw new Error('Stream Chat client not initialized');
    }

    try {
      const channel = this.client.channel('messaging', channelId);
      
      // Use the correct Stream.io method to get messages
      // First, watch the channel to make it active
      await channel.watch();
      
      // Then get messages using the messages property
      const messages = channel.state.messages || [];
      
      console.log(`Retrieved ${messages.length} messages from channel:`, channelId);
      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  // Send a message to a channel
  async sendMessage(channelId: string, text: string) {
    if (!this.client) {
      throw new Error('Stream Chat client not initialized');
    }

    try {
      const channel = this.client.channel('messaging', channelId);
      const response = await channel.sendMessage({
        text,
      });
      return response.message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Disconnect user
  async disconnect() {
    if (this.client) {
      await this.client.disconnectUser();
      this.client = null;
      this.currentUser = null;
      console.log('Stream Chat disconnected');
    }
  }

  // Get current client
  getClient() {
    return this.client;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }
}

export const streamChatService = new StreamChatService();
