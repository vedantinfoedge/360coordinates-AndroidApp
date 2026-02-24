import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// =============================================================================
// Chat Push Notifications - Firestore trigger on new message
// Fetches recipient's FCM tokens from PHP backend and sends push notification
// =============================================================================

const TOKENS_API_BASE = "https://360coordinates.com/backend/api";

export const onChatMessageCreated = functions.firestore
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

            // Fetch FCM tokens from PHP backend
            const tokensUrl = `${TOKENS_API_BASE}/device-token/tokens.php?user_id=${encodeURIComponent(recipientId)}`;
            const res = await fetch(tokensUrl);
            const data = await res.json() as { success?: boolean; tokens?: string[] };
            const tokens = Array.isArray(data?.tokens) ? data.tokens : [];

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
                    priority: "high" as const,
                },
            };

            const result = await admin.messaging().sendEachForMulticast(payload);
            console.log("[onChatMessageCreated] FCM sent:", result.successCount, "success,",
                result.failureCount, "failed, recipient:", recipientId);
        } catch (error) {
            console.error("[onChatMessageCreated] Error:", error);
        }
    });
