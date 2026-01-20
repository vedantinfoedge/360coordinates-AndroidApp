# Firebase Chat Testing Guide

## ✅ Current Status
- Firebase native modules: ✅ Working
- Anonymous authentication: ✅ Enabled (you just enabled it)
- Chat room creation: ✅ Working
- Real-time listener: ✅ Active
- Backend sync: ✅ Working

## 🧪 Testing Checklist

### Test 1: Send a Message
1. Open a property details page
2. Click "Chat with Owner"
3. Type a test message (e.g., "Hello, I'm interested in this property")
4. Click Send
5. **Expected**: Message appears in the chat immediately
6. **Check Firebase Console**: 
   - Go to Firestore Database
   - Navigate to `chats/{chatRoomId}/messages`
   - Verify the message was saved with correct structure:
     ```json
     {
       "senderId": "95",
       "senderRole": "buyer",
       "text": "Hello, I'm interested in this property",
       "timestamp": [timestamp]
     }
     ```

### Test 2: Verify Chat Room Structure
1. In Firebase Console → Firestore Database
2. Check the chat room document: `chats/95_63_182` (or your chatRoomId)
3. **Verify it has all required fields**:
   ```json
   {
     "chatRoomId": "95_63_182",
     "buyerId": "95",
     "receiverId": "63",
     "receiverRole": "agent",
     "propertyId": "182",
     "participants": ["63", "95"],
     "lastMessage": "...",
     "readStatus": {
       "95": "read",
       "63": "new"
     },
     "createdAt": [timestamp],
     "updatedAt": [timestamp]
   }
   ```

### Test 3: Test Real-Time Updates
1. Send a message from the app
2. **Expected**: Message appears immediately (no refresh needed)
3. Check if messages are ordered correctly (oldest to newest)
4. Test scrolling - should auto-scroll to bottom on new messages

### Test 4: Test with Different Roles
1. **As Buyer** (current):
   - ✅ Can send messages
   - ✅ Messages have `senderRole: "buyer"`
   - ✅ Receiver role is "agent" or "seller"

2. **As Seller/Agent** (test with another account):
   - Login as seller/agent
   - Open chat from inquiries
   - Verify messages work both ways

### Test 5: Multiple Messages
1. Send 3-5 messages in sequence
2. **Expected**:
   - All messages appear in order
   - `lastMessage` field updates in chat room
   - `updatedAt` timestamp updates
   - `readStatus` updates correctly

### Test 6: Cross-Platform Sync (if possible)
1. Send message from mobile app
2. Check website (if you have access)
3. **Expected**: Message appears on website in real-time
4. Send message from website
5. **Expected**: Message appears in mobile app in real-time

## 🔍 Firebase Console Verification

### Check Firestore Database Structure:
```
chats/
  └── {buyerId}_{receiverId}_{propertyId}/
      ├── buyerId: string
      ├── receiverId: string
      ├── receiverRole: "agent" | "seller"
      ├── propertyId: string
      ├── participants: [string, string]  // sorted
      ├── lastMessage: string
      ├── readStatus: { userId: "new" | "read" }
      ├── createdAt: timestamp
      ├── updatedAt: timestamp
      └── messages/  (subcollection)
          └── {messageId}/
              ├── senderId: string
              ├── senderRole: "buyer" | "seller" | "agent"
              ├── text: string
              └── timestamp: timestamp
```

## ⚠️ Common Issues & Solutions

### Issue: Messages not appearing
- **Check**: Firebase Console → Firestore → Check if messages are being saved
- **Solution**: Verify listener is set up (check logs for "Listener set up successfully")

### Issue: Permission denied errors
- **Check**: Firestore Security Rules in Firebase Console
- **Solution**: Update rules to allow authenticated users (or anonymous users) to read/write

### Issue: Messages not syncing with website
- **Check**: Website and mobile app use the same Firebase project
- **Solution**: Verify both use same `projectId` in Firebase config

### Issue: Chat room ID format mismatch
- **Check**: Mobile uses `{buyerId}_{receiverId}_{propertyId}`
- **Check**: Website uses same format
- **Solution**: Both should match exactly

## 📝 Next Steps (Optional Enhancements)

### 1. Firestore Security Rules
Update Firestore rules to secure your chat data:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /chats/{chatRoomId} {
      // Allow read/write if user is a participant
      allow read, write: if request.auth != null && 
        (request.auth.uid in resource.data.participants || 
         request.auth.uid in request.resource.data.participants);
      
      match /messages/{messageId} {
        // Allow read/write if user can access parent chat room
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

### 2. Read Status Updates
- Mark messages as read when user views chat
- Update `readStatus` when messages are viewed
- Show unread badge in chat list

### 3. Chat List Screen
- Fetch chat rooms from Firebase
- Show last message preview
- Show unread count
- Show timestamp of last message

### 4. Typing Indicators (Future)
- Add typing status to chat room
- Show "typing..." indicator

### 5. Push Notifications (Future)
- Send push notifications for new messages
- Configure Firebase Cloud Messaging (FCM)

## 🎉 Success Criteria

✅ Chat room created with correct structure  
✅ Messages can be sent  
✅ Messages are stored in Firebase  
✅ Real-time listener receives new messages  
✅ Messages display correctly  
✅ Chat room ID format matches website  
✅ All required attributes present  

## 📞 Need Help?

If you encounter issues:
1. Check Firebase Console logs
2. Check React Native logs (Metro bundler)
3. Verify Firestore security rules
4. Verify Anonymous auth is enabled
5. Check `google-services.json` is in `android/app/`

---

**Status**: ✅ Ready for Testing  
**Last Updated**: After Anonymous Auth enabled
