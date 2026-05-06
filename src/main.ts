import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppLogger } from './common/logger/app.logger';
import { setupProcessErrorHandlers } from './common/process/process-error-handlers';
import { getErrorMessage, getErrorStack } from './common/utils/error-details';

async function bootstrap() {
  dotenv.config();
  const logger = new AppLogger();

  try {
    const app = await NestFactory.create(AppModule, { logger });
    app.enableShutdownHooks();

    const adapterHost = app.get(HttpAdapterHost);
    setupProcessErrorHandlers(app, logger);
    app.useGlobalFilters(new GlobalExceptionFilter(adapterHost, logger));
    app.useGlobalInterceptors(new LoggingInterceptor(adapterHost, logger));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Knowledge Hub API')
      .setDescription('Nest.js Knowledge Hub REST API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        'access-token',
      )
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

    const openApiYamlPath = path.join(process.cwd(), 'doc', 'api.yaml');
    const openApiYamlText = fs.readFileSync(openApiYamlPath, 'utf8');
    const openApiYamlDocument = parseYaml(openApiYamlText) as OpenAPIObject;

    SwaggerModule.setup('doc', app, swaggerDocument);
    SwaggerModule.setup('doc-manual', app, openApiYamlDocument);

    const port = Number(process.env.PORT ?? 4000);
    await app.listen(port);
  } catch (error) {
    logger.error(`Bootstrap failed: ${getErrorMessage(error)}`, getErrorStack(error), 'Bootstrap');
    process.exit(1);
  }
}

void bootstrap();
