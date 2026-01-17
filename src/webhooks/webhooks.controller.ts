import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { QueryWebhooksDto } from './dto/query-webhooks.dto';
import {
  Webhook,
  WebhookResponse,
  WebhooksListResponse,
} from './interfaces/webhook.interface';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createWebhookDto: CreateWebhookDto,
    @Headers('x-webhook-signature') signature?: string,
  ): WebhookResponse {
    return this.webhooksService.create(createWebhookDto, signature);
  }

  @Get()
  findAll(@Query() query: QueryWebhooksDto): WebhooksListResponse {
    return this.webhooksService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Webhook {
    return this.webhooksService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string): { message: string } {
    return this.webhooksService.delete(id);
  }
}
