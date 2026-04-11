import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);

  const adapterHost = app.get(HttpAdapterHost);
  app.useGlobalInterceptors(new LoggingInterceptor(adapterHost));
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
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  const openApiYamlPath = path.join(process.cwd(), 'doc', 'api.yaml');
  const openApiYamlText = fs.readFileSync(openApiYamlPath, 'utf8');
  const openApiYamlDocument = parseYaml(openApiYamlText) as OpenAPIObject;

  SwaggerModule.setup('doc', app, swaggerDocument);
  SwaggerModule.setup('doc-yaml', app, openApiYamlDocument);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
}
bootstrap();
