/**
 * Logging Interceptor
 *
 * This interceptor logs information about every HTTP request/response.
 * It runs for every request and measures response time.
 *
 * Log format:
 * GET /api/v1/webhooks 200 1234 - 15ms - ::1 - curl/7.79.1
 * [method] [url] [status] [content-length] - [response-time] - [client-ip] - [user-agent]
 *
 * Why use an interceptor for logging?
 * - Runs after the response is ready (can log status code and response time)
 * - Doesn't modify request/response, just observes
 * - Single place for all HTTP logging
 *
 * Interceptor lifecycle:
 * 1. Request comes in
 * 2. intercept() is called BEFORE controller
 * 3. Controller handles request
 * 4. tap() callback runs AFTER response is ready
 * 5. Response is sent to client
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  /** Logger with 'HTTP' prefix for easy filtering */
  private readonly logger = new Logger('HTTP');

  /**
   * Main interceptor method
   *
   * Called for every request. Uses RxJS to observe the response.
   *
   * @param context - Provides access to request/response objects
   * @param next - The next handler in the chain (eventually the controller)
   * @returns Observable that emits when the response is ready
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Get HTTP context
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Extract request info for logging
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';

    // Record start time to measure response duration
    const now = Date.now();

    // next.handle() passes control to the controller
    // .pipe(tap(...)) runs after the controller returns
    return next.handle().pipe(
      tap(() => {
        // This callback runs AFTER the response is ready

        // Get response info
        const { statusCode } = response;
        const contentLength = response.get('content-length') || 0;

        // Calculate how long the request took
        const responseTime = Date.now() - now;

        // Log the request/response info
        // Format: METHOD /path STATUS SIZE - TIMEms - IP - USER_AGENT
        this.logger.log(
          `${method} ${url} ${statusCode} ${contentLength} - ${responseTime}ms - ${ip} - ${userAgent}`,
        );
      }),
    );
  }
}
