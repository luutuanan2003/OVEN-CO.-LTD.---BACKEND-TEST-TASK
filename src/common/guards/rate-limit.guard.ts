import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests: Map<string, RateLimitRecord> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor() {
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);
    const now = Date.now();

    const record = this.requests.get(clientIp);

    if (!record || now > record.resetTime) {
      this.requests.set(clientIp, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxRequests) {
      throw new HttpException(
        {
          message: 'Too many requests',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
