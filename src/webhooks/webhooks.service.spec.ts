/**
 * Webhooks Service Tests
 *
 * These tests verify the business logic layer:
 * - Creating webhooks with proper UUIDs
 * - Storing webhooks correctly
 * - Finding webhooks (with pagination and filtering)
 * - Deleting webhooks
 * - Error handling (404 for not found)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksStorage } from './webhooks.storage';
import { CreateWebhookDto } from './dto/create-webhook.dto';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let storage: WebhooksStorage;

  // beforeEach: Runs before EVERY test - creates fresh instances
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhooksService, WebhooksStorage],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    storage = module.get<WebhooksStorage>(WebhooksStorage);
  });

  // afterEach: Runs after EVERY test - cleans up storage
  // This ensures tests don't affect each other
  afterEach(() => {
    storage.clear();
  });

  // ==================== create() Tests ====================
  describe('create', () => {
    /**
     * Test: Create returns id and message
     *
     * When we create a webhook, we should get:
     * - A valid UUID v4 id
     * - Message "Webhook received"
     */
    it('should create a webhook and return id and message', () => {
      // Arrange: Create test data
      const dto: CreateWebhookDto = {
        source: 'stripe',
        event: 'payment.completed',
        payload: { amount: 100 },
      };

      // Act: Create the webhook
      const result = service.create(dto);

      // Assert: Check response
      expect(result).toHaveProperty('id');
      expect(result.message).toBe('Webhook received');
      // Check that id matches UUID v4 format
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    /**
     * Test: Webhook is actually saved in storage
     *
     * After creating, we should be able to retrieve it from storage
     * with all the original data intact
     */
    it('should store the webhook in storage', () => {
      // Arrange
      const dto: CreateWebhookDto = {
        source: 'github',
        event: 'push',
        payload: { branch: 'main' },
      };

      // Act: Create and then retrieve from storage
      const result = service.create(dto);
      const stored = storage.getById(result.id);

      // Assert: Data was stored correctly
      expect(stored).toBeDefined();
      expect(stored?.source).toBe('github');
      expect(stored?.event).toBe('push');
      expect(stored?.payload).toEqual({ branch: 'main' });
    });

    /**
     * Test: Verified is false without signature
     *
     * When no signature is provided, the webhook should be
     * marked as verified: false (can't verify without signature)
     */
    it('should set verified to false when no signature provided', () => {
      // Arrange
      const dto: CreateWebhookDto = {
        source: 'test',
        event: 'test.event',
        payload: {},
      };

      // Act: Create without signature
      const result = service.create(dto);
      const stored = storage.getById(result.id);

      // Assert: verified should be false
      expect(stored?.verified).toBe(false);
    });
  });

  // ==================== findAll() Tests ====================
  describe('findAll', () => {
    /**
     * Test: Pagination works correctly
     *
     * With 15 webhooks and limit=10:
     * - Page 1 should have 10 items
     * - totalPages should be 2 (ceil(15/10) = 2)
     */
    it('should return paginated webhooks', () => {
      // Arrange: Create 15 webhooks
      for (let i = 0; i < 15; i++) {
        service.create({
          source: 'test',
          event: `event.${i}`,
          payload: { index: i },
        });
      }

      // Act: Get first page with limit 10
      const result = service.findAll({ page: 1, limit: 10 });

      // Assert: Pagination is correct
      expect(result.webhooks).toHaveLength(10); // 10 items on page 1
      expect(result.count).toBe(10); // Count of items on this page
      expect(result.totalPages).toBe(2); // 15 items / 10 per page = 2 pages
    });

    /**
     * Test: Filter by source
     *
     * When filtering by source='stripe', only Stripe webhooks
     * should be returned
     */
    it('should filter by source', () => {
      // Arrange: Create webhooks from different sources
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

      // Act: Filter by source='stripe'
      const result = service.findAll({ source: 'stripe' });

      // Assert: Only stripe webhooks returned
      expect(result.webhooks).toHaveLength(1);
      expect(result.webhooks[0].source).toBe('stripe');
    });

    /**
     * Test: Filter by event type
     *
     * When filtering by event='payment.completed', only matching
     * webhooks should be returned
     */
    it('should filter by event', () => {
      // Arrange: Create webhooks with different events
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

      // Act: Filter by event
      const result = service.findAll({ event: 'payment.completed' });

      // Assert: Only matching event returned
      expect(result.webhooks).toHaveLength(1);
      expect(result.webhooks[0].event).toBe('payment.completed');
    });
  });

  // ==================== findOne() Tests ====================
  describe('findOne', () => {
    /**
     * Test: Find webhook by ID
     *
     * When we request a webhook by its ID, we should get
     * the complete webhook object back
     */
    it('should return a webhook by id', () => {
      // Arrange: Create a webhook
      const dto: CreateWebhookDto = {
        source: 'test',
        event: 'test.event',
        payload: { data: 'value' },
      };
      const created = service.create(dto);

      // Act: Find it by ID
      const found = service.findOne(created.id);

      // Assert: Got the right webhook
      expect(found.id).toBe(created.id);
      expect(found.source).toBe('test');
    });

    /**
     * Test: Invalid UUID throws 404
     *
     * If someone passes a malformed ID (not a UUID),
     * we should throw NotFoundException (404)
     */
    it('should throw NotFoundException for invalid uuid', () => {
      // Act & Assert: Expect error to be thrown
      expect(() => service.findOne('invalid-id')).toThrow(NotFoundException);
    });

    /**
     * Test: Non-existent webhook throws 404
     *
     * If someone passes a valid UUID format but the webhook
     * doesn't exist, we should throw NotFoundException (404)
     */
    it('should throw NotFoundException for non-existent webhook', () => {
      // Act & Assert: Valid UUID format but doesn't exist
      expect(() =>
        service.findOne('12345678-1234-4123-8123-123456789012'),
      ).toThrow(NotFoundException);
    });
  });

  // ==================== delete() Tests ====================
  describe('delete', () => {
    /**
     * Test: Successfully delete a webhook
     *
     * After deletion:
     * - Should get success message
     * - Webhook should no longer exist in storage
     */
    it('should delete a webhook', () => {
      // Arrange: Create a webhook
      const dto: CreateWebhookDto = {
        source: 'test',
        event: 'test.event',
        payload: {},
      };
      const created = service.create(dto);

      // Act: Delete it
      const result = service.delete(created.id);

      // Assert: Deleted successfully
      expect(result.message).toBe('Webhook deleted successfully');
      expect(storage.getById(created.id)).toBeUndefined(); // Gone from storage
    });

    /**
     * Test: Invalid UUID throws 404
     */
    it('should throw NotFoundException for invalid uuid', () => {
      expect(() => service.delete('invalid-id')).toThrow(NotFoundException);
    });

    /**
     * Test: Non-existent webhook throws 404
     */
    it('should throw NotFoundException for non-existent webhook', () => {
      expect(() =>
        service.delete('12345678-1234-4123-8123-123456789012'),
      ).toThrow(NotFoundException);
    });
  });
});
