/**
 * Webhooks Storage Service
 *
 * This class handles all data persistence for webhooks.
 * Currently uses in-memory storage (Map), but could be extended
 * to use a database (PostgreSQL, MongoDB, etc.) in production.
 *
 * Key features:
 * - O(1) lookups using Map instead of Array
 * - Automatic cleanup when storage limit is reached
 * - Pagination and filtering support
 *
 * @Injectable() marks this as a service that can be injected by NestJS
 */
import { Injectable, Logger } from '@nestjs/common';
import { Webhook } from './interfaces/webhook.interface';

@Injectable()
export class WebhooksStorage {
  /** Logger instance for this class - outputs to console with class name prefix */
  private readonly logger = new Logger(WebhooksStorage.name);

  /**
   * In-memory storage using Map for O(1) lookups by ID
   * Map preserves insertion order, so first key = oldest webhook
   */
  private webhooks: Map<string, Webhook> = new Map();

  /** Maximum number of webhooks to store before removing oldest */
  private readonly maxStorageSize: number;

  /**
   * Constructor - runs when NestJS creates this service
   * Reads the max storage size from environment variable
   */
  constructor() {
    // Parse env variable, default to 10000 if not set
    this.maxStorageSize = parseInt(
      process.env.MAX_WEBHOOKS_STORAGE || '10000',
      10,
    );
  }

  /**
   * Save a webhook to storage
   *
   * If storage is full, removes the oldest webhook first (FIFO - First In, First Out)
   * This prevents unbounded memory growth.
   *
   * @param webhook - The webhook object to save
   * @returns The saved webhook
   */
  save(webhook: Webhook): Webhook {
    // Check if we've hit the storage limit
    if (this.webhooks.size >= this.maxStorageSize) {
      // Get the first (oldest) key from the Map
      const oldestKey = this.webhooks.keys().next().value;
      if (oldestKey) {
        // Remove the oldest webhook to make room
        this.webhooks.delete(oldestKey);
        this.logger.warn(
          `Storage limit reached. Removed oldest webhook: ${oldestKey}`,
        );
      }
    }

    // Add the new webhook to the Map
    this.webhooks.set(webhook.id, webhook);
    this.logger.log(`Webhook saved: ${webhook.id}`);
    return webhook;
  }

  /**
   * Get all webhooks with optional filtering and pagination
   *
   * @param options - Optional filtering and pagination parameters
   * @param options.page - Page number (1-indexed)
   * @param options.limit - Number of items per page
   * @param options.source - Filter by source (exact match)
   * @param options.event - Filter by event type (exact match)
   * @returns Object containing webhooks array and total count
   */
  getAll(options?: {
    page?: number;
    limit?: number;
    source?: string;
    event?: string;
  }): { webhooks: Webhook[]; total: number } {
    // Convert Map values to array for filtering/sorting
    let webhooksArray = Array.from(this.webhooks.values());

    // Apply source filter if provided
    if (options?.source) {
      webhooksArray = webhooksArray.filter((w) => w.source === options.source);
    }

    // Apply event filter if provided
    if (options?.event) {
      webhooksArray = webhooksArray.filter((w) => w.event === options.event);
    }

    // Sort by receivedAt descending (newest first)
    webhooksArray.sort(
      (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime(),
    );

    // Calculate pagination
    const total = webhooksArray.length;
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const startIndex = (page - 1) * limit; // Convert 1-indexed page to 0-indexed array position

    // Return the slice for the requested page
    return {
      webhooks: webhooksArray.slice(startIndex, startIndex + limit),
      total,
    };
  }

  /**
   * Get a single webhook by its ID
   *
   * Uses Map.get() for O(1) lookup time
   *
   * @param id - The webhook UUID to find
   * @returns The webhook if found, undefined otherwise
   */
  getById(id: string): Webhook | undefined {
    return this.webhooks.get(id);
  }

  /**
   * Get the total number of stored webhooks
   *
   * @returns The count of webhooks in storage
   */
  count(): number {
    return this.webhooks.size;
  }

  /**
   * Clear all webhooks from storage
   *
   * Primarily used for testing purposes
   */
  clear(): void {
    this.webhooks.clear();
    this.logger.log('Storage cleared');
  }

  /**
   * Delete a webhook by its ID
   *
   * @param id - The webhook UUID to delete
   * @returns true if the webhook was found and deleted, false otherwise
   */
  delete(id: string): boolean {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      this.logger.log(`Webhook deleted: ${id}`);
    }
    return deleted;
  }
}
