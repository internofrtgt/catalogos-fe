import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';

let app: any;

async function bootstrap() {
  if (!app) {
    // Debug environment variables
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

    app = await NestFactory.create(AppModule, new ExpressAdapter(), {
      cors: true,
      logger: ['error', 'warn', 'log'] // Enable log to see debug messages
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
  }
  return app;
}

export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  const server = app.getHttpServer();

  // Handle the request using the underlying server
  return new Promise((resolve, reject) => {
    server.emit('request', req, res);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}