/**
 * Webhooks Storage Tests
 *
 * These tests verify the data storage layer:
 * - Saving webhooks
 * - Retrieving webhooks (all, by ID)
 * - Pagination and filtering
 * - Sorting by date
 * - Deleting and clearing
 */
import { WebhooksStorage } from './webhooks.storage';
import { Webhook } from './interfaces/webhook.interface';

describe('WebhooksStorage', () => {
  let storage: WebhooksStorage;

  // beforeEach: Create fresh storage for each test
  beforeEach(() => {
    storage = new WebhooksStorage();
  });

  // afterEach: Clean up after each test
  afterEach(() => {
    storage.clear();
  });

  /**
   * Helper function to create test webhooks
   *
   * Creates a webhook with default values that can be overridden.
   * Makes tests cleaner by not repeating all fields every time.
   *
   * Usage:
   *   createTestWebhook('test-1')  // Default values
   *   createTestWebhook('test-1', { source: 'stripe' })  // Override source
   */
  const createTestWebhook = (id: string, overrides?: Partial<Webhook>): Webhook => ({
    id,
    source: 'test',
    event: 'test.event',
    payload: {},
    receivedAt: new Date(),
    verified: false,
    ...overrides, // Spread operator: merge overrides into default object
  });

  // ==================== save() Tests ====================
  describe('save', () => {
    /**
     * Test: Webhook is saved and can be retrieved
     *
     * After saving, getById() should return the same webhook
     */
    it('should save a webhook', () => {
      // Arrange: Create a webhook
      const webhook = createTestWebhook('test-1');

      // Act: Save it
      storage.save(webhook);

      // Assert: Can retrieve it by ID
      expect(storage.getById('test-1')).toEqual(webhook);
    });

    /**
     * Test: save() returns the saved webhook
     *
     * Useful for chaining: const saved = storage.save(webhook);
     */
    it('should return the saved webhook', () => {
      // Arrange
      const webhook = createTestWebhook('test-1');

      // Act
      const result = storage.save(webhook);

      // Assert: Returns the same webhook
      expect(result).toEqual(webhook);
    });
  });

  // ==================== getAll() Tests ====================
  describe('getAll', () => {
    /**
     * Test: Returns all webhooks
     *
     * With 3 webhooks saved, getAll() should return all 3
     */
    it('should return all webhooks', () => {
      // Arrange: Save 3 webhooks
      storage.save(createTestWebhook('test-1'));
      storage.save(createTestWebhook('test-2'));
      storage.save(createTestWebhook('test-3'));

      // Act
      const { webhooks, total } = storage.getAll();

      // Assert
      expect(webhooks).toHaveLength(3);
      expect(total).toBe(3);
    });

    /**
     * Test: Pagination returns correct slice
     *
     * With 25 webhooks, page 2 with limit 10 should return items 11-20
     */
    it('should paginate results', () => {
      // Arrange: Save 25 webhooks
      for (let i = 1; i <= 25; i++) {
        storage.save(createTestWebhook(`test-${i}`));
      }

      // Act: Get page 2 with 10 items per page
      const { webhooks, total } = storage.getAll({ page: 2, limit: 10 });

      // Assert
      expect(webhooks).toHaveLength(10); // 10 items on page 2
      expect(total).toBe(25); // Total is still 25
    });

    /**
     * Test: Filter by source works
     *
     * Only webhooks matching the source filter should be returned
     */
    it('should filter by source', () => {
      // Arrange: Save webhooks with different sources
      storage.save(createTestWebhook('test-1', { source: 'stripe' }));
      storage.save(createTestWebhook('test-2', { source: 'github' }));
      storage.save(createTestWebhook('test-3', { source: 'stripe' }));

      // Act: Filter by source='stripe'
      const { webhooks, total } = storage.getAll({ source: 'stripe' });

      // Assert: Only 2 stripe webhooks
      expect(webhooks).toHaveLength(2);
      expect(total).toBe(2);
      webhooks.forEach((w) => expect(w.source).toBe('stripe'));
    });

    /**
     * Test: Filter by event works
     *
     * Only webhooks matching the event filter should be returned
     */
    it('should filter by event', () => {
      // Arrange
      storage.save(createTestWebhook('test-1', { event: 'payment.completed' }));
      storage.save(createTestWebhook('test-2', { event: 'payment.failed' }));

      // Act
      const { webhooks } = storage.getAll({ event: 'payment.completed' });

      // Assert
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].event).toBe('payment.completed');
    });

    /**
     * Test: Results sorted by date (newest first)
     *
     * The webhook with the newer receivedAt should come first
     */
    it('should sort by receivedAt descending', () => {
      // Arrange: Create webhooks with different dates
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-06-01');

      storage.save(createTestWebhook('old', { receivedAt: oldDate }));
      storage.save(createTestWebhook('new', { receivedAt: newDate }));

      // Act
      const { webhooks } = storage.getAll();

      // Assert: Newest first
      expect(webhooks[0].id).toBe('new'); // June comes first
      expect(webhooks[1].id).toBe('old'); // January comes second
    });
  });

  // ==================== getById() Tests ====================
  describe('getById', () => {
    /**
     * Test: Returns webhook by ID
     */
    it('should return webhook by id', () => {
      // Arrange
      const webhook = createTestWebhook('test-1');
      storage.save(webhook);

      // Act
      const result = storage.getById('test-1');

      // Assert
      expect(result).toEqual(webhook);
    });

    /**
     * Test: Returns undefined for non-existent ID
     *
     * If ID doesn't exist, should return undefined (not throw error)
     */
    it('should return undefined for non-existent id', () => {
      // Act
      const result = storage.getById('non-existent');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ==================== count() Tests ====================
  describe('count', () => {
    /**
     * Test: Empty storage returns 0
     */
    it('should return 0 for empty storage', () => {
      expect(storage.count()).toBe(0);
    });

    /**
     * Test: Returns correct count after saving
     */
    it('should return correct count', () => {
      // Arrange
      storage.save(createTestWebhook('test-1'));
      storage.save(createTestWebhook('test-2'));

      // Assert
      expect(storage.count()).toBe(2);
    });
  });

  // ==================== clear() Tests ====================
  describe('clear', () => {
    /**
     * Test: clear() removes all webhooks
     *
     * After clear(), count should be 0
     */
    it('should remove all webhooks', () => {
      // Arrange
      storage.save(createTestWebhook('test-1'));
      storage.save(createTestWebhook('test-2'));

      // Act
      storage.clear();

      // Assert
      expect(storage.count()).toBe(0);
    });
  });

  // ==================== delete() Tests ====================
  describe('delete', () => {
    /**
     * Test: delete() removes specific webhook
     *
     * Returns true if deleted, and webhook should be gone
     */
    it('should delete a webhook by id', () => {
      // Arrange
      storage.save(createTestWebhook('test-1'));

      // Act
      const result = storage.delete('test-1');

      // Assert
      expect(result).toBe(true); // Deletion succeeded
      expect(storage.getById('test-1')).toBeUndefined(); // It's gone
    });

    /**
     * Test: delete() returns false for non-existent ID
     *
     * If ID doesn't exist, should return false (nothing to delete)
     */
    it('should return false for non-existent id', () => {
      // Act
      const result = storage.delete('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });
});
