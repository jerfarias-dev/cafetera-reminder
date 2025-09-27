# Cafetera Reminder 🍵☕

Sistema automatizado de recordatorios para turnos de cafetera usando Nest.js, TypeORM, MySQL y Telegram Bot.

## Características

- 📅 **Gestión de turnos**: Asignación de personas por fecha con tipos de día (laboral, asueto, fin de semana)
- 🤖 **Bot de Telegram**: Envío automático de recordatorios con formato Markdown
- ⏰ **Cron Jobs**: Ejecución automática todos los días a las 9:00 AM
- 🗄️ **Base de datos MySQL**: Almacenamiento persistente con TypeORM
- 🔧 **API REST**: Endpoints para gestión manual de personas y turnos

## Requisitos Previos

- Node.js (versión 18 o superior)
- Cuenta de Supabase (PostgreSQL en la nube)
- Bot de Telegram configurado

## Instalación

1. **Clonar y configurar el proyecto**:
```bash
cd cafetera-reminder
npm install
```

2. **Configurar variables de entorno**:
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones:

```env
# Base de datos Supabase (PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
DB_HOST=your-supabase-project-host.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-supabase-password
DB_DATABASE=postgres

# Telegram Bot
TELEGRAM_TOKEN=tu_token_del_bot

# Puerto de la aplicación
PORT=3000

# Supabase Config (opcional para futuras integraciones)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. **Configurar Bot de Telegram**:
   - Habla con [@BotFather](https://t.me/BotFather) en Telegram
   - Crea un nuevo bot con `/newbot`
   - Guarda el token proporcionado
   - Para obtener el `chat_id`: envía un mensaje al bot y visita: `https://api.telegram.org/bot<TOKEN>/getUpdates`

4. **Configurar base de datos en Supabase**:
   - Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
   - Ve al SQL Editor en tu dashboard de Supabase
   - Ejecuta el script `database/supabase-init.sql`
   - Copia la información de conexión desde Settings > Database

## Ejecución

### Desarrollo
```bash
npm run start:dev
```

### Producción
```bash
npm run build
npm run start:prod
```

### Poblar base de datos (opcional)
```bash
npm run seed
```

## Estructura de la Base de Datos

### Tabla `personas`
| Campo            | Tipo         | Descripción                    |
|------------------|-------------|--------------------------------|
| id               | SERIAL (PK) | Identificador único            |
| nombre           | VARCHAR(255)| Nombre de la persona           |
| telegram_chat_id | VARCHAR(50) | Chat ID de Telegram (opcional) |
| activo           | BOOLEAN     | Estado activo/inactivo         |
| created_at       | TIMESTAMP   | Fecha de creación              |
| updated_at       | TIMESTAMP   | Fecha de actualización         |

### Tabla `dias`
| Campo       | Tipo            | Descripción                    |
|-------------|-----------------|--------------------------------|
| id          | SERIAL (PK)     | Identificador único            |
| fecha       | DATE            | Fecha del día                  |
| tipo_dia    | tipo_dia_enum   | 'laboral', 'asueto', 'fin_semana' |
| descripcion | VARCHAR(255)    | Descripción opcional (ej: "Navidad") |
| created_at  | TIMESTAMP       | Fecha de creación              |
| updated_at  | TIMESTAMP       | Fecha de actualización         |

**Nota**: `esHabil` es una propiedad calculada en el código (getter).

### Tabla `turnos`
| Campo       | Tipo         | Descripción                    |
|-------------|-------------|--------------------------------|
| id          | SERIAL (PK) | Identificador único            |
| dia_id      | INTEGER (FK)| Referencia a dias.id           |
| persona_id  | INTEGER (FK)| Referencia a personas.id       |
| enviado     | BOOLEAN     | Si ya se envió el recordatorio |
| fecha_envio | TIMESTAMP   | Cuándo se envió                |
| created_at  | TIMESTAMP   | Fecha de creación              |
| updated_at  | TIMESTAMP   | Fecha de actualización         |

## API Endpoints

### Personas
- `GET /cafetera/personas` - Obtener todas las personas activas
- `POST /cafetera/personas` - Crear nueva persona
  ```json
  {
    "nombre": "Juan Pérez",
    "telegramChatId": "123456789"
  }
  ```

### Días
- `GET /cafetera/dias` - Obtener todos los días configurados
- `POST /cafetera/dias` - Crear/configurar un día específico
  ```json
  {
    "fecha": "2024-12-25",
    "tipoDia": "asueto",
    "descripcion": "Navidad"
  }
  ```

### Turnos
- `GET /cafetera/turnos` - Obtener todos los turnos con detalles
- `POST /cafetera/turnos` - Crear nuevo turno
  ```json
  {
    "fecha": "2024-01-15",
    "personaId": 1
  }
  ```

### Recordatorios
- `POST /cafetera/recordatorio/manual` - Enviar recordatorio manual
  ```json
  {
    "fecha": "2024-01-15"  // Opcional, usa fecha actual si no se especifica
  }
  ```

### Salud
- `GET /cafetera/health` - Verificar estado del servicio

## Funcionalidades Automáticas

### Cron Job (9:00 AM diario)
El sistema ejecuta automáticamente:
1. Consulta el turno para la fecha actual
2. Si es día laboral → envía recordatorio por Telegram
3. Si es asueto o fin de semana → registra en logs (sin envío)

### Formato del Mensaje de Telegram
```
🍵 *Recordatorio de Cafetera* ☕

¡Hola [Nombre]! 

Es tu turno de preparar el café de hoy. No olvides:
- ✅ Limpiar la cafetera
- ✅ Preparar café fresco
- ✅ Verificar que haya suficientes tazas

¡Gracias por mantener a todos con energía! 💪

_Este es un recordatorio automático._
```

## Desarrollo

### Scripts Disponibles
```bash
# Desarrollo con hot reload
npm run start:dev

# Formatear código
npm run format

# Linter
npm run lint

# Tests
npm run test
npm run test:watch
npm run test:cov

# Poblar base de datos
npm run seed
```

### Logs
El sistema registra:
- Ejecución de cron jobs
- Envío de recordatorios
- Errores de conexión
- Estado de Telegram

## Solución de Problemas

### Error de conexión a Supabase
- Verificar credenciales en `.env`
- Comprobar que el proyecto de Supabase esté activo
- Verificar configuración SSL si es necesario

### Bot de Telegram no responde
- Verificar token en `.env`
- Comprobar que el bot no esté bloqueado
- Validar el `chat_id`

### Cron job no ejecuta
- Revisar logs de la aplicación
- Verificar zona horaria del servidor
- Comprobar que hay turnos creados para las fechas

## Tecnologías Utilizadas

- **Backend**: Nest.js + TypeScript
- **ORM**: TypeORM
- **Base de datos**: PostgreSQL (Supabase)
- **Scheduler**: @nestjs/schedule
- **Bot**: node-telegram-bot-api
- **Configuración**: @nestjs/config

## Licencia

MIT License