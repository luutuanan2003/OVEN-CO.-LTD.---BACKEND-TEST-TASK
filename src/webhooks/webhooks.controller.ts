/**
 * Webhooks Controller
 *
 * This is the HTTP layer - it handles incoming HTTP requests and routes
 * them to the appropriate service methods.
 *
 * The controller is responsible for:
 * - Defining routes/endpoints
 * - Extracting data from requests (body, params, query, headers)
 * - Returning responses with appropriate HTTP status codes
 *
 * It does NOT contain business logic - that's in the Service layer.
 *
 * @Controller('webhooks') sets the base route to /webhooks
 * Combined with global prefix, full paths are /api/v1/webhooks/*
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { QueryWebhooksDto } from './dto/query-webhooks.dto';
import {
  Webhook,
  WebhookResponse,
  WebhooksListResponse,
} from './interfaces/webhook.interface';

@Controller('webhooks')
export class WebhooksController {
  /**
   * Constructor - NestJS automatically injects the WebhooksService
   *
   * @param webhooksService - The service containing business logic
   */
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * POST /api/v1/webhooks
   *
   * Receive and store a new webhook from an external service.
   *
   * @Post() - Handles HTTP POST requests
   * @HttpCode(201) - Returns 201 Created instead of default 200 OK
   * @Body() - Extracts and validates the request body using CreateWebhookDto
   * @Headers('x-webhook-signature') - Extracts the signature header (optional)
   *
   * Example request:
   * POST /api/v1/webhooks
   * Headers: { "x-webhook-signature": "abc123..." }
   * Body: { "source": "stripe", "event": "payment.completed", "payload": {...} }
   *
   * @param createWebhookDto - Validated request body
   * @param signature - Optional signature header for verification
   * @returns { id: string, message: string }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createWebhookDto: CreateWebhookDto,
    @Headers('x-webhook-signature') signature?: string,
  ): WebhookResponse {
    return this.webhooksService.create(createWebhookDto, signature);
  }

  /**
   * GET /api/v1/webhooks
   *
   * Retrieve a paginated list of webhooks with optional filtering.
   *
   * @Get() - Handles HTTP GET requests to /webhooks
   * @Query() - Extracts and validates query parameters using QueryWebhooksDto
   *
   * Example requests:
   * GET /api/v1/webhooks                              - First 10 webhooks
   * GET /api/v1/webhooks?page=2&limit=20              - Page 2, 20 per page
   * GET /api/v1/webhooks?source=stripe                - Only Stripe webhooks
   * GET /api/v1/webhooks?source=stripe&event=payment  - Filtered by both
   *
   * @param query - Validated query parameters (page, limit, source, event)
   * @returns { webhooks: [], count: number, page: number, limit: number, totalPages: number }
   */
  @Get()
  findAll(@Query() query: QueryWebhooksDto): WebhooksListResponse {
    return this.webhooksService.findAll(query);
  }

  /**
   * GET /api/v1/webhooks/:id
   *
   * Retrieve a single webhook by its UUID.
   *
   * @Get(':id') - Handles GET requests with an ID parameter
   * @Param('id') - Extracts the 'id' from the URL path
   *
   * Example request:
   * GET /api/v1/webhooks/550e8400-e29b-41d4-a716-446655440000
   *
   * @param id - The webhook UUID from the URL
   * @returns The full Webhook object
   * @throws 404 Not Found if webhook doesn't exist
   */
  @Get(':id')
  findOne(@Param('id') id: string): Webhook {
    return this.webhooksService.findOne(id);
  }

  /**
   * DELETE /api/v1/webhooks/:id
   *
   * Delete a webhook by its UUID.
   *
   * @Delete(':id') - Handles DELETE requests with an ID parameter
   * @HttpCode(200) - Returns 200 OK (some prefer 204 No Content)
   * @Param('id') - Extracts the 'id' from the URL path
   *
   * Example request:
   * DELETE /api/v1/webhooks/550e8400-e29b-41d4-a716-446655440000
   *
   * @param id - The webhook UUID from the URL
   * @returns { message: "Webhook deleted successfully" }
   * @throws 404 Not Found if webhook doesn't exist
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string): { message: string } {
    return this.webhooksService.delete(id);
  }
}
