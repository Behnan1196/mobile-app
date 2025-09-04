#!/bin/bash

echo "🚀 Building EAS Preview for Push Notifications..."
echo "This build will support push notifications when app is closed"
echo ""

# Build for Android
echo "📱 Building Android preview..."
eas build --platform android --profile preview

echo ""
echo "✅ Build complete!"
echo "📱 Install the APK on your Android device"
echo "🔔 Test notifications when app is completely closed"
echo ""
echo "To test:"
echo "1. Install the APK on your device"
echo "2. Login to the app"
echo "3. Close the app completely (swipe away from recent apps)"
echo "4. Send a message from the web app"
echo "5. You should receive a push notification!"
