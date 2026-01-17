import { Injectable, Logger } from '@nestjs/common';
import { Webhook } from './interfaces/webhook.interface';

@Injectable()
export class WebhooksStorage {
  private readonly logger = new Logger(WebhooksStorage.name);
  private webhooks: Map<string, Webhook> = new Map();
  private readonly maxStorageSize: number;

  constructor() {
    this.maxStorageSize = parseInt(
      process.env.MAX_WEBHOOKS_STORAGE || '10000',
      10,
    );
  }

  save(webhook: Webhook): Webhook {
    if (this.webhooks.size >= this.maxStorageSize) {
      const oldestKey = this.webhooks.keys().next().value;
      if (oldestKey) {
        this.webhooks.delete(oldestKey);
        this.logger.warn(
          `Storage limit reached. Removed oldest webhook: ${oldestKey}`,
        );
      }
    }

    this.webhooks.set(webhook.id, webhook);
    this.logger.log(`Webhook saved: ${webhook.id}`);
    return webhook;
  }

  getAll(options?: {
    page?: number;
    limit?: number;
    source?: string;
    event?: string;
  }): { webhooks: Webhook[]; total: number } {
    let webhooksArray = Array.from(this.webhooks.values());

    if (options?.source) {
      webhooksArray = webhooksArray.filter((w) => w.source === options.source);
    }

    if (options?.event) {
      webhooksArray = webhooksArray.filter((w) => w.event === options.event);
    }

    webhooksArray.sort(
      (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime(),
    );

    const total = webhooksArray.length;
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const startIndex = (page - 1) * limit;

    return {
      webhooks: webhooksArray.slice(startIndex, startIndex + limit),
      total,
    };
  }

  getById(id: string): Webhook | undefined {
    return this.webhooks.get(id);
  }

  count(): number {
    return this.webhooks.size;
  }

  clear(): void {
    this.webhooks.clear();
    this.logger.log('Storage cleared');
  }

  delete(id: string): boolean {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      this.logger.log(`Webhook deleted: ${id}`);
    }
    return deleted;
  }
}
