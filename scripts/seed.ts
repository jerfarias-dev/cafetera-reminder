import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CafeteraService } from '../src/cafetera/cafetera.service';
import { TipoDia } from '../src/entities';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const cafeteraService = app.get(CafeteraService);

  console.log('Iniciando seed de la base de datos...');

  try {
    // Crear personas
    const personas = await Promise.all([
      cafeteraService.crearPersona('Juan Pérez', '+1234567890'),
      cafeteraService.crearPersona('María González', '+0987654321'),
      cafeteraService.crearPersona('Carlos Rodríguez'),
      cafeteraService.crearPersona('Ana Martínez', '+1122334455'),
      cafeteraService.crearPersona('Luis López', '+5566778899'),
    ]);

    console.log('Personas creadas:', personas.length);

    // Crear días y turnos para los próximos 10 días
    const hoy = new Date();
    const diasCreados: any[] = [];
    const turnosCreados: any[] = [];

    for (let i = 0; i < 10; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      const fechaString = fecha.toISOString().split('T')[0];
      
      // Determinar tipo de día
      const diaSemana = fecha.getDay();
      let tipoDia: TipoDia;
      let descripcion: string | undefined;

      if (diaSemana === 0 || diaSemana === 6) {
        tipoDia = TipoDia.FIN_SEMANA;
      } else {
        tipoDia = TipoDia.LABORAL;
      }

      // Crear día
      const dia = await cafeteraService.crearDia(fechaString, tipoDia, descripcion);
      diasCreados.push(dia);

      // Si es día laboral, crear turno
      if (tipoDia === TipoDia.LABORAL) {
        const personaIndex = i % personas.length;
        const turno = await cafeteraService.crearTurno(
          fechaString,
          personas[personaIndex].id
        );
        turnosCreados.push(turno);
      }
    }

    console.log('Días creados:', diasCreados.length);
    console.log('Turnos creados:', turnosCreados.length);

    // Crear algunos días especiales (asuetos)
    await cafeteraService.crearDia('2024-12-25', TipoDia.ASUETO, 'Navidad');
    await cafeteraService.crearDia('2024-01-01', TipoDia.ASUETO, 'Año Nuevo');
    await cafeteraService.crearDia('2024-09-16', TipoDia.ASUETO, 'Día de la Independencia');

    console.log('Días especiales creados');
    console.log('Seed completado exitosamente');

  } catch (error) {
    console.error('Error durante el seed:', error);
  }

  await app.close();
}

seed();