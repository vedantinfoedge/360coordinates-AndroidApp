"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onChatMessageCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Load .env from functions/ if present (BACKEND_URL, BACKEND_FCM_SECRET)
try {
    require("dotenv").config();
}
catch (_a) {
    // dotenv optional; use GCP Runtime env vars if not installed
}
admin.initializeApp();
// =============================================================================
// Chat Push Notifications - Firestore trigger on new message
// Fetches recipient's FCM tokens from PHP backend and sends push notification
// Set env in GCP Console: Cloud Functions → onChatMessageCreated → Edit → Runtime env vars
//   BACKEND_URL = https://360coordinates.com/backend
//   BACKEND_FCM_SECRET = (same as FCM_INTERNAL_SECRET on PHP)
// Or in .env in functions/ (do not commit .env): BACKEND_URL=... BACKEND_FCM_SECRET=...
// =============================================================================
const getBackendConfig = () => ({
    url: (process.env.BACKEND_URL || "").replace(/\/$/, ""),
    fcmSecret: process.env.BACKEND_FCM_SECRET || "",
});
exports.onChatMessageCreated = functions.firestore
    .document("chats/{chatRoomId}/messages/{messageId}")
    .onCreate(async (snap, context) => {
    try {
        const message = snap.data();
        const { chatRoomId } = context.params;
        const senderId = String(message.senderId || "");
        const senderRole = message.senderRole || "buyer";
        const text = String(message.text || "").slice(0, 100);
        if (!senderId || !chatRoomId) {
            console.warn("[onChatMessageCreated] Missing senderId or chatRoomId");
            return;
        }
        // Get chat room to find recipient
        const roomSnap = await admin.firestore()
            .collection("chats")
            .doc(chatRoomId)
            .get();
        const room = roomSnap.data();
        if (!room) {
            console.warn("[onChatMessageCreated] Chat room not found:", chatRoomId);
            return;
        }
        const buyerId = String(room.buyerId || "");
        const receiverId = String(room.receiverId || "");
        const recipientId = senderId === buyerId ? receiverId : buyerId;
        const buyerName = room.buyerName || "Someone";
        if (!recipientId) {
            console.warn("[onChatMessageCreated] Could not determine recipient");
            return;
        }
        // Fetch FCM tokens from PHP backend (BACKEND_URL, BACKEND_FCM_SECRET = X-Internal-Secret)
        const { url: backendUrl, fcmSecret } = getBackendConfig();
        if (!backendUrl || !fcmSecret) {
            console.warn("[onChatMessageCreated] Missing BACKEND_URL or BACKEND_FCM_SECRET env.");
            return;
        }
        const tokensUrl = `${backendUrl}/api/device-token/tokens.php?user_id=${encodeURIComponent(recipientId)}`;
        const res = await fetch(tokensUrl, {
            headers: { "X-Internal-Secret": fcmSecret },
        });
        const data = await res.json();
        const tokens = Array.isArray(data === null || data === void 0 ? void 0 : data.tokens) ? data.tokens : [];
        if (tokens.length === 0) {
            console.log("[onChatMessageCreated] No FCM tokens for recipient:", recipientId);
            return;
        }
        // Build notification
        const title = senderRole === "buyer" ? buyerName : "New reply";
        const body = text || "You have a new message";
        const payload = {
            tokens,
            notification: {
                title,
                body,
            },
            data: {
                type: "chat",
                chatRoomId: String(chatRoomId),
            },
            android: {
                priority: "high",
            },
        };
        const result = await admin.messaging().sendEachForMulticast(payload);
        console.log("[onChatMessageCreated] FCM sent:", result.successCount, "success,", result.failureCount, "failed, recipient:", recipientId);
    }
    catch (error) {
        console.error("[onChatMessageCreated] Error:", error);
    }
});
//# sourceMappingURL=index.js.map