import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { streamChatService } from '../services/streamChat';
import { User } from '../types';

interface ChatContextType {
  isConnected: boolean;
  currentChannel: any | null;
  messages: any[];
  isLoading: boolean;
  error: string | null;
  connectToChat: (user: User, partner: User) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to chat with assigned partner
  const connectToChat = async (user: User, partner: User) => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize Stream Chat
      await streamChatService.initialize(user);

      // Determine student and coach IDs
      const studentId = user.role === 'student' ? user.id : partner.id;
      const coachId = user.role === 'coach' ? user.id : partner.id;

      // Get or create chat channel
      const channel = await streamChatService.getOrCreateChannel(studentId, coachId);
      setCurrentChannel(channel);

      // Get existing messages
      const existingMessages = await streamChatService.getMessages(channel.id || '');
      setMessages(existingMessages);

      // Set up real-time message listeners
      setupMessageListeners(channel);

      setIsConnected(true);
      console.log('Chat connected successfully');
    } catch (error) {
      console.error('Error connecting to chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to chat');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time message listeners
  const setupMessageListeners = (channel: any) => {
    try {
      // Listen for new messages
      channel.on('message.new', (event: any) => {
        console.log('New message received:', event.message);
        setMessages(prev => [event.message, ...prev]);
      });

      // Listen for message updates
      channel.on('message.updated', (event: any) => {
        console.log('Message updated:', event.message);
        setMessages(prev => 
          prev.map(msg => msg.id === event.message.id ? event.message : msg)
        );
      });

      // Listen for message deletions
      channel.on('message.deleted', (event: any) => {
        console.log('Message deleted:', event.message);
        setMessages(prev => prev.filter(msg => msg.id !== event.message.id));
      });

      // Listen for typing indicators
      channel.on('typing.start', (event: any) => {
        console.log('User started typing:', event.user?.name);
      });

      channel.on('typing.stop', (event: any) => {
        console.log('User stopped typing:', event.user?.name);
      });

      console.log('Real-time message listeners set up successfully');
    } catch (error) {
      console.error('Error setting up message listeners:', error);
    }
  };

  // Send a message
  const sendMessage = async (text: string) => {
    if (!currentChannel || !isConnected) {
      setError('Not connected to chat');
      return;
    }

    try {
      setError(null);
      const message = await streamChatService.sendMessage(currentChannel.id, text);
      
      // Message will be added via real-time listener, so we don't need to add it manually
      console.log('Message sent successfully:', message);
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  // Disconnect from chat
  const disconnect = async () => {
    try {
      if (currentChannel) {
        // Remove event listeners
        currentChannel.off('message.new');
        currentChannel.off('message.updated');
        currentChannel.off('message.deleted');
        currentChannel.off('typing.start');
        currentChannel.off('typing.stop');
      }

      await streamChatService.disconnect();
      setIsConnected(false);
      setCurrentChannel(null);
      setMessages([]);
      setError(null);
      console.log('Chat disconnected');
    } catch (error) {
      console.error('Error disconnecting from chat:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const value: ChatContextType = {
    isConnected,
    currentChannel,
    messages,
    isLoading,
    error,
    connectToChat,
    sendMessage,
    disconnect,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
