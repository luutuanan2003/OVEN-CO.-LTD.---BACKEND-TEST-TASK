import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhooksStorage } from './webhooks.storage';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksStorage],
  exports: [WebhooksService],
})
export class WebhooksModule {}
