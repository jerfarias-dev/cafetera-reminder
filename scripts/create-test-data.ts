import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CafeteraService } from '../src/cafetera/cafetera.service';
import { TipoDia } from '../src/entities';

async function createTestData() {
  const app = await NestFactory.create(AppModule);
  const cafeteraService = app.get(CafeteraService);

  try {
    console.log('🔧 Creando datos de prueba para Supabase...');

    // Crear personas de prueba
    const persona1 = await cafeteraService.crearPersona('Juan Pérez Test', '123456789');
    const persona2 = await cafeteraService.crearPersona('María García Test', '987654321');
    const persona3 = await cafeteraService.crearPersona('Carlos López Test', '111222333');

    console.log('✅ Personas creadas:', [persona1.nombre, persona2.nombre, persona3.nombre]);

    // Crear días de prueba (incluyendo fechas actuales)
    const dia1 = await cafeteraService.crearDia('2025-09-26', TipoDia.LABORAL);
    const dia2 = await cafeteraService.crearDia('2025-09-27', TipoDia.LABORAL);
    const dia3 = await cafeteraService.crearDia('2025-09-28', TipoDia.FIN_SEMANA, 'Sábado');
    const dia4 = await cafeteraService.crearDia('2025-09-30', TipoDia.LABORAL);

    console.log('✅ Días creados:', [dia1.fecha, dia2.fecha, dia3.fecha, dia4.fecha]);

    // Crear turnos para días laborales
    const turno1 = await cafeteraService.crearTurno('2025-09-26', persona1.id);
    const turno2 = await cafeteraService.crearTurno('2025-09-27', persona2.id);
    const turno3 = await cafeteraService.crearTurno('2025-09-30', persona3.id);

    console.log('✅ Turnos creados:', [
      `${dia1.fecha} -> ${persona1.nombre}`,
      `${dia2.fecha} -> ${persona2.nombre}`,
      `${dia4.fecha} -> ${persona3.nombre}`
    ]);

    console.log('🎉 Datos de prueba creados exitosamente!');
    console.log('📋 Ahora puedes probar el endpoint /cafetera/recordatorio/manual');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Solución: Verifica que Supabase esté configurado correctamente en tu .env');
    }
  } finally {
    await app.close();
  }
}

createTestData();