/**
 * Webhooks Module
 *
 * This module groups together all webhook-related components:
 * - Controller (HTTP endpoints)
 * - Service (business logic)
 * - Storage (data persistence)
 *
 * NestJS uses modules to organize the application into cohesive blocks.
 * Each module encapsulates a feature and its dependencies.
 *
 * @Module decorator configures:
 * - controllers: Classes that handle HTTP requests
 * - providers: Services that can be injected (dependency injection)
 * - exports: Services available to other modules that import this one
 */
import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhooksStorage } from './webhooks.storage';

@Module({
  /**
   * Controllers handle incoming HTTP requests
   * WebhooksController defines: POST, GET, DELETE /webhooks endpoints
   */
  controllers: [WebhooksController],

  /**
   * Providers are services that can be injected into other classes
   * NestJS automatically creates instances and injects them where needed
   *
   * WebhooksService: Business logic (create, find, delete webhooks)
   * WebhooksStorage: Data persistence (in-memory Map storage)
   */
  providers: [WebhooksService, WebhooksStorage],

  /**
   * Exports make services available to other modules
   * If another module imports WebhooksModule, it can inject WebhooksService
   */
  exports: [WebhooksService],
})
export class WebhooksModule {}
