import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Persona, Dia, Turno, TipoDia } from '../entities';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class CafeteraService {
  private readonly logger = new Logger(CafeteraService.name);

  constructor(
    @InjectRepository(Persona)
    private personaRepository: Repository<Persona>,
    @InjectRepository(Dia)
    private diaRepository: Repository<Dia>,
    @InjectRepository(Turno)
    private turnoRepository: Repository<Turno>,
    private telegramService: TelegramService,
  ) { }

  // Cron job que se ejecuta a las 9:00 AM y 3:00 PM, Lunes a Viernes
  @Cron('0 9,15 * * 1-5', {
    name: 'enviarRecordatoriosDiarios',
    timeZone: 'America/Mexico_City',
  })
  async enviarRecordatorioDiario(): Promise<void> {
    const fechaHoy = this.obtenerFechaActualMexico();

    try {
      // No sincronizar usuarios desde Telegram en el cron automático (false siempre)
      // La sincronización se puede hacer manualmente cuando sea necesario

      // Usar directamente la misma lógica que enviarRecordatorioManual
      // Sin crear días automáticamente - los días deben ser configurados manualmente
      await this.enviarRecordatorioManual(fechaHoy, true);

    } catch (error) {
      this.logger.error(`❌ Error en recordatorio automático para ${fechaHoy}:`, error.message);

      // Log adicional para debugging
      if (error.message.includes('No se encontró información')) {
        this.logger.warn(`💡 El día ${fechaHoy} no está configurado - créalo manualmente si es necesario`);
      } else if (error.message.includes('no se envía recordatorio')) {
        this.logger.log(`⏭️ ${fechaHoy} es día no hábil, esto es normal`);
      } else if (error.message.includes('No hay turno asignado')) {
        this.logger.warn(`💡 Considera asignar un turno para ${fechaHoy}`);
      }
    }
  }



  private async enviarRecordatorio(turno: Turno, isCron?: boolean): Promise<{
    success: boolean;
    method?: string;
    error?: string;
    details?: string;
  }> {
    try {
      const result = await this.telegramService.sendReminderMessage(
        turno.persona.nombre,
        turno.persona.telegram_chat_id,
        isCron,
      );

      if (result.success) {
        // Marcar como enviado
        turno.enviado = true;
        turno.fecha_envio = new Date();
        await this.turnoRepository.save(turno);

        this.logger.log(`✅ Recordatorio enviado a ${turno.persona.nombre} via mensaje directo`);
        return { success: true, method: 'direct' };
      } else {
        // Diferentes tipos de error con mensajes específicos
        let errorMsg = '';
        switch (result.method) {
          case 'no_telegram':
            errorMsg = `${turno.persona.nombre} no tiene Telegram registrado`;
            this.logger.warn(`⚠️ ${errorMsg} - ${result.details}`);
            break;
          case 'invalid_chat':
            errorMsg = `${turno.persona.nombre} tiene un Chat ID inválido`;
            this.logger.warn(`⚠️ ${errorMsg} - ${result.details}`);
            break;
          default:
            errorMsg = `Error enviando a ${turno.persona.nombre}`;
            this.logger.error(`❌ ${errorMsg}: ${result.error}`);
        }

        return {
          success: false,
          error: result.error,
          details: result.details
        };
      }
    } catch (error) {
      const errorMsg = `Error inesperado al enviar recordatorio a ${turno.persona.nombre}`;
      this.logger.error(`❌ ${errorMsg}:`, error);
      return {
        success: false,
        error: errorMsg,
        details: error.message
      };
    }
  }

  private async crearDiaAutomatico(fecha: string): Promise<Dia> {
    const date = new Date(fecha);
    const dayOfWeek = date.getDay(); // 0 = domingo, 6 = sábado

    let tipoDia: TipoDia;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      tipoDia = TipoDia.FIN_SEMANA;
    } else {
      tipoDia = TipoDia.LABORAL;
    }

    const nuevoDia = this.diaRepository.create({
      fecha,
      tipo_dia: tipoDia
    });

    return await this.diaRepository.save(nuevoDia);
  }

  // Método para obtener la fecha actual en zona horaria de México
  private obtenerFechaActualMexico(): string {
    const ahora = new Date();
    // México está en UTC-6, así que restamos 6 horas a UTC
    const offsetMexico = 6 * 60 * 60 * 1000; // 6 horas en milisegundos
    const fechaMexico = new Date(ahora.getTime() - offsetMexico);
    const resultado = fechaMexico.toISOString().split('T')[0];

    // Log para debugging
    this.logger.debug(`🕘 Fecha actual - UTC: ${ahora.toISOString().split('T')[0]}, México: ${resultado}`);

    return resultado;
  }

  // Métodos para gestionar el calendario
  async crearDia(fecha: string, tipoDia: TipoDia, descripcion?: string): Promise<Dia> {
    const dia = this.diaRepository.create({
      fecha,
      tipo_dia: tipoDia,
      descripcion
    });
    return await this.diaRepository.save(dia);
  }

  async obtenerDias(): Promise<Dia[]> {
    return await this.diaRepository.find({
      order: { fecha: 'ASC' }
    });
  }

  // Métodos para personas
  async crearPersona(nombre: string, telegramChatId?: string): Promise<Persona> {
    const persona = this.personaRepository.create({
      nombre,
      telegram_chat_id: telegramChatId
    });
    return await this.personaRepository.save(persona);
  }

  async obtenerPersonas(): Promise<Persona[]> {
    return await this.personaRepository.find({
      where: { activo: true },
      relations: ['turnos'],
    });
  }

  // Métodos para turnos
  async crearTurno(fechaString: string, personaId: number): Promise<Turno> {
    // Buscar o crear el día
    let dia = await this.diaRepository.findOne({
      where: { fecha: fechaString }
    });

    if (!dia) {
      dia = await this.crearDiaAutomatico(fechaString);
    }

    const turno = this.turnoRepository.create({
      dia_id: dia.id,
      persona_id: personaId,
    });
    return await this.turnoRepository.save(turno);
  }

  async obtenerTurnos(): Promise<Turno[]> {
    return await this.turnoRepository.find({
      relations: ['persona', 'dia'],
      order: { id: 'DESC' },
    });
  }

  async obtenerTurnosConDetalles(): Promise<Turno[]> {
    return await this.turnoRepository.find({
      relations: ['persona', 'dia'],
      order: { id: 'ASC' }
    });
  }

  // Método para envío manual
  async enviarRecordatorioManual(fecha?: string, isCron?: boolean): Promise<{
    mensaje: string;
    fecha: string;
    persona: {
      id: number;
      nombre: string;
      telegram_chat_id?: string;
    };
    dia: {
      tipo_dia: string;
      descripcion?: string;
    };
    enviado: boolean;
    fecha_envio: Date;
    telegram_status: {
      success: boolean;
      error?: string;
      details?: string;
    };
  }> {
    // Usar zona horaria de México para obtener la fecha actual
    const fechaBusqueda = fecha || this.obtenerFechaActualMexico();
    const dia = await this.diaRepository.findOne({
      where: { fecha: fechaBusqueda }
    });

    if (!dia) {
      throw new Error(`No se encontró información para la fecha: ${fechaBusqueda}`);
    }

    if (!dia.esHabil) {
      throw new Error(`El día ${fechaBusqueda} es ${dia.tipo_dia}, no se envía recordatorio`);
    }

    const turno = await this.turnoRepository.findOne({
      where: { dia_id: dia.id },
      relations: ['persona', 'dia']
    });

    if (!turno) {
      throw new Error(`No hay turno asignado para la fecha: ${fechaBusqueda}`);
    }

    const envioResult = await this.enviarRecordatorio(turno, isCron);

    // Recargar el turno para obtener la información actualizada
    const turnoActualizado = await this.turnoRepository.findOne({
      where: { dia_id: dia.id },
      relations: ['persona', 'dia']
    });

    if (!turnoActualizado) {
      throw new Error('Error al obtener información del turno después del envío');
    }

    // Preparar mensaje según el resultado
    let mensaje = '';
    if (envioResult.success) {
      mensaje = `✅ Recordatorio enviado exitosamente a ${turnoActualizado.persona.nombre}`;
    } else {
      mensaje = `❌ No se pudo enviar recordatorio a ${turnoActualizado.persona.nombre}: ${envioResult.error}`;
      if (envioResult.details) {
        mensaje += `\n💡 ${envioResult.details}`;
      }
    }

    return {
      mensaje,
      fecha: fechaBusqueda,
      persona: {
        id: turnoActualizado.persona.id,
        nombre: turnoActualizado.persona.nombre,
        telegram_chat_id: turnoActualizado.persona.telegram_chat_id
      },
      dia: {
        tipo_dia: turnoActualizado.dia.tipo_dia,
        descripcion: turnoActualizado.dia.descripcion
      },
      enviado: turnoActualizado.enviado,
      fecha_envio: turnoActualizado.fecha_envio || new Date(),
      telegram_status: {
        success: envioResult.success,
        error: envioResult.error,
        details: envioResult.details
      }
    };
  }

  // 🔗 Método para asociar chat_id con persona existente
  async asociarChatId(personaId: number, chatId: string): Promise<Persona> {
    try {
      const persona = await this.personaRepository.findOne({
        where: { id: personaId }
      });

      if (!persona) {
        throw new Error(`Persona con ID ${personaId} no encontrada`);
      }

      // Verificar si el chat_id ya está siendo usado por otra persona
      const existingPerson = await this.personaRepository.findOne({
        where: { telegram_chat_id: chatId }
      });

      if (existingPerson && existingPerson.id !== personaId) {
        throw new Error(`El Chat ID ya está asociado con ${existingPerson.nombre}`);
      }

      persona.telegram_chat_id = chatId;
      const savedPersona = await this.personaRepository.save(persona);

      this.logger.log(`🔗 Chat ID ${chatId} asociado con ${persona.nombre} (ID: ${personaId})`);

      return savedPersona;
    } catch (error) {
      this.logger.error('❌ Error asociando chat_id:', error);
      throw error;
    }
  }

  // 🔍 Verificar estado de Telegram de todas las personas
  async verificarEstadoTelegramPersonas() {
    try {
      const personas = await this.personaRepository.find();
      const result = await this.telegramService.verifyMultipleUsers(personas);

      this.logger.log(`📊 Estado Telegram verificado: ${result.con_telegram} activos, ${result.sin_telegram} sin Telegram, ${result.chat_invalido} con chat inválido`);

      return {
        ...result,
        recomendaciones: this.generarRecomendaciones(result.resultados)
      };
    } catch (error) {
      this.logger.error('❌ Error verificando estado de Telegram:', error);
      throw error;
    }
  }

  private generarRecomendaciones(resultados: Array<any>): string[] {
    const recomendaciones: string[] = [];

    const sinTelegram = resultados.filter(r => r.estado === 'sin_telegram');
    const chatInvalido = resultados.filter(r => r.estado === 'chat_invalido');

    if (sinTelegram.length > 0) {
      recomendaciones.push(
        `📱 ${sinTelegram.length} persona(s) necesitan registrarse en el bot de Telegram: ${sinTelegram.map(p => p.nombre).join(', ')}`
      );
    }

    if (chatInvalido.length > 0) {
      recomendaciones.push(
        `🔄 ${chatInvalido.length} persona(s) necesitan volver a registrarse (Chat ID inválido): ${chatInvalido.map(p => p.nombre).join(', ')}`
      );
    }

    if (sinTelegram.length === 0 && chatInvalido.length === 0) {
      recomendaciones.push('✅ Todos los usuarios están correctamente configurados para recibir recordatorios');
    }

    return recomendaciones;
  }

  // 📥 Sincronizar usuarios desde la API de Telegram
  async sincronizarUsuariosDesdeTelegram() {
    try {
      // Obtener usuarios desde Telegram
      const telegramData = await this.telegramService.getUpdatesFromTelegram();

      if (!telegramData.success || !telegramData.usuarios_encontrados) {
        throw new Error(telegramData.error || 'No se pudieron obtener usuarios de Telegram');
      }

      const usuariosTelegram = telegramData.usuarios_encontrados;
      this.logger.error(`📥 Procesando ${usuariosTelegram.length} usuarios encontrados en Telegram`);

      let nuevos = 0;
      let existentes = 0;
      let actualizados = 0;
      const resultados: Array<{
        chat_id: string;
        nombre: string;
        accion: 'creado' | 'actualizado' | 'ya_existia' | 'error';
        persona_id?: number;
        error?: string;
      }> = [];

      for (const userTelegram of usuariosTelegram) {
        try {
          // Verificar si ya existe una persona con este chat_id
          const personaExistente = await this.personaRepository.findOne({
            where: { telegram_chat_id: userTelegram.chat_id }
          });

          if (personaExistente) {
            // Usuario ya existe, verificar si necesita actualización
            existentes++;

            // Actualizar datos si es necesario (nombre, username)
            let actualizado = false;
            if (personaExistente.nombre.includes('(Temporal)') && !userTelegram.nombre.includes('Usuario')) {
              personaExistente.nombre = userTelegram.nombre;
              actualizado = true;
            }

            if (actualizado) {
              await this.personaRepository.save(personaExistente);
              actualizados++;
              this.logger.log(`🔄 Usuario actualizado: ${personaExistente.nombre} (${userTelegram.chat_id})`);
            }

            resultados.push({
              chat_id: userTelegram.chat_id,
              nombre: personaExistente.nombre,
              accion: actualizado ? 'actualizado' : 'ya_existia',
              persona_id: personaExistente.id
            });

          } else {
            // Usuario nuevo, crear registro
            const nuevaPersona = this.personaRepository.create({
              nombre: `${userTelegram.nombre}`,
              telegram_chat_id: userTelegram.chat_id,
              activo: true
            });

            const personaGuardada = await this.personaRepository.save(nuevaPersona);
            nuevos++;

            this.logger.log(`✅ Nuevo usuario registrado: ${nuevaPersona.nombre} (${userTelegram.chat_id}) - ID: ${personaGuardada.id}`);

            resultados.push({
              chat_id: userTelegram.chat_id,
              nombre: nuevaPersona.nombre,
              accion: 'creado',
              persona_id: personaGuardada.id
            });
          }

        } catch (error) {
          this.logger.error(`❌ Error procesando usuario ${userTelegram.chat_id}:`, error);
          resultados.push({
            chat_id: userTelegram.chat_id,
            nombre: userTelegram.nombre,
            accion: 'error',
            error: error.message
          });
        }

        // Pequeña pausa para no saturar la base de datos
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const resumen = {
        total_telegram: usuariosTelegram.length,
        nuevos,
        existentes,
        actualizados,
        errores: resultados.filter(r => r.accion === 'error').length,
        resultados
      };

      this.logger.log(`📊 Sincronización completada: ${nuevos} nuevos, ${existentes} existentes, ${actualizados} actualizados`);

      return resumen;

    } catch (error) {
      this.logger.error('❌ Error sincronizando usuarios desde Telegram:', error);
      throw error;
    }
  }
}