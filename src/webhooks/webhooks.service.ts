/**
 * Webhooks Service
 *
 * This is the main business logic layer for webhooks.
 * It handles:
 * - Creating new webhooks with secure UUID generation
 * - Verifying webhook signatures using HMAC-SHA256
 * - Retrieving webhooks (single or paginated list)
 * - Deleting webhooks
 *
 * The service sits between the Controller (HTTP layer) and Storage (data layer).
 * Controller -> Service -> Storage
 *
 * @Injectable() marks this as a service that can be injected by NestJS
 */
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import { WebhooksStorage } from './webhooks.storage';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { QueryWebhooksDto } from './dto/query-webhooks.dto';
import {
  Webhook,
  WebhookResponse,
  WebhooksListResponse,
} from './interfaces/webhook.interface';

@Injectable()
export class WebhooksService {
  /** Logger instance for this class */
  private readonly logger = new Logger(WebhooksService.name);

  /** Secret key for verifying webhook signatures (from environment) */
  private readonly webhookSecret: string;

  /**
   * Constructor - NestJS automatically injects the WebhooksStorage dependency
   *
   * @param storage - The storage service for persisting webhooks
   */
  constructor(private readonly storage: WebhooksStorage) {
    // Get the secret from environment variable
    this.webhookSecret = process.env.WEBHOOK_SECRET || '';

    // Warn if no secret is configured (signatures won't be verified)
    if (!this.webhookSecret) {
      this.logger.warn(
        'WEBHOOK_SECRET is not set. Signature verification will be skipped.',
      );
    }
  }

  /**
   * Create a new webhook
   *
   * This method:
   * 1. Generates a cryptographically secure UUID for the webhook
   * 2. Verifies the signature if provided
   * 3. Creates the webhook object with timestamp
   * 4. Saves it to storage
   *
   * @param createWebhookDto - Validated webhook data from the request body
   * @param signature - Optional signature from x-webhook-signature header
   * @returns Object with the new webhook's ID and confirmation message
   */
  create(
    createWebhookDto: CreateWebhookDto,
    signature?: string,
  ): WebhookResponse {
    // Generate a cryptographically secure UUID (much better than Math.random())
    const id = randomUUID();

    // Verify the signature if secret is configured and signature provided
    const verified = this.verifySignature(createWebhookDto, signature);

    // Build the webhook object
    const webhook: Webhook = {
      id,
      source: createWebhookDto.source,
      event: createWebhookDto.event,
      payload: createWebhookDto.payload,
      receivedAt: new Date(), // Timestamp when we received it
      signature,
      verified,
    };

    // Persist to storage
    this.storage.save(webhook);

    // Log for monitoring/debugging
    this.logger.log(
      `Webhook received from ${webhook.source}: ${webhook.event} (verified: ${verified})`,
    );

    // Return minimal response (just ID and confirmation)
    return {
      id: webhook.id,
      message: 'Webhook received',
    };
  }

  /**
   * Find all webhooks with pagination and optional filtering
   *
   * @param query - Query parameters (page, limit, source, event filters)
   * @returns Paginated list of webhooks with metadata
   */
  findAll(query: QueryWebhooksDto): WebhooksListResponse {
    // Destructure with defaults
    const { page = 1, limit = 10, source, event } = query;

    // Get filtered/paginated data from storage
    const { webhooks, total } = this.storage.getAll({
      page,
      limit,
      source,
      event,
    });

    // Return with pagination metadata
    return {
      webhooks,
      count: webhooks.length, // Items in this page
      page,
      limit,
      totalPages: Math.ceil(total / limit), // Calculate total pages
    };
  }

  /**
   * Find a single webhook by ID
   *
   * @param id - The webhook UUID to find
   * @returns The webhook object
   * @throws NotFoundException if webhook doesn't exist or ID is invalid
   */
  findOne(id: string): Webhook {
    // Validate UUID format first (prevents unnecessary storage lookup)
    if (!this.isValidUuid(id)) {
      throw new NotFoundException('Webhook not found');
    }

    // Look up in storage
    const webhook = this.storage.getById(id);

    // Throw 404 if not found
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  /**
   * Delete a webhook by ID
   *
   * @param id - The webhook UUID to delete
   * @returns Success message
   * @throws NotFoundException if webhook doesn't exist or ID is invalid
   */
  delete(id: string): { message: string } {
    // Validate UUID format first
    if (!this.isValidUuid(id)) {
      throw new NotFoundException('Webhook not found');
    }

    // Attempt to delete from storage
    const deleted = this.storage.delete(id);

    // Throw 404 if it didn't exist
    if (!deleted) {
      throw new NotFoundException('Webhook not found');
    }

    return { message: 'Webhook deleted successfully' };
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   *
   * This is a SECURITY-CRITICAL method that:
   * 1. Computes expected signature: HMAC-SHA256(payload, secret)
   * 2. Compares with provided signature using timing-safe comparison
   *
   * Why timing-safe comparison?
   * - Regular string comparison (===) exits early on first mismatch
   * - Attackers can measure response time to guess characters
   * - timingSafeEqual always takes the same time regardless of match
   *
   * @param payload - The webhook payload to verify
   * @param signature - The signature from the x-webhook-signature header
   * @returns true if signature is valid, false otherwise
   */
  private verifySignature(
    payload: CreateWebhookDto,
    signature?: string,
  ): boolean {
    // Can't verify without a secret configured
    if (!this.webhookSecret) {
      return false;
    }

    // Can't verify without a signature provided
    if (!signature) {
      this.logger.warn('No signature provided for webhook');
      return false;
    }

    try {
      // Compute what the signature SHOULD be
      // HMAC = Hash-based Message Authentication Code
      const expectedSignature = createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload)) // Hash the JSON payload
        .digest('hex'); // Output as hexadecimal string

      // Convert both signatures to Buffers for timing-safe comparison
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const providedBuffer = Buffer.from(signature, 'hex');

      // Must be same length for timingSafeEqual to work
      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      // Timing-safe comparison prevents timing attacks
      return timingSafeEqual(expectedBuffer, providedBuffer);
    } catch (error) {
      // Log error but don't expose details to caller
      this.logger.error('Error verifying signature', error);
      return false;
    }
  }

  /**
   * Validate that a string is a valid UUID v4 format
   *
   * UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * Where:
   * - x is any hex digit (0-9, a-f)
   * - 4 indicates UUID version 4
   * - y is 8, 9, a, or b (variant indicator)
   *
   * @param id - The string to validate
   * @returns true if valid UUID v4 format, false otherwise
   */
  private isValidUuid(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}
