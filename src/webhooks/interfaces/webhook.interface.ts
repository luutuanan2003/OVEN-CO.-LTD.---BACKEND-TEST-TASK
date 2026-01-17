export interface Webhook {
  id: string;
  source: string;
  event: string;
  payload: Record<string, unknown>;
  receivedAt: Date;
  signature?: string;
  verified: boolean;
}

export interface WebhookResponse {
  id: string;
  message: string;
}

export interface WebhooksListResponse {
  webhooks: Webhook[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}
