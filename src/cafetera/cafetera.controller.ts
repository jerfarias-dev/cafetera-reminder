import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  ParseIntPipe,
  Logger,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { CafeteraService } from './cafetera.service';
import { TelegramService } from '../telegram/telegram.service';
import { TipoDia } from '../entities';

@Controller('cafetera')
export class CafeteraController {
  private readonly logger = new Logger(CafeteraController.name);

  constructor(
    private readonly cafeteraService: CafeteraService,
    private readonly telegramService: TelegramService
  ) {}

  @Get('personas')
  async obtenerPersonas() {
    try {
      return await this.cafeteraService.obtenerPersonas();
    } catch (error) {
      this.logger.error('Error obteniendo personas:', error);
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('personas')
  async crearPersona(@Body() createPersonaDto: { 
    nombre: string; 
    telegramChatId?: string;
  }) {
    try {
      const { nombre, telegramChatId } = createPersonaDto;
      return await this.cafeteraService.crearPersona(nombre, telegramChatId);
    } catch (error) {
      this.logger.error('Error creando persona:', error);
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('turnos')
  async obtenerTurnos() {
    try {
      return await this.cafeteraService.obtenerTurnos();
    } catch (error) {
      this.logger.error('Error obteniendo turnos:', error);
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('turnos')
  async crearTurno(@Body() createTurnoDto: { 
    fecha: string; 
    personaId: number; 
  }) {
    try {
      const { fecha, personaId } = createTurnoDto;
      return await this.cafeteraService.crearTurno(fecha, personaId);
    } catch (error) {
      this.logger.error('Error creando turno:', error);
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dias')
  async obtenerDias() {
    try {
      return await this.cafeteraService.obtenerDias();
    } catch (error) {
      this.logger.error('Error obteniendo días:', error);
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('dias')
  async crearDia(@Body() createDiaDto: { 
    fecha: string; 
    tipoDia: TipoDia;
    descripcion?: string;
  }) {
    try {
      const { fecha, tipoDia, descripcion } = createDiaDto;
      return await this.cafeteraService.crearDia(fecha, tipoDia, descripcion);
    } catch (error) {
      this.logger.error('Error creando día:', error);
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('recordatorio/manual')
  async enviarRecordatorioManual(@Body() body?: { fecha?: string; sincronizar?: boolean }) {
    try {
      const fecha = body?.fecha;
      const sincronizar = body?.sincronizar !== false;
      
      let sincronizacionResult: any = null;
      
      // Sincronizar usuarios desde Telegram antes de enviar recordatorio
      if (sincronizar) {
        try {
          sincronizacionResult = await this.cafeteraService.sincronizarUsuariosDesdeTelegram();
        } catch (syncError) {
          sincronizacionResult = { 
            error: syncError.message,
            nuevos: 0, 
            actualizados: 0, 
            existentes: 0 
          };
        }
      }
      
      // Enviar recordatorio
      const result = await this.cafeteraService.enviarRecordatorioManual(fecha);
      
      // Incluir información de sincronización en la respuesta
      return {
        ...result,
        sincronizacion: sincronizar ? {
          ejecutada: true,
          ...(sincronizacionResult || {})
        } : {
          ejecutada: false,
          motivo: 'Deshabilitada en la petición'
        }
      };
    } catch (error) {
      this.logger.error('Error enviando recordatorio manual:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor', 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('telegram/test')
  async testTelegram() {
    try {
      // Este método necesita ser importado del TelegramService
      return { message: 'Test de Telegram - funcionalidad pendiente de implementar' };
    } catch (error) {
      this.logger.error('Error en test de Telegram:', error);
      throw new HttpException('Error en test de Telegram', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('telegram/test-mensaje')
  async testMensaje(@Body() body: { 
    nombre?: string; 
    chatId?: string; 
  }) {
    try {
      const { nombre = 'Usuario de Prueba', chatId } = body;
      // Aquí llamaríamos al método de testing del TelegramService
      return { 
        message: 'Test de mensaje enviado',
        nombre,
        chatId
      };
    } catch (error) {
      this.logger.error('Error enviando mensaje de prueba:', error);
      throw new HttpException('Error enviando mensaje de prueba', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('telegram/registrados')
  async obtenerUsuariosRegistrados() {
    try {
      const personas = await this.cafeteraService.obtenerPersonas();
      const registrados = personas.filter(p => p.telegram_chat_id);
      const temporales = registrados.filter(p => p.nombre.includes('Temporal'));
      const asociados = registrados.filter(p => !p.nombre.includes('Temporal'));
      
      return {
        total: registrados.length,
        asociados: asociados.length,
        pendientes: temporales.length,
        usuarios_asociados: asociados.map(p => ({
          id: p.id,
          nombre: p.nombre,
          chat_id: p.telegram_chat_id
        })),
        usuarios_pendientes: temporales.map(p => ({
          id: p.id,
          nombre_temporal: p.nombre,
          chat_id: p.telegram_chat_id
        }))
      };
    } catch (error) {
      this.logger.error('Error obteniendo usuarios registrados:', error);
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('telegram/asociar')
  async asociarChatId(@Body() body: { 
    personaId: number; 
    chatId: string; 
  }) {
    try {
      const { personaId, chatId } = body;
      
      if (!personaId || !chatId) {
        throw new HttpException('personaId y chatId son requeridos', HttpStatus.BAD_REQUEST);
      }

      const result = await this.cafeteraService.asociarChatId(personaId, chatId);
      return {
        success: true,
        message: `Chat ID ${chatId} asociado exitosamente`,
        persona: result
      };
    } catch (error) {
      this.logger.error('Error asociando chat_id:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor', 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('telegram/verificar-estado')
  async verificarEstadoTelegram() {
    try {
      const result = await this.cafeteraService.verificarEstadoTelegramPersonas();
      return result;
    } catch (error) {
      this.logger.error('Error verificando estado de Telegram:', error);
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('telegram/sincronizar-usuarios')
  async sincronizarUsuariosTelegram() {
    try {
      const result = await this.cafeteraService.sincronizarUsuariosDesdeTelegram();
      return {
        success: true,
        message: `Sincronización completada: ${result.nuevos} nuevos usuarios, ${result.actualizados} actualizados`,
        ...result
      };
    } catch (error) {
      this.logger.error('Error sincronizando usuarios de Telegram:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('telegram/limpiar-conflictos')
  async limpiarConflictosTelegram() {
    try {
      const result = await this.telegramService.clearTelegramConflicts();
      return result;
    } catch (error) {
      this.logger.error('Error limpiando conflictos de Telegram:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('debug/database-status')
  async getDatabaseStatus() {
    try {
      const personas = await this.cafeteraService.obtenerPersonas();
      const dias = await this.cafeteraService.obtenerDias();
      const turnos = await this.cafeteraService.obtenerTurnos();
      
      return {
        status: 'connected',
        timestamp: new Date().toISOString(),
        database: 'supabase',
        data: {
          personas: personas.length,
          dias: dias.length,
          turnos: turnos.length,
          personas_list: personas.map(p => ({ id: p.id, nombre: p.nombre, telegram_chat_id: p.telegram_chat_id })),
          dias_list: dias.map(d => ({ id: d.id, fecha: d.fecha, tipo_dia: d.tipo_dia })),
        }
      };
    } catch (error) {
      this.logger.error('Error verificando estado de base de datos:', error);
      return {
        status: 'disconnected',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  @Get('debug/fecha-actual')
  getFechaActual() {
    const fechaUtc = new Date().toISOString().split('T')[0];
    const fechaMexico = new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"});
    const fechaMexicoFormat = new Date(fechaMexico).toISOString().split('T')[0];
    
    return {
      fecha_utc: fechaUtc,
      fecha_mexico_raw: fechaMexico,
      fecha_mexico_format: fechaMexicoFormat,
      timestamp: new Date().toISOString(),
      hora_mexico: new Date().toLocaleString("es-MX", {timeZone: "America/Mexico_City"}),
      message: 'Comparación de fechas UTC vs México'
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'cafetera-reminder'
    };
  }
}