/**
 * Create Webhook DTO (Data Transfer Object)
 *
 * This class defines the expected shape and validation rules for
 * incoming webhook creation requests. The decorators from class-validator
 * automatically validate the request body before it reaches the controller.
 *
 * If validation fails, NestJS returns a 400 Bad Request with error details.
 *
 * Example valid request body:
 * {
 *   "source": "stripe",
 *   "event": "payment.completed",
 *   "payload": { "amount": 1000, "currency": "usd" }
 * }
 */
import {
  IsString,
  IsNotEmpty,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateWebhookDto {
  /**
   * The source/origin of the webhook (e.g., "stripe", "github", "shopify")
   *
   * Validation rules:
   * - Must be a string
   * - Cannot be empty
   * - Must be between 1-100 characters
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  source!: string;

  /**
   * The event type (e.g., "payment.completed", "order.created", "push")
   *
   * Validation rules:
   * - Must be a string
   * - Cannot be empty
   * - Must be between 1-100 characters
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  event!: string;

  /**
   * The webhook payload - the actual data from the external service
   *
   * Validation rules:
   * - Must be an object (not array, string, number, etc.)
   * - Cannot be empty/null
   *
   * Note: We use Record<string, unknown> instead of 'any' for type safety
   */
  @IsObject()
  @IsNotEmpty()
  payload!: Record<string, unknown>;
}
