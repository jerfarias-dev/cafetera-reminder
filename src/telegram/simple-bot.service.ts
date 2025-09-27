import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
const TelegramBot = require('node-telegram-bot-api');
import { Persona } from '../entities/persona.entity';

@Injectable()
export class SimpleBotService implements OnModuleInit {
  private readonly logger = new Logger(SimpleBotService.name);
  private bot: any;

  constructor(
    @InjectRepository(Persona)
    private personaRepository: Repository<Persona>,
    private configService: ConfigService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_TOKEN');
    if (token) {
      // Deshabilitamos polling para evitar conflictos con TelegramService
      this.bot = new TelegramBot(token, { polling: false });
      this.logger.log('🤖 Bot simple inicializado (polling deshabilitado)');
    } else {
      this.logger.error('❌ Token de Telegram no configurado');
      this.logger.warn('Para usar el bot, configura TELEGRAM_TOKE en tu .env');
    }
  }

  async onModuleInit() {
    if (!this.bot) return;
    
    this.logger.log('🚀 Iniciando Simple Bot Service...');
    await this.initBot();
  }

  private async initBot() {
    try {
      // Verificar conexión con el bot
      const me = await this.bot.getMe();
      this.logger.log(`✅ Bot conectado: @${me.username} (${me.first_name})`);
      this.logger.warn('⚠️ Polling deshabilitado - comandos simples no disponibles');
      
      // Solo configurar comandos si polling está habilitado
      // this.setupSimpleCommands();
      
    } catch (error) {
      this.logger.error('❌ Error conectando con Telegram Bot:', error);
      throw error;
    }
  }

  private setupSimpleCommands() {
    // 👋 Comando /start - Registro automático simple
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from?.first_name || 'Usuario';
      const username = msg.from?.username || '';
      
      // Guardar chat_id automáticamente
      await this.saveChatId(chatId, firstName, username);
      
      const welcomeMessage = `
🍵 *¡Hola ${firstName}!* ☕

✅ *¡Ya estás registrado para recibir recordatorios de cafetera!*

📱 *Tu Chat ID:* \`${chatId}\`

El administrador del sistema ya puede enviarte recordatorios personalizados.

*💡 Importante:* Comparte este Chat ID con el administrador para que te asocie con tu nombre en el sistema.

*📋 Comandos disponibles:*
\`/miinfo\` - Ver tu información
\`/ayuda\` - Ver ayuda

¡Listo para los recordatorios! 🚀
      `;
      
      this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
      this.logger.log(`👋 Usuario ${firstName} (@${username}) registrado automáticamente (Chat ID: ${chatId})`);
    });

    // 📋 Comando /miinfo - Ver información
    this.bot.onText(/\/miinfo/, async (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from?.first_name || 'Usuario';
      const username = msg.from?.username || 'Sin username';
      
      // Buscar si existe en la BD
      const persona = await this.personaRepository.findOne({
        where: { telegram_chat_id: chatId.toString() }
      });
      
      let statusMessage = '';
      if (persona && !persona.nombre.includes('(Temporal)')) {
        statusMessage = `✅ *Estado:* Asociado con ${persona.nombre}`;
      } else {
        statusMessage = `⏳ *Estado:* Pendiente de asociación por el admin`;
      }
      
      const infoMessage = `
📋 *Tu información:*

👤 *Nombre en Telegram:* ${firstName}
🏷️ *Username:* @${username}
💬 *Chat ID:* \`${chatId}\`

${statusMessage}

*💡 Tip:* Si no estás asociado, comparte tu Chat ID con el administrador.
      `;
      
      this.bot.sendMessage(chatId, infoMessage, { parse_mode: 'Markdown' });
    });

    // ❓ Comando /ayuda - Ayuda
    this.bot.onText(/\/ayuda/, (msg) => {
      const chatId = msg.chat.id;
      
      const helpMessage = `
🆘 *Ayuda - Bot Simple de Cafetera* ☕

*📋 Comandos disponibles:*

\`/start\` - Registrarte automáticamente
\`/miinfo\` - Ver tu información y estado
\`/ayuda\` - Mostrar esta ayuda

*🔄 ¿Cómo funciona?*

1️⃣ Envías \`/start\` → Tu Chat ID se registra automáticamente
2️⃣ Compartes tu Chat ID con el administrador 
3️⃣ El admin te asocia con tu nombre en el sistema
4️⃣ ¡Ya recibes recordatorios personalizados!

*💡 ¿Problemas?*
- Usa \`/miinfo\` para ver tu Chat ID
- Comparte ese Chat ID con el administrador
- Si ya estás asociado, deberías recibir recordatorios

*🤝 ¿Necesitas ayuda?*
Contacta al administrador del sistema con tu Chat ID.
      `;
      
      this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // 🔄 Mensaje por defecto para otros textos
    this.bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
      
      // Solo responder si no es un comando conocido
      if (text && !text.startsWith('/start') && !text.startsWith('/miinfo') && !text.startsWith('/ayuda')) {
        const defaultMessage = `
👋 ¡Hola! Soy el bot simple de recordatorios de cafetera.

*📋 Comandos disponibles:*
\`/start\` - Registrarte automáticamente
\`/miinfo\` - Ver tu información
\`/ayuda\` - Ayuda completa

¡Usa \`/start\` para comenzar! 🚀
        `;
        
        this.bot.sendMessage(chatId, defaultMessage, { parse_mode: 'Markdown' });
      }
    });
  }

  // 💾 Guardar chat_id automáticamente 
  private async saveChatId(chatId: number, firstName: string, username: string) {
    try {
      // Buscar si ya existe alguna persona con este chat_id
      const existingPerson = await this.personaRepository.findOne({
        where: { telegram_chat_id: chatId.toString() }
      });

      if (existingPerson) {
        this.logger.log(`ℹ️ Usuario ya registrado: ${existingPerson.nombre} (Chat ID: ${chatId})`);
        return existingPerson;
      }

      // Crear una persona "temporal" con la info disponible
      const tempPerson = this.personaRepository.create({
        nombre: `${firstName} (Temporal)`,
        telegram_chat_id: chatId.toString()
      });

      const savedPerson = await this.personaRepository.save(tempPerson);
      
      this.logger.log(`💾 Chat ID guardado: ${firstName} (@${username}) - Chat ID: ${chatId} - ID: ${savedPerson.id}`);
      
      return savedPerson;
      
    } catch (error) {
      this.logger.error('❌ Error guardando chat_id:', error);
      return null;
    }
  }

  // 📊 Obtener estadísticas de registro
  async getRegistrationStats() {
    try {
      const totalPersonas = await this.personaRepository.count();
      const conChatId = await this.personaRepository.count({
        where: { telegram_chat_id: Not(IsNull()) }
      });
      const temporales = await this.personaRepository.count({
        where: { nombre: Like('%Temporal%') }
      });

      return {
        total_personas: totalPersonas,
        con_chat_id: conChatId,
        temporales: temporales,
        asociadas: conChatId - temporales
      };
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  }

  // 🔍 Obtener personas sin asociar
  async getUnassociatedUsers() {
    try {
      return await this.personaRepository.find({
        where: { nombre: Like('%Temporal%') }
      });
    } catch (error) {
      this.logger.error('❌ Error obteniendo usuarios sin asociar:', error);
      return [];
    }
  }

  // 🔗 Asociar chat_id con persona existente
  async associateChatId(personaId: number, chatId: string) {
    try {
      const persona = await this.personaRepository.findOne({
        where: { id: personaId }
      });

      if (!persona) {
        throw new Error(`Persona con ID ${personaId} no encontrada`);
      }

      persona.telegram_chat_id = chatId;
      await this.personaRepository.save(persona);

      this.logger.log(`🔗 Chat ID ${chatId} asociado con ${persona.nombre} (ID: ${personaId})`);
      
      return persona;
    } catch (error) {
      this.logger.error('❌ Error asociando chat_id:', error);
      throw error;
    }
  }
}