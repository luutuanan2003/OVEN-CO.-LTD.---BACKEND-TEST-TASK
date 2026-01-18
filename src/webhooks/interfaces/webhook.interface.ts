/**
 * Webhook Interface
 *
 * Defines the shape of a stored webhook object.
 * This is the main data model for webhooks in our system.
 */
export interface Webhook {
  /** Unique identifier (UUID v4) for the webhook */
  id: string;

  /** The origin service that sent the webhook (e.g., "stripe", "github") */
  source: string;

  /** The type of event (e.g., "payment.completed", "push") */
  event: string;

  /** The actual webhook data/body sent by the external service */
  payload: Record<string, unknown>;

  /** Timestamp when we received the webhook */
  receivedAt: Date;

  /** The signature header value (if provided) for verification */
  signature?: string;

  /** Whether the webhook signature was successfully verified */
  verified: boolean;
}

/**
 * Webhook Response Interface
 *
 * The response returned when a webhook is successfully created.
 * Keeps response minimal - just confirms receipt with the assigned ID.
 */
export interface WebhookResponse {
  /** The assigned UUID for the newly created webhook */
  id: string;

  /** Confirmation message */
  message: string;
}

/**
 * Webhooks List Response Interface
 *
 * The response returned when listing webhooks.
 * Includes pagination metadata for frontend/client use.
 */
export interface WebhooksListResponse {
  /** Array of webhook objects for the current page */
  webhooks: Webhook[];

  /** Number of webhooks in this response (current page) */
  count: number;

  /** Current page number (1-indexed) */
  page: number;

  /** Number of items per page */
  limit: number;

  /** Total number of pages available */
  totalPages: number;
}
