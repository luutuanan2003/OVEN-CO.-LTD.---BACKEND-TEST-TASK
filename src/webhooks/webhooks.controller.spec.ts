/**
 * Webhooks Controller Tests
 *
 * These tests verify that the controller correctly:
 * - Handles HTTP requests
 * - Passes data to the service
 * - Returns the expected responses
 */
import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhooksStorage } from './webhooks.storage';

// describe() groups related tests together
describe('WebhooksController', () => {
  // Variables to hold our test instances
  let controller: WebhooksController;
  let service: WebhooksService;

  // beforeEach() runs before EVERY test
  // Sets up a fresh controller and service for each test
  beforeEach(async () => {
    // Create a testing module (mini NestJS app for testing)
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [WebhooksService, WebhooksStorage],
    }).compile();

    // Get instances from the testing module
    controller = module.get<WebhooksController>(WebhooksController);
    service = module.get<WebhooksService>(WebhooksService);
  });

  // ==================== POST /webhooks Tests ====================
  describe('create', () => {
    /**
     * Test: Basic webhook creation
     *
     * When we POST a webhook, we should get back:
     * - An 'id' (the generated UUID)
     * - A 'message' saying "Webhook received"
     */
    it('should create a webhook', () => {
      // Arrange: Set up test data
      const dto = {
        source: 'stripe',
        event: 'payment.completed',
        payload: { amount: 100 },
      };

      // Act: Call the controller method
      const result = controller.create(dto);

      // Assert: Check the response is correct
      expect(result).toHaveProperty('id'); // Should have an id
      expect(result.message).toBe('Webhook received'); // Should have this message
    });

    /**
     * Test: Signature header is passed to service
     *
     * When we include an x-webhook-signature header,
     * the controller should pass it to the service for verification
     */
    it('should pass signature header to service', () => {
      // Arrange: Set up test data
      const dto = {
        source: 'stripe',
        event: 'payment.completed',
        payload: { amount: 100 },
      };
      const signature = 'abc123signature';

      // Spy on the service's create method to see what it receives
      const createSpy = jest.spyOn(service, 'create');

      // Act: Call controller with signature
      controller.create(dto, signature);

      // Assert: Service was called with both dto AND signature
      expect(createSpy).toHaveBeenCalledWith(dto, signature);
    });
  });

  // ==================== GET /webhooks Tests ====================
  describe('findAll', () => {
    /**
     * Test: List webhooks returns paginated response
     *
     * The response should include:
     * - webhooks: array of webhook objects
     * - count: number of items in this page
     * - page: current page number
     * - limit: items per page
     * - totalPages: total number of pages
     */
    it('should return paginated webhooks list', () => {
      // Arrange: Create a webhook first so there's data to return
      controller.create({
        source: 'test',
        event: 'test.event',
        payload: {},
      });

      // Act: Get the list of webhooks
      const result = controller.findAll({ page: 1, limit: 10 });

      // Assert: Response has all pagination properties
      expect(result).toHaveProperty('webhooks');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });
  });

  // ==================== GET /webhooks/:id Tests ====================
  describe('findOne', () => {
    /**
     * Test: Get single webhook by ID
     *
     * When we request a specific webhook by ID,
     * we should get back that exact webhook with all its data
     */
    it('should return a webhook by id', () => {
      // Arrange: Create a webhook and save its ID
      const created = controller.create({
        source: 'test',
        event: 'test.event',
        payload: {},
      });

      // Act: Fetch the webhook by its ID
      const result = controller.findOne(created.id);

      // Assert: We got the right webhook back
      expect(result.id).toBe(created.id); // Same ID
      expect(result.source).toBe('test'); // Same source
    });
  });

  // ==================== DELETE /webhooks/:id Tests ====================
  describe('delete', () => {
    /**
     * Test: Delete a webhook
     *
     * When we delete a webhook by ID,
     * we should get a success message back
     */
    it('should delete a webhook', () => {
      // Arrange: Create a webhook to delete
      const created = controller.create({
        source: 'test',
        event: 'test.event',
        payload: {},
      });

      // Act: Delete the webhook
      const result = controller.delete(created.id);

      // Assert: Got success message
      expect(result.message).toBe('Webhook deleted successfully');
    });
  });
});
