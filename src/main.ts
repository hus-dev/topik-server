import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { networkInterfaces } from 'os';

function getLanIp() {
  const nets = networkInterfaces();
  for (const interfaces of Object.values(nets)) {
    if (!interfaces) continue;
    for (const net of interfaces) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS 활성화
  app.enableCors();

  app.useStaticAssets(join(process.cwd(), 'test/photos'), {
    prefix: '/test/photos/',
  });

  app.useStaticAssets(join(process.cwd(), 'test/audio'), {
    prefix: '/test/audio/',
  });

  // 전역 유효성 검사 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성은 제거
      forbidNonWhitelisted: true, // DTO에 없는 속성이 들어오면 에러 발생
      transform: true, // 요청 데이터를 DTO 타입으로 자동 변환
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('TOPIK Server API')
    .setDescription('TOPIK Learning Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);

  const lanIp = getLanIp();
  console.log(`Server listening on http://${host}:${port}`);
  if (lanIp) {
    console.log(`LAN access URL: http://${lanIp}:${port}`);
  }
}
bootstrap();
