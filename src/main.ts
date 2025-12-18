import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { useContainer } from 'class-validator';
import * as cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;

  app.use(cookieParser());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const incoming = req.get('x-request-id');
    const requestId =
      typeof incoming === 'string' && incoming.trim()
        ? incoming.trim()
        : randomUUID();
    const reqWithId = req as Request & { requestId?: string };
    reqWithId.requestId = requestId;
    res.set('x-request-id', requestId);
    next();
  });
  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:19006',
    ],
    credentials: true,
  });

  // Enable DI in class-validator custom validators
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('TripMaster API')
    .setDescription(
      'Comprehensive travel planning platform API with AI-powered itinerary generation',
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    })
    .addTag('Authentication', 'User authentication and account management')
    .addTag('Users', 'User profile and preference operations')
    .addTag('Trips', 'Trip planning and management')
    .addServer(`http://localhost:${port}/`, 'Development Server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(port);
  console.log(
    `🚀 TripMaster API is running on: http://localhost:${port}/api/v1`,
  );
  console.log(
    `📚 API Documentation available at: http://localhost:${port}/api-docs`,
  );
}

void bootstrap();
