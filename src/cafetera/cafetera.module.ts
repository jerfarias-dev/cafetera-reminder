import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CafeteraController } from './cafetera.controller';
import { CafeteraService } from './cafetera.service';
import { TelegramService } from '../telegram/telegram.service';
import { Persona, Dia, Turno } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Persona, Dia, Turno])
  ],
  controllers: [CafeteraController],
  providers: [CafeteraService, TelegramService],
  exports: [CafeteraService, TelegramService],
})
export class CafeteraModule {}