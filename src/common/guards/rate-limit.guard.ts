/**
 * Rate Limit Guard
 *
 * This guard protects the API from abuse by limiting how many requests
 * a single client (identified by IP address) can make in a time window.
 *
 * How it works:
 * 1. Tracks request counts per IP address
 * 2. Resets the count after the time window expires
 * 3. Returns 429 Too Many Requests if limit is exceeded
 *
 * Default: 100 requests per 60 seconds per IP
 *
 * Why rate limiting?
 * - Prevents denial of service (DoS) attacks
 * - Protects server resources
 * - Ensures fair usage among clients
 * - Required for production-ready APIs
 *
 * @Injectable() marks this as a NestJS service
 * CanActivate interface means this is a guard that can allow/deny requests
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Tracks rate limit data for a single IP address
 */
interface RateLimitRecord {
  /** Number of requests made in the current window */
  count: number;
  /** Timestamp (ms) when the window resets */
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  /**
   * In-memory storage of rate limit data per IP
   * Key: IP address, Value: { count, resetTime }
   */
  private readonly requests: Map<string, RateLimitRecord> = new Map();

  /** Maximum requests allowed per time window */
  private readonly maxRequests: number;

  /** Time window in milliseconds */
  private readonly windowMs: number;

  /**
   * Constructor - reads configuration from environment variables
   */
  constructor() {
    // Default: 100 requests per window
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
    // Default: 60 second (60000ms) window
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  }

  /**
   * Main guard method - called for every request
   *
   * NestJS calls this before the request reaches the controller.
   * Return true = allow request
   * Return false or throw = block request
   *
   * @param context - Provides access to the request object
   * @returns true if request is allowed
   * @throws HttpException with 429 status if rate limit exceeded
   */
  canActivate(context: ExecutionContext): boolean {
    // Get the Express request object
    const request = context.switchToHttp().getRequest<Request>();

    // Extract the client's IP address
    const clientIp = this.getClientIp(request);

    // Current timestamp
    const now = Date.now();

    // Look up existing rate limit record for this IP
    const record = this.requests.get(clientIp);

    // Case 1: No record exists, or the time window has expired
    if (!record || now > record.resetTime) {
      // Start a new tracking window
      this.requests.set(clientIp, {
        count: 1, // This is their first request in the new window
        resetTime: now + this.windowMs, // Window expires after windowMs
      });
      return true; // Allow the request
    }

    // Case 2: Rate limit exceeded
    if (record.count >= this.maxRequests) {
      // Calculate how many seconds until they can retry
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);

      // Throw 429 Too Many Requests
      throw new HttpException(
        {
          message: 'Too many requests',
          retryAfter: retryAfter, // Tell client when to retry
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Case 3: Still within limits - increment count and allow
    record.count++;
    return true;
  }

  /**
   * Extract the client's IP address from the request
   *
   * Handles both direct connections and requests through proxies/load balancers.
   * The X-Forwarded-For header contains the original client IP when behind a proxy.
   *
   * @param request - The Express request object
   * @returns The client's IP address as a string
   */
  private getClientIp(request: Request): string {
    // Check X-Forwarded-For header (set by proxies/load balancers)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
      // The first one is the original client IP
      return forwardedFor.split(',')[0].trim();
    }

    // Fall back to direct connection IP
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
