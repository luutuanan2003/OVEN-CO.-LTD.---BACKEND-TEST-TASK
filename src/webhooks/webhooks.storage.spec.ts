import { WebhooksStorage } from './webhooks.storage';
import { Webhook } from './interfaces/webhook.interface';

describe('WebhooksStorage', () => {
  let storage: WebhooksStorage;

  beforeEach(() => {
    storage = new WebhooksStorage();
  });

  afterEach(() => {
    storage.clear();
  });

  const createTestWebhook = (id: string, overrides?: Partial<Webhook>): Webhook => ({
    id,
    source: 'test',
    event: 'test.event',
    payload: {},
    receivedAt: new Date(),
    verified: false,
    ...overrides,
  });

  describe('save', () => {
    it('should save a webhook', () => {
      const webhook = createTestWebhook('test-1');

      storage.save(webhook);

      expect(storage.getById('test-1')).toEqual(webhook);
    });

    it('should return the saved webhook', () => {
      const webhook = createTestWebhook('test-1');

      const result = storage.save(webhook);

      expect(result).toEqual(webhook);
    });
  });

  describe('getAll', () => {
    it('should return all webhooks', () => {
      storage.save(createTestWebhook('test-1'));
      storage.save(createTestWebhook('test-2'));
      storage.save(createTestWebhook('test-3'));

      const { webhooks, total } = storage.getAll();

      expect(webhooks).toHaveLength(3);
      expect(total).toBe(3);
    });

    it('should paginate results', () => {
      for (let i = 1; i <= 25; i++) {
        storage.save(createTestWebhook(`test-${i}`));
      }

      const { webhooks, total } = storage.getAll({ page: 2, limit: 10 });

      expect(webhooks).toHaveLength(10);
      expect(total).toBe(25);
    });

    it('should filter by source', () => {
      storage.save(createTestWebhook('test-1', { source: 'stripe' }));
      storage.save(createTestWebhook('test-2', { source: 'github' }));
      storage.save(createTestWebhook('test-3', { source: 'stripe' }));

      const { webhooks, total } = storage.getAll({ source: 'stripe' });

      expect(webhooks).toHaveLength(2);
      expect(total).toBe(2);
      webhooks.forEach((w) => expect(w.source).toBe('stripe'));
    });

    it('should filter by event', () => {
      storage.save(createTestWebhook('test-1', { event: 'payment.completed' }));
      storage.save(createTestWebhook('test-2', { event: 'payment.failed' }));

      const { webhooks } = storage.getAll({ event: 'payment.completed' });

      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].event).toBe('payment.completed');
    });

    it('should sort by receivedAt descending', () => {
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-06-01');

      storage.save(createTestWebhook('old', { receivedAt: oldDate }));
      storage.save(createTestWebhook('new', { receivedAt: newDate }));

      const { webhooks } = storage.getAll();

      expect(webhooks[0].id).toBe('new');
      expect(webhooks[1].id).toBe('old');
    });
  });

  describe('getById', () => {
    it('should return webhook by id', () => {
      const webhook = createTestWebhook('test-1');
      storage.save(webhook);

      const result = storage.getById('test-1');

      expect(result).toEqual(webhook);
    });

    it('should return undefined for non-existent id', () => {
      const result = storage.getById('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('count', () => {
    it('should return 0 for empty storage', () => {
      expect(storage.count()).toBe(0);
    });

    it('should return correct count', () => {
      storage.save(createTestWebhook('test-1'));
      storage.save(createTestWebhook('test-2'));

      expect(storage.count()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all webhooks', () => {
      storage.save(createTestWebhook('test-1'));
      storage.save(createTestWebhook('test-2'));

      storage.clear();

      expect(storage.count()).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete a webhook by id', () => {
      storage.save(createTestWebhook('test-1'));

      const result = storage.delete('test-1');

      expect(result).toBe(true);
      expect(storage.getById('test-1')).toBeUndefined();
    });

    it('should return false for non-existent id', () => {
      const result = storage.delete('non-existent');

      expect(result).toBe(false);
    });
  });
});
