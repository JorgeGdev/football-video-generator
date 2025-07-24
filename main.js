// FOOTBALL VIDEO GENERATOR - Arquitectura Modular
// Archivo principal que coordina todos los módulos

const { configurarHandlers, enviarMensaje, registrarSesion, CHAT_ID } = require('./modules/telegram-handler');
const { generarScript } = require('./modules/script-generator');
const { procesarAudio } = require('./modules/audio-processor');
const { procesarImagen, verificarImagenesDisponibles } = require('./modules/image-processor');
const { procesarVideoCompleto } = require('./modules/video-creator');

console.log('🚀 FOOTBALL VIDEO GENERATOR - SISTEMA MODULAR');
console.log('='.repeat(60));
console.log('📁 Módulos cargados:');
console.log('  ✅ telegram-handler.js');
console.log('  ✅ script-generator.js');  
console.log('  ✅ audio-processor.js');
console.log('  ✅ image-processor.js');
console.log('  ✅ video-creator.js');
console.log('='.repeat(60));

// Verificar imágenes disponibles al iniciar
verificarImagenesDisponibles().then(imagenes => {
  if (imagenes.length === 0) {
    console.log('⚠️  No se encontraron imágenes en la carpeta images/');
    console.log('💡 Asegúrate de tener archivos sofia1.png hasta sofia9.png');
  }
});

// Función principal para procesar nuevo video
async function procesarNuevoVideo(chatId, consulta, imageName) {
  const sessionId = `video_${Date.now()}`;
  
  try {
    await enviarMensaje(chatId, 
      `🎬 INICIANDO VIDEO\n📸 ${imageName}\n💬 "${consulta}"\n🆔 ${sessionId}\n\n🤖 Consultando IA + RAG...`);

    console.log(`🚀 [${sessionId}] NUEVA SESIÓN INICIADA`);
    console.log(`📸 [${sessionId}] Imagen: ${imageName}`);
    console.log(`💬 [${sessionId}] Consulta: ${consulta}`);

    // PASO 1: Generar script con IA + RAG
    const scriptData = await generarScript(consulta, sessionId);

    // Verificar si se encontraron datos
    if (!scriptData.encontrado) {
      await enviarMensaje(chatId, 
        `❌ SIN RESULTADOS [${sessionId}]:\n\n"${scriptData.script}"\n\n💡 Intenta con:\n• Nombres de equipos específicos\n• Nombres de jugadores\n• Ligas específicas`);
      return;
    }

    // Mostrar script y solicitar aprobación (SIN procesos paralelos)
    await enviarMensaje(chatId, 
      `📝 SCRIPT GENERADO CON IA [${sessionId}]:\n\n` +
      `"${scriptData.script}"\n\n` +
      `📊 PALABRAS: ${scriptData.palabras}\n` +
      `⏱️ DURACIÓN ESTIMADA: ${Math.floor(scriptData.palabras/4)} segundos\n` +
      `🤖 GENERADO CON: OpenAI + RAG\n` +
      `📚 FUENTES: ${scriptData.documentos} documentos\n\n` +
      `❓ ¿APROBAR SCRIPT?\nResponde "si" para continuar o "no" para cancelar`);

    // Registrar sesión pendiente de aprobación (SIN procesos aún)
    registrarSesion(chatId, {
      sessionId,
      script: scriptData.script,
      imagen: imageName,
      consulta,
      palabras: scriptData.palabras,
      generadoConIA: true
    });

    console.log(`⏳ [${sessionId}] Esperando aprobación del usuario`);
    // AQUÍ SE DETIENE - No más procesos hasta aprobación

  } catch (error) {
    console.error(`❌ [${sessionId}] Error en generación:`, error.message);
    await enviarMensaje(chatId, `❌ Error: ${error.message}`);
  }
}

// Función para manejar aprobación/rechazo (CORREGIDA)
async function manejarAprobacion(error, sesion) {
  if (error) {
    console.log(`❌ Sesión ${sesion?.sessionId || 'unknown'}: Cancelada por usuario`);
    return;
  }

  const { sessionId, script, imagen } = sesion;
  
  try {
    await enviarMensaje(CHAT_ID, `🔄 [${sessionId}] Iniciando procesos paralelos...`);
    
    console.log(`🔄 [${sessionId}] INICIANDO PROCESOS PARALELOS`);
    console.log(`📸 [${sessionId}] Camino imagen: Procesando ${imagen}`);
    console.log(`🔊 [${sessionId}] Camino audio: Procesando script`);

    // AHORA SÍ: PROCESOS PARALELOS (solo después de aprobación)
    const [audioData, imagenData] = await Promise.all([
      procesarAudio(script, sessionId),      // CAMINO LARGO: ElevenLabs + Hedra
      procesarImagen(imagen, sessionId)      // CAMINO CORTO: Local + Hedra
    ]);

    await enviarMensaje(CHAT_ID, 
      `✅ PROCESAMIENTO COMPLETADO [${sessionId}]:\n\n` +
      `🔊 Audio: ${audioData.nombreArchivo}\n` +
      `📸 Imagen: ${imagenData.nombre}\n` +
      `🎬 Audio Asset: ${audioData.audioAssetId}\n` +
      `📸 Image Asset: ${imagenData.imageAssetId}\n\n` +
      `🎬 Creando video final...`);

    console.log(`✅ [${sessionId}] Assets listos, iniciando video`);

    // CREAR VIDEO FINAL (sincronización crítica)
    const videoFinal = await procesarVideoCompleto(audioData, imagenData, sessionId);

    await enviarMensaje(CHAT_ID, 
      `🎉 VIDEO COMPLETADO [${sessionId}]:\n\n` +
      `📁 Archivo: ${videoFinal.nombreArchivo}\n` +
      `📏 Tamaño: ${videoFinal.tamaño}\n` +
      `⏱️ Proceso total: ${videoFinal.duracionProceso}\n` +
      `📅 Completado: ${new Date().toLocaleTimeString()}\n\n` +
      `🚀 ¡Tu video está listo!`);

    console.log(`🎉 [${sessionId}] PROCESO COMPLETADO EXITOSAMENTE`);
    console.log(`📁 [${sessionId}] Video guardado: ${videoFinal.archivo}`);

  } catch (error) {
    console.error(`❌ [${sessionId}] Error en proceso:`, error.message);
    await enviarMensaje(CHAT_ID, `❌ Error procesando video: ${error.message}`);
  }
}

// Configurar handlers del bot
configurarHandlers(procesarNuevoVideo, manejarAprobacion);

console.log('✅ Sistema iniciado correctamente');
console.log('📱 Envía un mensaje con formato: sofia3@tu consulta');
console.log('⚡ Sistema listo para generar videos automáticamente');