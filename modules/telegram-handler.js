const TelegramBot = require('node-telegram-bot-api');

// Configuración
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const IMAGENES_DISPONIBLES = ['sofia1', 'sofia2', 'sofia3', 'sofia4', 'sofia5', 'sofia6', 'sofia7', 'sofia8', 'sofia9'];

// Inicializar bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Estado de sesiones activas
const sesionesActivas = new Map();

console.log('🤖 TELEGRAM HANDLER INICIADO');
console.log('📱 Esperando mensajes...');

// Verificar bot
bot.getMe().then((info) => {
  console.log(`✅ Bot conectado: @${info.username}`);
}).catch((error) => {
  console.error('❌ Error conectando bot:', error.message);
});

// Función para enviar mensajes
async function enviarMensaje(chatId, texto) {
  try {
    await bot.sendMessage(chatId, texto);
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.message);
  }
}

// Función para validar formato de mensaje
function validarMensaje(texto) {
  if (!texto || !texto.includes('@')) {
    return {
      valido: false,
      error: `❌ Formato: imagen@consulta\n📸 Imágenes: ${IMAGENES_DISPONIBLES.join(', ')}\n💡 Ejemplo: sofia3@dame las noticias del día`
    };
  }

  const [imageName, consulta] = texto.split('@');
  const imageClean = imageName.trim().toLowerCase();
  const consultaClean = consulta.trim();

  if (!IMAGENES_DISPONIBLES.includes(imageClean)) {
    return {
      valido: false,
      error: `❌ Imagen no disponible: ${imageClean}\n📸 Opciones: ${IMAGENES_DISPONIBLES.join(', ')}`
    };
  }

  if (consultaClean.length < 3) {
    return {
      valido: false,
      error: '❌ Consulta muy corta. Mínimo 3 caracteres.'
    };
  }

  return {
    valido: true,
    imagen: imageClean,
    consulta: consultaClean
  };
}

// Función para manejar aprobaciones
function manejarAprobacion(chatId, respuesta, callback) {
  if (!sesionesActivas.has(chatId)) {
    enviarMensaje(chatId, '⚠️ No hay ningún script pendiente de aprobación');
    return;
  }

  const sesion = sesionesActivas.get(chatId);
  
  if (respuesta === 'si' || respuesta === 'sí') {
    enviarMensaje(chatId, '✅ Script aprobado - Continuando con el proceso...');
    sesionesActivas.delete(chatId);
    callback(null, sesion);
  } else {
    enviarMensaje(chatId, '❌ PROCESO CANCELADO\n\nEl script no fue aprobado.\nPuedes intentar con otra consulta.');
    sesionesActivas.delete(chatId);
    callback('cancelado', null);
  }
}

// Función para registrar sesión pendiente
function registrarSesion(chatId, datosSecion) {
  sesionesActivas.set(chatId, datosSecion);
}

// Función para configurar handlers de mensajes
function configurarHandlers(onNuevoVideo, onAprobacion) {
  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const text = msg.text;

      if (chatId.toString() !== CHAT_ID) return;

      // Manejar respuestas si/no para aprobación
      if (text && ['si', 'sí', 'no'].includes(text.toLowerCase().trim())) {
        const respuesta = text.toLowerCase().trim();
        manejarAprobacion(chatId, respuesta, onAprobacion);
        return;
      }

      // Validar formato del mensaje
      const validacion = validarMensaje(text);
      if (!validacion.valido) {
        await enviarMensaje(chatId, validacion.error);
        return;
      }

      // Procesar nuevo video
      await onNuevoVideo(chatId, validacion.consulta, validacion.imagen);

    } catch (error) {
      console.error('❌ Error en mensaje:', error.message);
      await enviarMensaje(msg.chat.id, `❌ Error procesando mensaje: ${error.message}`);
    }
  });

  bot.on('polling_error', () => {
    console.log('⚠️ Polling error (reintentando...)');
  });

  bot.on('error', (error) => {
    console.error('❌ Error del bot:', error.message);
  });
}

// Exportar funciones públicas
module.exports = {
  bot,
  enviarMensaje,
  registrarSesion,
  configurarHandlers,
  CHAT_ID,
  IMAGENES_DISPONIBLES
};