/**
 * API configuration — 360coordinates.com backend API
 * Base URL points to /backend/api (JSON API). Site root used for images/uploads.
 */

const API_BASE_URL = 'https://360coordinates.com/backend/api';

export const API_CONFIG = {
  API_BASE_URL,
  BASE_URL: 'https://360coordinates.com',
  UPLOAD_BASE_URL: 'https://360coordinates.com',
  TIMEOUT: 30000,
  MAPBOX_TOKEN: 'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg',
};

export const API_ENDPOINTS = {
  // Auth (AUTH_SCREENS_VERIFICATION_REPORT.md)
  REGISTER: '/auth/register.php',
  LOGIN: '/auth/login.php',
  VERIFY_OTP: '/auth/verify-otp.php',
  RESEND_OTP: '/auth/resend-otp.php',
  FORGOT_PASSWORD: '/auth/forgot-password.php',
  RESET_PASSWORD: '/auth/reset-password.php',
  REFRESH_TOKEN: '/auth/refresh-token.php',
  DELETE_ACCOUNT: '/auth/delete-account.php',
  SWITCH_ROLE: '/auth/switch-role.php',

  // Device token (push)
  DEVICE_TOKEN_REGISTER: '/device-token/register.php',
  DEVICE_TOKEN_UNREGISTER: '/device-token/unregister.php',

  // Properties (propertyService / propertySearchService use these)
  PROPERTY_SEARCH: '/buyer/properties/list.php',
  PROPERTIES_LIST: '/buyer/properties/list.php',
  PROPERTY_DETAILS: '/buyer/properties/details.php',

  // Seller/agent property CRUD (AGENT_DASHBOARD_SYNC_REPORT.md)
  PROPERTY_UPDATE: '/seller/properties/update.php',
  PROPERTY_DELETE: '/seller/properties/delete.php',
  MY_PROPERTIES: '/seller/properties/list.php',
  UPLOAD_IMAGES: '/seller/properties/add.php',
  SELLER_PROPERTIES_ADD: '/seller/properties/add.php',
  SELLER_PROPERTIES_LIST: '/seller/properties/list.php',
  SELLER_PROPERTIES_DELETE: '/seller/properties/delete.php',
  SELLER_PROPERTIES_UPDATE: '/seller/properties/update.php',

  // Buyer (BUYER_DASHBOARD_ENDPOINTS_REPORT.md)
  FAVORITES_LIST: '/buyer/favorites/list.php',
  FAVORITE_ADD: '/buyer/favorites/toggle.php',
  FAVORITE_REMOVE: '/buyer/favorites/toggle.php',
  FAVORITE_CHECK: '/buyer/favorites/list.php',
  UPLOAD_PROFILE_IMAGE: '/upload/profile-image.php',
  INQUIRY_SEND: '/buyer/inquiries/send.php',
  SELLER_INQUIRIES_LIST: '/seller/inquiries/list.php',
  INQUIRY_INBOX: '/inquiry/inbox.php',
  INQUIRY_SENT: '/inquiry/sent.php',
  INQUIRY_MARK_READ: '/inquiry/mark-read.php',
  INQUIRY_REPLY: '/inquiry/reply.php',

  // Moderation / images (PROPERTY_IMAGE_UPLOAD_WORKFLOW.md)
  MODERATE_AND_UPLOAD: '/images/moderate-and-upload.php',
  MODERATION_CHECK_IMAGE: '/moderation/check-image.php',
  ADMIN_MODERATION_QUEUE: '/admin/moderation/queue.php',
  ADMIN_MODERATION_APPROVE: '/admin/moderation/approve.php',
  ADMIN_MODERATION_REJECT: '/admin/moderation/reject.php',

  // Chat (CHAT_WORKFLOW_ROLE_SWITCHING_REPORT.md)
  CHAT_CREATE_ROOM: '/chat/create-room.php',
  CHAT_INIT_CONVERSATION: '/chat/init.php',
  CHAT_MESSAGES: '/chat/messages.php',
  CHAT_SEND_MESSAGE: '/chat/send-message.php',

  // Buyer profile & actions
  BUYER_PROFILE_GET: '/buyer/profile/get.php',
  SELLER_PROFILE_GET: '/seller/profile/get.php',
  UPDATE_PROFILE: '/profile/update.php',
  UPLOAD_PICTURE: '/upload/picture.php',
  CHANGE_PASSWORD: '/auth/change-password.php',
  BUYER_PROPERTIES_LIST: '/buyer/properties/list.php',
  BUYER_PROPERTY_DETAILS: '/buyer/properties/details.php',
  BUYER_FAVORITES_LIST: '/buyer/favorites/list.php',
  BUYER_FAVORITES_TOGGLE: '/buyer/favorites/toggle.php',
  BUYER_INQUIRY_SEND: '/buyer/inquiries/send.php',
  BUYER_PROFILE_UPDATE: '/buyer/profile/update.php',
  BUYER_INTERACTION_RECORD: '/buyer/interactions/record.php',
  BUYER_INTERACTION_CHECK: '/buyer/interactions/check.php',
  BUYER_HISTORY_ADD: '/buyer/history/add.php',
  BUYER_HISTORY_LIST: '/buyer/history/list.php',

  // OTP (backend proxy)
  OTP_SEND_SMS: '/otp/send_sms.php',
  OTP_VERIFY_MSG91_TOKEN: '/otp/verify_msg91.php',
  OTP_VERIFY_SMS: '/otp/verify_sms.php',
  OTP_SEND_EMAIL: '/otp/send_email.php',
  OTP_VERIFY_EMAIL: '/otp/verify_email.php',
  MSG91_OTP_SEND: '/otp/msg91/send.php',
  MSG91_OTP_VERIFY: '/otp/msg91/verify.php',

  // Seller dashboard
  SELLER_DASHBOARD_STATS: '/seller/dashboard/stats.php',
  SELLER_BUYERS_GET: '/seller/buyers/get.php',
  SELLER_PROFILE_UPDATE: '/seller/profile/update.php',
  SELLER_INQUIRY_UPDATE_STATUS: '/seller/inquiries/updateStatus.php',

  // Leads & contact
  CONTACT_SEND: '/contact/send.php',
  SELLER_LEADS_LIST: '/seller/leads/list.php',
  BUYER_LEAD_CREATE: '/buyer/lead/create.php',
};
