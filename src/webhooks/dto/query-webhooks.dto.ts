/**
 * Query Webhooks DTO (Data Transfer Object)
 *
 * This class defines the expected query parameters for the GET /webhooks endpoint.
 * It handles pagination (page, limit) and filtering (source, event).
 *
 * Example usage:
 * GET /api/v1/webhooks?page=2&limit=20&source=stripe&event=payment.completed
 */
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryWebhooksDto {
  /**
   * Page number for pagination (1-indexed)
   *
   * - Optional: defaults to 1
   * - @Transform: Converts string from URL query to number (query params are strings)
   * - Must be an integer >= 1
   *
   * Example: ?page=3 returns the 3rd page of results
   */
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Number of items per page
   *
   * - Optional: defaults to 10
   * - @Transform: Converts string from URL query to number
   * - Must be an integer between 1 and 100 (prevents fetching too many at once)
   *
   * Example: ?limit=50 returns 50 webhooks per page
   */
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  /**
   * Filter by webhook source
   *
   * - Optional: if not provided, returns webhooks from all sources
   * - Case-sensitive exact match
   *
   * Example: ?source=stripe returns only Stripe webhooks
   */
  @IsOptional()
  @IsString()
  source?: string;

  /**
   * Filter by event type
   *
   * - Optional: if not provided, returns all event types
   * - Case-sensitive exact match
   *
   * Example: ?event=payment.completed returns only payment.completed events
   */
  @IsOptional()
  @IsString()
  event?: string;
}
