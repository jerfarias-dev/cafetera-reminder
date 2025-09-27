import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CafeteraModule } from './cafetera/cafetera.module';
import { Persona, Dia, Turno } from './entities';
import { SimpleBotService } from './telegram/simple-bot.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forFeature([Persona, Dia, Turno]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [Persona, Dia, Turno],
        synchronize: true, //TODO: Solo para desarrollo, desactivar en producción
        logging: false,
        ssl: {
          rejectUnauthorized: false, // Necesario para Supabase
        },
      }),
    }),
    ScheduleModule.forRoot(),
    CafeteraModule,
  ],
  controllers: [AppController],
  providers: [AppService, SimpleBotService],
})
export class AppModule {}
