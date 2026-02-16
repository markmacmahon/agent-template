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
  HOME_TITLE: "Partner Integration Platform",
  HOME_SUBTITLE:
    "Build conversational agents that plug into existing chatbots. Handle customer Q&A or complete workflows like booking, ordering, and support.",
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

  // ── Dashboard (landing when logged in) ───────────────────────────
  NAV_WELCOME: "Welcome to your Dashboard",
  DASHBOARD_TITLE: "Partner Dashboard",
  DASHBOARD_SUBTITLE:
    "Create and manage your Apps. Each App is your integration into the chatbot ecosystem — configure webhooks, test with the simulator, and monitor customer conversations.",
  DASHBOARD_CTA: "Go to Apps",

  // ── Error pages ─────────────────────────────────────────────────
  ERROR_GENERIC: "Something went wrong. Please try again.",
  ERROR_DASHBOARD: "Something went wrong loading this page.",
  ERROR_TRY_AGAIN: "Try again",
  ERROR_UNEXPECTED: "An unexpected error occurred. Please try again later.",
  ERROR_NETWORK: "Network error",
  ERROR_NO_TOKEN: "No access token found",
  ERROR_NO_DATA: "No data returned from server",
  ERROR_UNKNOWN: "Unknown error",
  ERROR_INVALID_CURSOR: "Invalid pagination cursor",

  // ── Backend error keys (returned as raw keys from API) ────────
  ERROR_INTERNAL: "Internal server error",
  ERROR_APP_NOT_FOUND: "App not found or not authorized",
  ERROR_SUBSCRIBER_NOT_FOUND: "Subscriber not found",
  ERROR_THREAD_NOT_FOUND: "Thread not found or not authorized",
  ERROR_MESSAGE_NOT_FOUND: "Message not found or not authorized",
  ERROR_NO_USER_MESSAGES: "No user messages in thread",
  ERROR_NO_REPLY: "No reply generated",
  ERROR_PARTNER_API_UNAUTHORIZED:
    "Partner API: provide JWT Bearer token or X-App-Id and X-App-Secret headers",
  ERROR_PARTNER_API_INVALID_APP_HEADER:
    "Partner API: X-App-Id must be a valid app UUID",
  ERROR_PARTNER_API_APP_ID_MISMATCH:
    "Partner API: X-App-Id header must match the app in the URL",
  ERROR_PARTNER_API_APP_OR_SECRET_INVALID:
    "Partner API: app not found or secret invalid; ensure app has a webhook secret set",

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
  APP_CREATE_SUBMIT_WEBHOOK: "Create app & save credentials",
  APP_EDIT_TITLE: "Edit App",
  APP_EDIT_SUBTITLE: "Update the details of your app below.",
  APP_EDIT_SUBMIT: "Update App",
  APP_EDIT_SUBMIT_WEBHOOK: "Save app & credentials",
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
  WEBHOOK_URL_PLACEHOLDER:
    "http://localhost:8080 (e.g. examples/webhook-python)",
  WEBHOOK_URL_CORS_NOTE:
    "Requests are sent from our server, so CORS does not apply. Any reachable URL is fine.",
  WEBHOOK_URL_WARNING:
    "No webhook configured. Simulator will be used until you add one.",
  WEBHOOK_STATUS_NOT_CONFIGURED: "Not configured",
  WEBHOOK_STATUS_OK: "Last test: OK",
  WEBHOOK_STATUS_FAILED: "Last test: Failed",
  WEBHOOK_STATUS_VALID: "Valid URL",
  WEBHOOK_SECURITY_HEADING: "Webhook Security (Optional)",
  WEBHOOK_SECURITY_DESC:
    "If set, each webhook request will be signed using HMAC-SHA256. Your server can verify the signature to ensure authenticity.",
  PARTNER_API_CREDENTIALS_HEADING: "App ID & Secret",
  PARTNER_API_CREDENTIALS_HEADING_OPTIONAL: "App ID & Secret (optional)",
  PARTNER_API_CREDENTIALS_INTRO:
    "Use for the Partner API (no login). Save below to store them.",
  PARTNER_API_CREDENTIALS_INTRO_CREATE:
    "Set a secret to use the Partner API without logging in. Create the app below to save it.",
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
  WEBHOOK_TAB_PARTNER_API: "Partner API",
  WEBHOOK_STREAMING_HEADING: "Streaming Responses (Optional)",

  // Partner API (subscribers & post to thread)
  PARTNER_API_INTRO:
    "Use your account (JWT) to list subscribers, list their threads, and post messages to a thread. All requests need the token from login.",
  PARTNER_API_INTRO_WITH_SECRET:
    "Use the App ID and webhook secret below — no login required. Send X-App-Id and X-App-Secret on every request.",
  PARTNER_API_BASE_URL: "API base URL",
  PARTNER_API_APP_ID: "App ID",
  PARTNER_API_APP_ID_FOR_SECRET: "App ID (use with webhook secret)",
  PARTNER_API_AUTH_APP_SECRET: "Authenticate with App ID + Secret",
  PARTNER_API_AUTH_APP_SECRET_DESC:
    "Send these headers on every request. No access token needed.",
  PARTNER_API_STEP_1: "1. Get an access token",
  PARTNER_API_STEP_1_DESC:
    "Login with your email and password. Use the returned access_token in the Authorization header for all requests below.",
  PARTNER_API_STEP_2: "2. List subscribers",
  PARTNER_API_STEP_2_DESC:
    "Returns subscribers (customers) for this app. Use limit and cursor for pagination.",
  PARTNER_API_STEP_3: "3. List threads for a subscriber",
  PARTNER_API_STEP_3_DESC:
    "Returns threads for one subscriber. Use the subscriber id from step 2.",
  PARTNER_API_STEP_4: "4. Post a message to a thread",
  PARTNER_API_STEP_4_DESC:
    "Send an assistant reply into a thread. Use the thread id from step 3.",

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
  CHAT_LOADING_MESSAGES: "Loading conversation…",
  CHAT_NO_CONVERSATIONS: "No conversations yet.",
  CHAT_START_BELOW: "Start chatting below.",
  CHAT_TITLE_CLICK_TO_EDIT: "Click to edit",
  CHAT_TITLE_PLACEHOLDER: "Conversation title",
  CHAT_SCENARIO_PLACEHOLDER: "Demo scenario",
  CHAT_SCENARIO_RUNNING: "Running demo…",
  CHAT_SCENARIO_SUPPORT: "Customer Support Triage",
  CHAT_SCENARIO_SUPPORT_DESC: "Diagnose and resolve a warranty issue",
  CHAT_SCENARIO_MATCH: "Live Match Commentary",
  CHAT_SCENARIO_MATCH_DESC: "Minute-by-minute football updates",
  CHAT_SCENARIO_RESERVATION: "Restaurant Reservation",
  CHAT_SCENARIO_RESERVATION_DESC: "Book a cozy dinner table with options",
  CHAT_SCENARIO_SURVEY: "Order Feedback Survey",
  CHAT_SCENARIO_SURVEY_DESC: "Collect three quick answers",
  CHAT_SENDING: "Sending...",
  CHAT_RETRY_SEND: "Retry",

  // ── Subscribers ─────────────────────────────────────────────────
  SUBSCRIBERS_PAGE_TITLE: "Subscribers",
  SUBSCRIBERS_LIST_TITLE: "Subscribers",
  SUBSCRIBERS_THREADS_TITLE: "Threads",
  SUBSCRIBERS_SEARCH_PLACEHOLDER: "Search subscribers...",
  SUBSCRIBERS_NO_SUBSCRIBERS: "No subscribers yet",
  SUBSCRIBERS_NO_SUBSCRIBERS_DESCRIPTION:
    "Once customers interact with your app, they'll appear here.",
  SUBSCRIBERS_NO_THREADS: "No threads yet for this subscriber",
  SUBSCRIBERS_SELECT_SUBSCRIBER: "Select a subscriber to view their threads",
  SUBSCRIBERS_SELECT_THREAD: "Select a thread to view the conversation",
  SUBSCRIBERS_CHAT_TITLE: "Conversation",
  SUBSCRIBERS_NEW_THREAD: "New Thread",
  SUBSCRIBERS_LOADING: "Loading...",
  SUBSCRIBERS_LOADING_MORE: "Loading more...",
  SUBSCRIBERS_LOAD_MORE: "Load More",
  SUBSCRIBERS_NAV_LINK: "Subscribers",
  SUBSCRIBERS_THREAD_COUNT_ONE: "1 thread",
  SUBSCRIBERS_THREAD_COUNT_OTHER: "{count} threads",
  SUBSCRIBERS_MESSAGE_COUNT_ONE: "1 message",
  SUBSCRIBERS_MESSAGE_COUNT_OTHER: "{count} messages",
  SUBSCRIBERS_NO_MESSAGES_SHORT: "No messages yet",

  // ── Pagination ──────────────────────────────────────────────────
  PAGINATION_ITEMS_PER_PAGE: "Items per page:",
  PAGINATION_NO_RESULTS: "0 results",

  // ── Fetch errors (used in server actions) ───────────────────────
  ERROR_FETCH_APPS: "Failed to fetch apps",
  ERROR_FETCH_APP: "Failed to fetch app",
  ERROR_FETCH_THREADS: "Failed to fetch threads",
  ERROR_FETCH_SUBSCRIBERS: "Failed to fetch subscribers",
  ERROR_FETCH_SUBSCRIBER_THREADS: "Failed to fetch subscriber threads",
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
