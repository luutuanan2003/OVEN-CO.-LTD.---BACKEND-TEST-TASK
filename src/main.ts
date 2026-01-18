/**
 * Main Entry Point
 *
 * This is where the application starts. It:
 * 1. Loads environment variables from .env file
 * 2. Creates the NestJS application
 * 3. Configures middleware (security, validation, CORS)
 * 4. Starts listening for HTTP requests
 *
 * This file is executed when you run: npm run start:dev
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

// Load environment variables from .env file into process.env
// Must be called before accessing any process.env values
dotenv.config();

/**
 * Bootstrap function - initializes and starts the application
 *
 * Using async/await because NestFactory.create() is asynchronous
 */
async function bootstrap(): Promise<void> {
  // Create a logger for startup messages
  const logger = new Logger('Bootstrap');

  // Create the NestJS application instance
  // AppModule is the root module that imports all other modules
  const app = await NestFactory.create(AppModule);

  /**
   * Helmet Middleware
   *
   * Adds security HTTP headers to every response:
   * - X-Content-Type-Options: nosniff (prevents MIME type sniffing)
   * - X-Frame-Options: SAMEORIGIN (prevents clickjacking)
   * - X-XSS-Protection: 1; mode=block (XSS protection)
   * - And more...
   *
   * These headers protect against common web vulnerabilities.
   */
  app.use(helmet());

  /**
   * CORS (Cross-Origin Resource Sharing) Configuration
   *
   * Controls which domains can make requests to this API.
   * - origin: Which domains are allowed (* = all domains)
   * - methods: Which HTTP methods are allowed
   * - allowedHeaders: Which headers clients can send
   *
   * Important for browser-based clients calling this API.
   */
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-webhook-signature'],
  });

  /**
   * Global Validation Pipe
   *
   * Automatically validates all incoming request data using
   * class-validator decorators in DTOs.
   *
   * Options:
   * - whitelist: Remove properties not in the DTO (security)
   * - forbidNonWhitelisted: Throw error if extra properties sent
   * - transform: Auto-convert types (e.g., string "123" → number 123)
   * - enableImplicitConversion: Allow type conversion based on TS types
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Error if unknown properties sent
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert types automatically
      },
    }),
  );

  /**
   * Global API Prefix
   *
   * All routes will be prefixed with /api/v1
   * Example: /webhooks becomes /api/v1/webhooks
   *
   * Benefits:
   * - API versioning (can add /api/v2 later without breaking v1)
   * - Clear separation from static files or other routes
   */
  app.setGlobalPrefix('api/v1');

  // Get port from environment or default to 3000
  const port = process.env.PORT || 3000;

  // Start the HTTP server
  await app.listen(port);

  // Log startup info
  logger.log(`Webhook service running on port ${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

// Call the bootstrap function to start the application
bootstrap();
