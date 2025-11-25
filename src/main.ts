import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración global de validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuración de CORS
  app.enableCors();

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Barbería')
    .setDescription(
      'API REST para gestión de barbería. Incluye catálogos, disponibilidad de citas, transacciones y ventas. ' +
      'Los endpoints están organizados en dos categorías: Internos (uso de la barbería) y Mall (integración con el centro comercial).',
    )
    .setVersion('1.0')
    .setContact('Barbería API', '', '')
    .addTag('1. Catálogo - Interno', 'Gestión de sucursales, servicios y barberos para uso interno')
    .addTag('2. Catálogo - Mall', 'Endpoints de catálogo para integración con el mall (Interface 3-4)')
    .addTag('3. Disponibilidad - Interno', 'Consulta de disponibilidad de citas para uso interno')
    .addTag('4. Disponibilidad - Mall', 'Consulta de disponibilidad para el mall (Interface 9-10)')
    .addTag('5. Ventas - Interno', 'Gestión de ventas usando IDs internos')
    .addTag('6. Ventas - Mall', 'Registro de ventas desde el mall (Interface 11 - REG_VTA_SERV)')
    .addTag('7. Transacciones', 'Gestión de transacciones de pago (Interface 1-2)')
    .addTag('8. Clientes', 'Gestión de clientes')
    .addTag('9. Horarios', 'Gestión de horarios de sucursales y barberos')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'API Barbería - Documentación',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Aplicación corriendo en: http://localhost:${port}`);
  console.log(`Documentación Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();

