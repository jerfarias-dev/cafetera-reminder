import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot = require('node-telegram-bot-api');

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot | null = null;
  private defaultChatId: string | null = null;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('TELEGRAM_TOKEN');

    if (token) {
      this.bot = new TelegramBot(token, { polling: false });
      this.logger.log('Bot de Telegram inicializado correctamente');
    } else {
      this.logger.warn('Token de Telegram no configurado');
    }
  }

  /**
   * Envía mensaje a un chat_id específico (directo al usuario)
   */
  async sendMessageToUser(chatId: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.bot) {
        throw new Error('Bot de Telegram no configurado');
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown'
      });

      this.logger.log(`✅ Mensaje enviado directamente al usuario (Chat ID: ${chatId})`);
      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Error enviando mensaje directo a ${chatId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica si un chat_id está activo y puede recibir mensajes
   */
  async verifyChatId(chatId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      if (!this.bot) {
        throw new Error('Bot de Telegram no configurado');
      }

      // Intentar obtener información del chat
      const chatInfo = await this.bot.getChat(chatId);
      this.logger.log(`✅ Chat ID ${chatId} verificado: ${chatInfo.type} - ${chatInfo.first_name || chatInfo.title || 'Chat'}`);

      return { valid: true };
    } catch (error) {
      this.logger.warn(`⚠️ Chat ID ${chatId} no válido o inaccesible: ${error.message}`);
      return {
        valid: false,
        error: error.message.includes('chat not found') ?
          'Usuario no encontrado en Telegram' :
          'No se puede acceder al chat del usuario'
      };
    }
  }

  /**
   * Método principal para enviar recordatorios - SOLO usa chat_ids de la base de datos
   */
  async sendReminderMessage(nombrePersona: string, telegramChatId?: string, isCron?: boolean): Promise<{
    success: boolean;
    method: 'direct' | 'no_telegram' | 'invalid_chat' | 'failed';
    error?: string;
    details?: string;
  }> {
    const message = `
🍵 *Recordatorio de Cafetera* ☕

¡Hola ${nombrePersona}! 

Es tu turno de limpiar la cafetera.

¡Gracias por mantener a todos con energía! 💪

_Este es un recordatorio ${isCron ? 'programado desde cron' : 'manual desde postman'}._
    `.trim();

    // Verificar si la persona tiene Telegram registrado
    if (!telegramChatId) {
      const errorMsg = `${nombrePersona} no tiene Telegram registrado`;
      this.logger.warn(`⚠️ ${errorMsg}`);
      return {
        success: false,
        method: 'no_telegram',
        error: 'No tiene Telegram registrado',
        details: `La persona ${nombrePersona} debe registrarse en el bot de Telegram primero. Dile que busque el bot y envíe /start`
      };
    }

    // Verificar que el chat_id sea válido y accesible
    const verification = await this.verifyChatId(telegramChatId);
    if (!verification.valid) {
      const errorMsg = `${nombrePersona} tiene un Chat ID inválido (${telegramChatId})`;
      this.logger.warn(`⚠️ ${errorMsg}`);
      return {
        success: false,
        method: 'invalid_chat',
        error: 'Chat ID inválido o inaccesible',
        details: `${nombrePersona} necesita volver a registrarse en el bot. El Chat ID ${telegramChatId} ya no es válido.`
      };
    }

    // Intentar enviar mensaje directo
    const directResult = await this.sendMessageToUser(telegramChatId, message);
    if (directResult.success) {
      this.logger.log(`✅ Recordatorio enviado exitosamente a ${nombrePersona} (${telegramChatId})`);
      return { success: true, method: 'direct' };
    }

    // Si falló el envío
    this.logger.error(`❌ Error enviando recordatorio a ${nombrePersona} (${telegramChatId}): ${directResult.error}`);
    return {
      success: false,
      method: 'failed',
      error: directResult.error || 'Error desconocido al enviar mensaje',
      details: `No se pudo enviar mensaje a ${nombrePersona}. Verificar que el bot no esté bloqueado por el usuario.`
    };
  }

  /**
   * Verifica el estado de Telegram de múltiples personas
   */
  async verifyMultipleUsers(personas: Array<{ id: number; nombre: string; telegram_chat_id?: string }>): Promise<{
    total: number;
    con_telegram: number;
    sin_telegram: number;
    chat_invalido: number;
    resultados: Array<{
      id: number;
      nombre: string;
      telegram_chat_id?: string;
      estado: 'activo' | 'sin_telegram' | 'chat_invalido';
      error?: string;
    }>;
  }> {
    const resultados: Array<{
      id: number;
      nombre: string;
      numero?: string;
      telegram_chat_id?: string;
      estado: 'activo' | 'sin_telegram' | 'chat_invalido';
      error?: string;
    }> = [];
    let con_telegram = 0;
    let sin_telegram = 0;
    let chat_invalido = 0;

    for (const persona of personas) {
      if (!persona.telegram_chat_id) {
        // No tiene Telegram registrado
        sin_telegram++;
        resultados.push({
          ...persona,
          estado: 'sin_telegram' as const,
          error: 'No tiene Chat ID registrado'
        });
        continue;
      }

      // Verificar si el chat_id es válido
      const verification = await this.verifyChatId(persona.telegram_chat_id);
      if (verification.valid) {
        con_telegram++;
        resultados.push({
          ...persona,
          estado: 'activo' as const
        });
      } else {
        chat_invalido++;
        resultados.push({
          ...persona,
          estado: 'chat_invalido' as const,
          error: verification.error
        });
      }

      // Pequeña pausa para no saturar la API de Telegram
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      total: personas.length,
      con_telegram,
      sin_telegram,
      chat_invalido,
      resultados
    };
  }

  /**
   * Obtiene actualizaciones (usuarios) desde la API de Telegram
   */
  async getUpdatesFromTelegram(): Promise<{
    success: boolean;
    updates?: any[];
    usuarios_encontrados?: Array<{
      chat_id: string;
      nombre: string;
      username?: string;
      fecha_interaccion: Date;
    }>;
    error?: string;
  }> {
    try {
      if (!this.bot) {
        throw new Error('Bot de Telegram no configurado');
      }

      const token = this.configService.get<string>('TELEGRAM_TOKEN');

      // Primero, limpiar actualizaciones pendientes con offset alto
      this.logger.log('🧹 Limpiando actualizaciones pendientes...');
      try {
        const clearResponse = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-1&limit=1`);
        const clearData = await clearResponse.json();
        if (clearData.ok && clearData.result.length > 0) {
          const lastUpdateId = clearData.result[0].update_id;
          await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&limit=1`);
          this.logger.log('✅ Actualizaciones pendientes limpiadas');
        }
      } catch (clearError) {
        this.logger.warn('⚠️ No se pudo limpiar actualizaciones pendientes:', clearError.message);
      }

      // Obtener actualizaciones directamente de la API con timeout y límite
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100&timeout=10`);
      const data = await response.json();

      if (!data.ok) {
        // Manejo específico para error de conflicto
        if (data.description && data.description.includes('Conflict')) {
          this.logger.warn('⚠️ Conflicto detectado, esperando y reintentando...');

          // Esperar un poco y reintentar una vez
          await new Promise(resolve => setTimeout(resolve, 2000));

          const retryResponse = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=50&timeout=5`);
          const retryData = await retryResponse.json();

          if (!retryData.ok) {
            throw new Error(`API Error (después de reintento): ${retryData.description}`);
          }

          this.logger.log('✅ Reintento exitoso después de conflicto');
          return this.processUpdatesData(retryData.result);
        }

        throw new Error(`API Error: ${data.description}`);
      }

      return this.processUpdatesData(data.result);

    } catch (error) {
      this.logger.error('❌ Error obteniendo actualizaciones de Telegram:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Método para limpiar webhooks y conflictos de Telegram
   */
  async clearTelegramConflicts(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.bot) {
        throw new Error('Bot de Telegram no configurado');
      }

      const token = this.configService.get<string>('TELEGRAM_TOKEN');

      this.logger.log('🧹 Limpiando conflictos de Telegram...');

      // 1. Eliminar webhook si existe
      const deleteWebhook = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
      const webhookData = await deleteWebhook.json();

      if (webhookData.ok) {
        this.logger.log('✅ Webhook eliminado');
      }

      // 2. Limpiar todas las actualizaciones pendientes
      let offset = 0;
      let hasMore = true;
      let totalCleared = 0;

      while (hasMore) {
        const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&limit=100`);
        const data = await response.json();

        if (!data.ok) {
          break;
        }

        if (data.result.length === 0) {
          hasMore = false;
        } else {
          const lastUpdate = data.result[data.result.length - 1];
          offset = lastUpdate.update_id + 1;
          totalCleared += data.result.length;

          // Evitar bucle infinito
          if (totalCleared > 1000) {
            break;
          }
        }
      }

      this.logger.log(`✅ ${totalCleared} actualizaciones pendientes limpiadas`);

      return {
        success: true,
        message: `Conflictos limpiados exitosamente. ${totalCleared} actualizaciones procesadas.`
      };

    } catch (error) {
      this.logger.error('❌ Error limpiando conflictos:', error.message);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Procesa las actualizaciones de Telegram y extrae usuarios únicos
   */
  private processUpdatesData(updates: any[]): {
    success: boolean;
    updates: any[];
    usuarios_encontrados: Array<{
      chat_id: string;
      nombre: string;
      username?: string;
      fecha_interaccion: Date;
    }>;
  } {
    this.logger.log(`📥 Se obtuvieron ${updates.length} actualizaciones de Telegram`);

    // Extraer usuarios únicos
    const usuariosMap = new Map();

    for (const update of updates) {
      let user: any = null;
      let fecha = new Date(update.date ? update.date * 1000 : Date.now());

      // Extraer usuario dependiendo del tipo de update
      if (update.message?.from) {
        user = update.message.from;
      } else if (update.callback_query?.from) {
        user = update.callback_query.from;
      } else if (update.inline_query?.from) {
        user = update.inline_query.from;
      }

      if (user && !user.is_bot) {
        const chatId = user.id.toString();
        const nombre = `${user.first_name || ''}${user.last_name ? ' ' + user.last_name : ''}`.trim() || 'Usuario';

        usuariosMap.set(chatId, {
          chat_id: chatId,
          nombre: nombre,
          username: user.username || null,
          fecha_interaccion: fecha
        });
      }
    }

    const usuarios_encontrados = Array.from(usuariosMap.values());
    this.logger.log(`👥 Se encontraron ${usuarios_encontrados.length} usuarios únicos`);

    return {
      success: true,
      updates,
      usuarios_encontrados
    };
  }
}