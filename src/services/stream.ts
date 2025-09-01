import { StreamChat } from 'stream-chat';

const streamApiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

if (!streamApiKey) {
  throw new Error('Missing Stream.io API key');
}

export const createStreamClient = (userId: string, userName: string) => {
  const client = StreamChat.getInstance(streamApiKey);
  
  return client.connectUser(
    {
      id: userId,
      name: userName,
    },
    client.devToken(userId)
  );
};
