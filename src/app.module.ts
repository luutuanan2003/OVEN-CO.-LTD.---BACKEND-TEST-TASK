/**
 * App Module (Root Module)
 *
 * This is the main/root module of the application.
 * It imports all feature modules and configures global providers.
 *
 * Global providers (using APP_* tokens) apply to ALL requests:
 * - APP_FILTER: Global exception handling
 * - APP_INTERCEPTOR: Global request/response interception
 * - APP_GUARD: Global request guards (like rate limiting)
 *
 * Module hierarchy:
 * AppModule (root)
 *   └── WebhooksModule (feature)
 *         ├── WebhooksController
 *         ├── WebhooksService
 *         └── WebhooksStorage
 */
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { WebhooksModule } from './webhooks/webhooks.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RateLimitGuard } from './common/guards/rate-limit.guard';

@Module({
  /**
   * Import feature modules
   * WebhooksModule brings in all webhook-related functionality
   */
  imports: [WebhooksModule],

  /**
   * Global providers that apply to ALL requests across the entire application
   * Using special tokens (APP_*) makes them global instead of module-scoped
   */
  providers: [
    /**
     * Global Exception Filter
     * Catches all errors and returns consistent JSON error responses
     * Prevents sensitive error details from leaking to clients
     */
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    /**
     * Global Logging Interceptor
     * Logs every HTTP request with method, path, status, and response time
     * Useful for monitoring and debugging
     */
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    /**
     * Global Rate Limit Guard
     * Limits requests per IP address to prevent abuse
     * Returns 429 Too Many Requests when limit exceeded
     */
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
