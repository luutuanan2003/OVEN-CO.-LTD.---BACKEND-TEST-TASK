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
  private readonly logger = new Logger(WebhooksService.name);
  private readonly webhookSecret: string;

  constructor(private readonly storage: WebhooksStorage) {
    this.webhookSecret = process.env.WEBHOOK_SECRET || '';
    if (!this.webhookSecret) {
      this.logger.warn(
        'WEBHOOK_SECRET is not set. Signature verification will be skipped.',
      );
    }
  }

  create(
    createWebhookDto: CreateWebhookDto,
    signature?: string,
  ): WebhookResponse {
    const id = randomUUID();
    const verified = this.verifySignature(createWebhookDto, signature);

    const webhook: Webhook = {
      id,
      source: createWebhookDto.source,
      event: createWebhookDto.event,
      payload: createWebhookDto.payload,
      receivedAt: new Date(),
      signature,
      verified,
    };

    this.storage.save(webhook);

    this.logger.log(
      `Webhook received from ${webhook.source}: ${webhook.event} (verified: ${verified})`,
    );

    return {
      id: webhook.id,
      message: 'Webhook received',
    };
  }

  findAll(query: QueryWebhooksDto): WebhooksListResponse {
    const { page = 1, limit = 10, source, event } = query;
    const { webhooks, total } = this.storage.getAll({
      page,
      limit,
      source,
      event,
    });

    return {
      webhooks,
      count: webhooks.length,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  findOne(id: string): Webhook {
    if (!this.isValidUuid(id)) {
      throw new NotFoundException('Webhook not found');
    }

    const webhook = this.storage.getById(id);

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  delete(id: string): { message: string } {
    if (!this.isValidUuid(id)) {
      throw new NotFoundException('Webhook not found');
    }

    const deleted = this.storage.delete(id);

    if (!deleted) {
      throw new NotFoundException('Webhook not found');
    }

    return { message: 'Webhook deleted successfully' };
  }

  private verifySignature(
    payload: CreateWebhookDto,
    signature?: string,
  ): boolean {
    if (!this.webhookSecret) {
      return false;
    }

    if (!signature) {
      this.logger.warn('No signature provided for webhook');
      return false;
    }

    try {
      const expectedSignature = createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const providedBuffer = Buffer.from(signature, 'hex');

      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      return timingSafeEqual(expectedBuffer, providedBuffer);
    } catch (error) {
      this.logger.error('Error verifying signature', error);
      return false;
    }
  }

  private isValidUuid(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}
