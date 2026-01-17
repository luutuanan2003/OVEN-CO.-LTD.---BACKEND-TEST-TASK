import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksStorage } from './webhooks.storage';
import { CreateWebhookDto } from './dto/create-webhook.dto';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let storage: WebhooksStorage;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhooksService, WebhooksStorage],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    storage = module.get<WebhooksStorage>(WebhooksStorage);
  });

  afterEach(() => {
    storage.clear();
  });

  describe('create', () => {
    it('should create a webhook and return id and message', () => {
      const dto: CreateWebhookDto = {
        source: 'stripe',
        event: 'payment.completed',
        payload: { amount: 100 },
      };

      const result = service.create(dto);

      expect(result).toHaveProperty('id');
      expect(result.message).toBe('Webhook received');
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should store the webhook in storage', () => {
      const dto: CreateWebhookDto = {
        source: 'github',
        event: 'push',
        payload: { branch: 'main' },
      };

      const result = service.create(dto);
      const stored = storage.getById(result.id);

      expect(stored).toBeDefined();
      expect(stored?.source).toBe('github');
      expect(stored?.event).toBe('push');
      expect(stored?.payload).toEqual({ branch: 'main' });
    });

    it('should set verified to false when no signature provided', () => {
      const dto: CreateWebhookDto = {
        source: 'test',
        event: 'test.event',
        payload: {},
      };

      const result = service.create(dto);
      const stored = storage.getById(result.id);

      expect(stored?.verified).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return paginated webhooks', () => {
      for (let i = 0; i < 15; i++) {
        service.create({
          source: 'test',
          event: `event.${i}`,
          payload: { index: i },
        });
      }

      const result = service.findAll({ page: 1, limit: 10 });

      expect(result.webhooks).toHaveLength(10);
      expect(result.count).toBe(10);
      expect(result.totalPages).toBe(2);
    });

    it('should filter by source', () => {
      service.create({
        source: 'stripe',
        event: 'payment',
        payload: {},
      });
      service.create({
        source: 'github',
        event: 'push',
        payload: {},
      });

      const result = service.findAll({ source: 'stripe' });

      expect(result.webhooks).toHaveLength(1);
      expect(result.webhooks[0].source).toBe('stripe');
    });

    it('should filter by event', () => {
      service.create({
        source: 'test',
        event: 'payment.completed',
        payload: {},
      });
      service.create({
        source: 'test',
        event: 'payment.failed',
        payload: {},
      });

      const result = service.findAll({ event: 'payment.completed' });

      expect(result.webhooks).toHaveLength(1);
      expect(result.webhooks[0].event).toBe('payment.completed');
    });
  });

  describe('findOne', () => {
    it('should return a webhook by id', () => {
      const dto: CreateWebhookDto = {
        source: 'test',
        event: 'test.event',
        payload: { data: 'value' },
      };

      const created = service.create(dto);
      const found = service.findOne(created.id);

      expect(found.id).toBe(created.id);
      expect(found.source).toBe('test');
    });

    it('should throw NotFoundException for invalid uuid', () => {
      expect(() => service.findOne('invalid-id')).toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent webhook', () => {
      expect(() =>
        service.findOne('12345678-1234-4123-8123-123456789012'),
      ).toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a webhook', () => {
      const dto: CreateWebhookDto = {
        source: 'test',
        event: 'test.event',
        payload: {},
      };

      const created = service.create(dto);
      const result = service.delete(created.id);

      expect(result.message).toBe('Webhook deleted successfully');
      expect(storage.getById(created.id)).toBeUndefined();
    });

    it('should throw NotFoundException for invalid uuid', () => {
      expect(() => service.delete('invalid-id')).toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent webhook', () => {
      expect(() =>
        service.delete('12345678-1234-4123-8123-123456789012'),
      ).toThrow(NotFoundException);
    });
  });
});
