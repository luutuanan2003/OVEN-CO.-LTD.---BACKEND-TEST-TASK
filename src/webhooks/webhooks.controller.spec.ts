import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhooksStorage } from './webhooks.storage';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let service: WebhooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [WebhooksService, WebhooksStorage],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    service = module.get<WebhooksService>(WebhooksService);
  });

  describe('create', () => {
    it('should create a webhook', () => {
      const dto = {
        source: 'stripe',
        event: 'payment.completed',
        payload: { amount: 100 },
      };

      const result = controller.create(dto);

      expect(result).toHaveProperty('id');
      expect(result.message).toBe('Webhook received');
    });

    it('should pass signature header to service', () => {
      const dto = {
        source: 'stripe',
        event: 'payment.completed',
        payload: { amount: 100 },
      };
      const signature = 'abc123signature';

      const createSpy = jest.spyOn(service, 'create');
      controller.create(dto, signature);

      expect(createSpy).toHaveBeenCalledWith(dto, signature);
    });
  });

  describe('findAll', () => {
    it('should return paginated webhooks list', () => {
      controller.create({
        source: 'test',
        event: 'test.event',
        payload: {},
      });

      const result = controller.findAll({ page: 1, limit: 10 });

      expect(result).toHaveProperty('webhooks');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });
  });

  describe('findOne', () => {
    it('should return a webhook by id', () => {
      const created = controller.create({
        source: 'test',
        event: 'test.event',
        payload: {},
      });

      const result = controller.findOne(created.id);

      expect(result.id).toBe(created.id);
      expect(result.source).toBe('test');
    });
  });

  describe('delete', () => {
    it('should delete a webhook', () => {
      const created = controller.create({
        source: 'test',
        event: 'test.event',
        payload: {},
      });

      const result = controller.delete(created.id);

      expect(result.message).toBe('Webhook deleted successfully');
    });
  });
});
