import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { method, url } = request;
    const start = Date.now();

    this.logger.log(`--> ${method} ${url}`);

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log(
            `<-- ${method} ${url} ${response.statusCode} ${Date.now() - start}ms`,
          ),
        error: (err: unknown) => {
          const status = err instanceof HttpException ? err.getStatus() : 500;
          this.logger.error(
            `<-- ${method} ${url} ${status} ${Date.now() - start}ms`,
          );
        },
      }),
    );
  }
}
