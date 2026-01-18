/**
 * HTTP Exception Filter
 *
 * This is a global exception filter that catches ALL errors thrown in the application
 * and converts them into consistent, well-formatted JSON error responses.
 *
 * Why use this?
 * - Provides consistent error response format across all endpoints
 * - Prevents sensitive error details from leaking to clients
 * - Logs unexpected errors for debugging
 * - Adds useful metadata (timestamp, path, method) to error responses
 *
 * @Catch() with no arguments means "catch everything" (not just HttpExceptions)
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  /** Logger for recording unexpected errors */
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Main exception handler method
   *
   * Called automatically by NestJS whenever an exception is thrown
   * that isn't caught elsewhere.
   *
   * @param exception - The error that was thrown (could be anything)
   * @param host - Provides access to the request/response objects
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    // Get HTTP-specific context (request and response objects)
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;

    // Check if this is a known HTTP exception (404, 400, etc.)
    if (exception instanceof HttpException) {
      // Known HTTP exception - use its status and message
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // The response could be a string or an object with message/error properties
      message =
        typeof exceptionResponse === 'object'
          ? exceptionResponse
          : { message: exceptionResponse };
    } else {
      // Unknown/unexpected error - treat as 500 Internal Server Error
      // IMPORTANT: Don't expose internal error details to clients!
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = { message: 'Internal server error' };

      // Log the actual error for debugging (server-side only)
      this.logger.error(
        `Unexpected error: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Build the standardized error response
    const errorResponse = {
      statusCode: status, // HTTP status code (404, 400, 500, etc.)
      timestamp: new Date().toISOString(), // When the error occurred
      path: request.url, // Which endpoint was called
      method: request.method, // HTTP method (GET, POST, etc.)
      ...(typeof message === 'object' ? message : { message }), // Error details
    };

    // Send the JSON error response
    response.status(status).json(errorResponse);
  }
}
