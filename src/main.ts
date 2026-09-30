import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validacion global: los DTOs con decoradores de class-validator
  // se aplican solos, sin escribir un if a mano en el controlador.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // borra campos que no estan en el DTO
      forbidNonWhitelisted: true, // 400 si llegan campos extra
      transform: true, // convierte el JSON en instancia del DTO
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API de Productos')
    .setDescription('CRUD de productos - Semana 2, Integracion de Sistemas')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
