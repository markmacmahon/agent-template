/**
 * Single source of truth for every user-facing string in the frontend.
 *
 * Naming convention (SCREAMING_SNAKE, category prefix):
 *   AUTH_*     – login, register, password reset
 *   ERROR_*    – error messages
 *   CHAT_*     – chat interface
 *   APP_*      – app management (CRUD, config)
 *   NAV_*      – navigation, sidebar, breadcrumbs
 *   FORM_*     – shared form labels & validation
 *   ACTION_*   – confirmations, toasts, results
 *   HOME_*     – landing page
 *   WEBHOOK_*  – webhook-related UI text
 *   SIM_*      – simulator-related UI text
 *   PAGINATION_* – table pagination
 */
const messages = {
  // ── Home / landing ──────────────────────────────────────────────
  HOME_TITLE: "ChatBot Application Starter",
  HOME_SUBTITLE:
    "Build intelligent conversational AI applications with a modern, type-safe full-stack framework.",
  HOME_CTA: "Go to Dashboard",
  HOME_GITHUB: "View on GitHub",

  // ── Auth: login ─────────────────────────────────────────────────
  AUTH_LOGIN_TITLE: "Login",
  AUTH_LOGIN_DESCRIPTION: "Enter your email below to log in to your account.",
  AUTH_LOGIN_SUBMIT: "Sign In",
  AUTH_LOGIN_NO_ACCOUNT: "Don't have an account?",
  AUTH_LOGIN_SIGN_UP: "Sign up",
  AUTH_FORGOT_PASSWORD: "Forgot your password?",

  // ── Auth: register ──────────────────────────────────────────────
  AUTH_REGISTER_TITLE: "Sign Up",
  AUTH_REGISTER_DESCRIPTION:
    "Enter your email and password below to create your account.",
  AUTH_REGISTER_SUBMIT: "Sign Up",
  AUTH_REGISTER_BACK: "Back to login",

  // ── Auth: password recovery ─────────────────────────────────────
  AUTH_PASSWORD_RECOVERY_TITLE: "Password Recovery",
  AUTH_PASSWORD_RECOVERY_DESCRIPTION:
    "Enter your email to receive instructions to reset your password.",
  AUTH_PASSWORD_RECOVERY_SUBMIT: "Send",
  AUTH_PASSWORD_RECOVERY_BACK: "Back to login",
  AUTH_PASSWORD_RESET_TITLE: "Reset your Password",
  AUTH_PASSWORD_RESET_DESCRIPTION: "Enter the new password and confirm it.",
  AUTH_PASSWORD_RESET_SUBMIT: "Send",
  AUTH_PASSWORD_RESET_LOADING: "Loading reset form...",
  AUTH_PASSWORD_RESET_SUCCESS:
    "Password reset instructions sent to your email.",

  // ── Form labels (shared) ────────────────────────────────────────
  FORM_EMAIL: "Email",
  FORM_PASSWORD: "Password",
  FORM_PASSWORD_CONFIRM: "Password Confirm",
  FORM_USERNAME: "Username",
  FORM_PLACEHOLDER_EMAIL: "m@example.com",

  // ── Validation messages ─────────────────────────────────────────
  FORM_VALIDATION_PASSWORD_MIN: "Password should be at least 8 characters.",
  FORM_VALIDATION_PASSWORD_UPPERCASE:
    "Password should contain at least one uppercase letter.",
  FORM_VALIDATION_PASSWORD_SPECIAL:
    "Password should contain at least one special character.",
  FORM_VALIDATION_PASSWORDS_MATCH: "Passwords must match.",
  FORM_VALIDATION_TOKEN_REQUIRED: "Token is required",
  FORM_VALIDATION_EMAIL_INVALID: "Invalid email address",
  FORM_VALIDATION_PASSWORD_REQUIRED: "Password is required",
  FORM_VALIDATION_USERNAME_REQUIRED: "Username is required",
  FORM_VALIDATION_NAME_REQUIRED: "Name is required",
  FORM_VALIDATION_DESCRIPTION_REQUIRED: "Description is required",
  FORM_VALIDATION_INTEGRATION_MODE: "Invalid integration mode",
  FORM_VALIDATION_WEBHOOK_URL:
    "Webhook URL must start with http:// or https://",

  // ── Navigation / breadcrumbs ────────────────────────────────────
  NAV_DASHBOARD: "Dashboard",
  NAV_APPS: "Apps",
  NAV_NEW_APP: "New App",
  NAV_EDIT_APP: "Edit App",
  NAV_CHAT: "Chat",
  NAV_LOGOUT: "Logout",

  // ── Dashboard ───────────────────────────────────────────────────
  NAV_WELCOME: "Welcome to your Dashboard",

  // ── Error pages ─────────────────────────────────────────────────
  ERROR_GENERIC: "Something went wrong. Please try again.",
  ERROR_DASHBOARD: "Something went wrong loading this page.",
  ERROR_TRY_AGAIN: "Try again",
  ERROR_UNEXPECTED: "An unexpected error occurred. Please try again later.",
  ERROR_NETWORK: "Network error",
  ERROR_NO_TOKEN: "No access token found",
  ERROR_NO_DATA: "No data returned from server",
  ERROR_UNKNOWN: "Unknown error",

  // ── Backend error keys (returned as raw keys from API) ────────
  ERROR_INTERNAL: "Internal server error",
  ERROR_APP_NOT_FOUND: "App not found or not authorized",
  ERROR_THREAD_NOT_FOUND: "Thread not found or not authorized",
  ERROR_MESSAGE_NOT_FOUND: "Message not found or not authorized",
  ERROR_NO_USER_MESSAGES: "No user messages in thread",
  ERROR_NO_REPLY: "No reply generated",

  // ── Backend success keys (returned as raw keys from API) ──────
  ACTION_APP_DELETED: "App successfully deleted",
  ACTION_THREAD_DELETED: "Thread successfully deleted",

  // ── Backend webhook test keys (returned as raw keys from API) ─
  WEBHOOK_TEST_BAD_STATUS: "Webhook returned a non-200 status",
  WEBHOOK_TEST_NOT_JSON: "Response is not valid JSON",
  WEBHOOK_TEST_MISSING_REPLY: "Response missing required 'reply' field",
  WEBHOOK_TEST_TIMEOUT: "Request timed out",
  WEBHOOK_TEST_CONNECTION_ERROR: "Connection error",

  // ── Stream errors ───────────────────────────────────────────────
  ERROR_STREAM_CLOSED: "Connection closed by server",
  ERROR_STREAM_FAILED: "Connection to server failed",

  // ── Apps table ──────────────────────────────────────────────────
  APP_HEADING: "Apps",
  APP_ADD_NEW: "Add New App",
  APP_TABLE_NAME: "Name",
  APP_TABLE_DESCRIPTION: "Description",
  APP_TABLE_ACTIONS: "Actions",
  APP_TABLE_EMPTY: "No results.",
  APP_ACTION_CHAT: "Chat",
  APP_ACTION_EDIT: "Edit",
  APP_ACTION_DELETE: "Delete",

  // ── Create / edit app form ──────────────────────────────────────
  APP_CREATE_TITLE: "Create New App",
  APP_CREATE_SUBTITLE: "Enter the details of the new app below.",
  APP_CREATE_SUBMIT: "Create App",
  APP_EDIT_TITLE: "Edit App",
  APP_EDIT_SUBTITLE: "Update the details of your app below.",
  APP_EDIT_SUBMIT: "Update App",
  APP_LABEL_NAME: "App Name",
  APP_LABEL_DESCRIPTION: "App Description",
  APP_PLACEHOLDER_NAME: "App name",
  APP_PLACEHOLDER_DESCRIPTION: "Description of the app",

  // ── Integration mode ────────────────────────────────────────────
  APP_INTEGRATION_HEADING: "Integration",
  APP_MODE_SIMULATOR: "Simulator",
  APP_MODE_WEBHOOK: "Webhook",
  APP_MODE_SIMULATOR_DESC:
    "Use built-in simulated replies for dashboard testing.",
  APP_MODE_SIMULATOR_DESC_SHORT: "Use built-in simulated replies for testing.",
  APP_MODE_WEBHOOK_DESC:
    "We will POST each customer message to your webhook and expect a JSON reply.",
  APP_INTEGRATION_DESC:
    "Use a built-in simulator for testing, or your own webhook for production.",

  // ── Simulator settings ──────────────────────────────────────────
  SIM_HEADING: "Simulator type",
  SIM_SCENARIO_LABEL: "Type",
  SIM_SCENARIO_GENERIC: "Generic (Echo)",
  SIM_SCENARIO_ECOMMERCE: "E-Commerce Support",
  SIM_SCENARIO_GENERIC_DESC:
    'Echoes the user\'s message back with an "Echo:" prefix. Good for testing the full pipeline.',
  SIM_SCENARIO_ECOMMERCE_DESC:
    "Responds with realistic e-commerce support replies (order status, refunds, etc.). Great for demoing a customer support flow.",
  SIM_DISCLAIMER_LABEL: "Show disclaimer prefix",
  SIM_DISCLAIMER_DESC:
    'Prepends "[Simulated]" to every reply so users know it\'s not a real agent.',
  SIM_TRY_CHAT: "Try it in Chat",

  // ── Webhook config ──────────────────────────────────────────────
  WEBHOOK_URL_LABEL: "Webhook URL",
  WEBHOOK_URL_PLACEHOLDER: "https://your-service.com/webhook",
  WEBHOOK_URL_WARNING:
    "No webhook configured. Simulator will be used until you add one.",
  WEBHOOK_STATUS_NOT_CONFIGURED: "Not configured",
  WEBHOOK_STATUS_OK: "Last test: OK",
  WEBHOOK_STATUS_FAILED: "Last test: Failed",
  WEBHOOK_STATUS_VALID: "Valid URL",
  WEBHOOK_SECURITY_HEADING: "Webhook Security (Optional)",
  WEBHOOK_SECURITY_DESC:
    "If set, each webhook request will be signed using HMAC-SHA256. Your server can verify the signature to ensure authenticity.",
  WEBHOOK_SECRET_LABEL: "Webhook Secret",
  WEBHOOK_SECRET_PLACEHOLDER: "Enter or generate a secret",
  WEBHOOK_SECRET_GENERATE: "Generate",
  WEBHOOK_SECRET_CLEAR: "Clear",
  WEBHOOK_SECRET_COPY: "Copy",
  WEBHOOK_SECRET_COPIED: "Copied to clipboard",
  WEBHOOK_SECRET_SHOW: "Show key",
  WEBHOOK_SECRET_HIDE: "Hide key",
  WEBHOOK_SECRET_COPY_WARNING:
    "Copy this secret now — it will be masked after saving.",
  WEBHOOK_TEST_HEADING: "Test Webhook",
  WEBHOOK_TEST_SAMPLE_LABEL: "Sample message",
  WEBHOOK_TEST_BUTTON: "Test webhook",
  WEBHOOK_TEST_LOADING: "Testing...",
  WEBHOOK_TEST_SIGNATURE_SENT: "Sent ✓",
  WEBHOOK_TEST_SIGNATURE_NONE: "Not configured",
  WEBHOOK_CONTRACT_HEADING: "Webhook Contract",
  WEBHOOK_TAB_REQUEST: "Request",
  WEBHOOK_TAB_RESPONSE: "Response",
  WEBHOOK_TAB_EXAMPLES: "Examples",
  WEBHOOK_TAB_SIGNING: "Signature Verification",
  WEBHOOK_STREAMING_HEADING: "Streaming Responses (Optional)",

  // ── Chat interface ──────────────────────────────────────────────
  CHAT_GREETING_TITLE: "Hello there!",
  CHAT_GREETING_SUBTITLE: "How can I help you today?",
  CHAT_SIDEBAR_TITLE: "Conversations",
  CHAT_SIDEBAR_OPEN: "Show conversations",
  CHAT_SIDEBAR_CLOSE: "Hide conversations",
  CHAT_NEW_CONVERSATION: "New conversation",
  CHAT_NEW_CHAT: "New Chat",
  CHAT_DEFAULT_TITLE: "Chat",
  CHAT_PLACEHOLDER: "Send a message...",
  CHAT_PLACEHOLDER_STREAMING: "Waiting for response...",
  CHAT_NO_CONVERSATIONS: "No conversations yet.",
  CHAT_START_BELOW: "Start chatting below.",
  CHAT_TITLE_CLICK_TO_EDIT: "Click to edit",
  CHAT_TITLE_PLACEHOLDER: "Conversation title",

  // ── Pagination ──────────────────────────────────────────────────
  PAGINATION_ITEMS_PER_PAGE: "Items per page:",
  PAGINATION_NO_RESULTS: "0 results",

  // ── Fetch errors (used in server actions) ───────────────────────
  ERROR_FETCH_APPS: "Failed to fetch apps",
  ERROR_FETCH_APP: "Failed to fetch app",
  ERROR_FETCH_THREADS: "Failed to fetch threads",
  ERROR_CREATE_THREAD: "Failed to create thread",
  ERROR_SEND_MESSAGE: "Failed to send message",
  ERROR_FETCH_MESSAGES: "Failed to fetch messages",
} as const;

export type MessageKey = keyof typeof messages;

/**
 * Return the English string for the given key.
 *
 * Type-safe at compile time — a typo in the key is a TS error.
 * When we add translations (es, pt), this will accept an optional `locale`
 * and use resolveLocale(user?.locale) from @/lib/locale. Default remains en.
 */
export function t(key: MessageKey): string {
  return messages[key];
}

/**
 * Translate a backend error string into a human-readable message.
 *
 * The backend returns raw i18n keys (e.g. `"ERROR_APP_NOT_FOUND"`) as the
 * `detail` field. This function looks up the key and returns the English
 * text.  If the string is not a known key (e.g. from fastapi-users or a
 * raw exception), it is returned as-is.
 */
export function translateError(raw: string): string {
  if (raw in messages) {
    return messages[raw as MessageKey];
  }
  return raw;
}
