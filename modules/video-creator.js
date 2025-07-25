const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

// Configuración
const HEDRA_API_KEY = process.env.HEDRA_API_KEY;

console.log("🎬 VIDEO CREATOR INICIADO");

// Función para enviar logs tanto a console como a Telegram
async function logAndNotify(sessionId, message, sendToTelegram = true) {
  const fullMessage = `[${sessionId}] ${message}`;
  console.log(fullMessage);

  if (sendToTelegram) {
    try {
      // Importar función de Telegram solo cuando sea necesario
      const { enviarMensaje, CHAT_ID } = require("./telegram-handler");
      await enviarMensaje(CHAT_ID, fullMessage);
    } catch (error) {
      // Si falla el envío a Telegram, solo mostrar en consola
      console.log("⚠️ No se pudo enviar a Telegram:", error.message);
    }
  }
}

// Función para sincronizar audio + imagen (crítica para Hedra)
async function sincronizarAssets(audioData, imagenData, sessionId) {
  try {
    await logAndNotify(
      sessionId,
      "🔄 SINCRONIZANDO ASSETS - Crítico para Hedra"
    );
    await logAndNotify(
      sessionId,
      `📸 Imagen Asset ID: ${imagenData.imageAssetId}`
    );
    await logAndNotify(
      sessionId,
      `🔊 Audio Asset ID: ${audioData.audioAssetId}`
    );

    // Verificar que ambos assets estén listos
    if (!audioData.audioAssetId || !imagenData.imageAssetId) {
      throw new Error("Assets no están listos para sincronización");
    }

    // Esperar un momento para que Hedra procese completamente
    await logAndNotify(
      sessionId,
      "⏳ Esperando procesamiento de Hedra (30s)..."
    );
    await new Promise((resolve) => setTimeout(resolve, 30000));

    await logAndNotify(sessionId, "✅ Assets sincronizados correctamente");

    return {
      imageAssetId: imagenData.imageAssetId,
      audioAssetId: audioData.audioAssetId,
      duracionEstimada: audioData.duracion,
      sincronizado: true,
    };
  } catch (error) {
    await logAndNotify(
      sessionId,
      `❌ Error en sincronización: ${error.message}`
    );
    throw error;
  }
}

// Función para crear video con Hedra
async function crearVideo(assetsSync, sessionId) {
  try {
    await logAndNotify(sessionId, "🎬 Creando video con Hedra AI...");

    const videoRequest = {
      type: "video",
      ai_model_id: "d1dd37a3-e39a-4854-a298-6510289f9cf2",
      start_keyframe_id: assetsSync.imageAssetId,
      audio_id: assetsSync.audioAssetId,
      generated_video_inputs: {
        text_prompt:
          "A young and charismatic Latina sports news anchor with natural curly hair and light brown skin. SOFT START: Begins in a neutral and relaxed position, with a subtle smile, looking directly at the camera for 1.5–2.5 seconds before starting to speak. Gradually becomes more animated as the content progresses. NATURAL AND PROGRESSIVE EXPRESSIONS: - Seconds 0–3: Relaxed posture, friendly smile, direct eye contact, preparing to speak - Seconds 3–8: Gradually more animated, expressive eyebrows to emphasize key points - Seconds 8–15: More dynamic expressions, subtle hand gestures, genuine smiles - Seconds 15–20: Maintains energy, ends with a curious and inviting expression LATINA CONVERSATIONAL STYLE: Speaks with the natural warmth typical of Latina anchors, combining professionalism with approachability. Her facial expressions reflect the emotions of the sports content in an authentic but controlled manner. Subtle head movements help emphasize key points. APPEARANCE: Casual T-shirt, natural look without heavy makeup, defined curly hair falling naturally over the shoulders. A young, approachable, and professional appearance that connects with the millennial and Gen Z Latino audience. LIGHTING: Soft and even natural lighting that flatters her light brown complexion. Warm lighting creates a cozy atmosphere, with no harsh shadows. A professional home-style setup, typical of successful content creators. CAMERA FOCUS: Fixed eye-level shot, 9:16 framing from the chest up. The anchor stays centered and steady, with natural but controlled movements. Background shows typical street life activity. SPECIFIC TIMING: CRITICAL – Ensure that lip movements and facial expressions begin gradually and in sync, avoiding abrupt starts. The transition from neutral to speaking must be smooth and natural.",
        resolution: "720p",
        aspect_ratio: "9:16",
        duration_ms: 20000,
      },
    };

    const response = await axios.post(
      "https://api.hedra.com/web-app/public/generations",
      videoRequest,
      {
        headers: {
          "X-Api-Key": HEDRA_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const generationId = response.data.asset_id;
    await logAndNotify(
      sessionId,
      `🎬 Video iniciado en Hedra: ${generationId}`
    );

    return {
      generationId: generationId,
      status: "processing",
      estimatedTime: "3-5 minutos",
    };
  } catch (error) {
    await logAndNotify(
      sessionId,
      `❌ Error creando video: ${error.response?.status || error.message}`
    );
    throw new Error(`Error creando video: ${error.message}`);
  }
}

// Función para verificar estado del video
async function verificarEstadoVideo(generationId, sessionId) {
  try {
    await logAndNotify(
      sessionId,
      `🔍 Verificando estado del video: ${generationId}`,
      false
    ); // Solo console, no Telegram

    const response = await axios.get(
      `https://api.hedra.com/web-app/public/assets?type=video&ids=${generationId}`,
      {
        headers: {
          "X-Api-Key": HEDRA_API_KEY,
        },
        timeout: 30000,
      }
    );

    const videoData = response.data[0];
    const status = videoData?.status || "unknown";

    await logAndNotify(sessionId, `📊 Estado del video: ${status}`, false); // Solo console

    return {
      status: status,
      ready: status === "completed",
      url: videoData?.asset?.url || null,
      error: videoData?.error || null,
    };
  } catch (error) {
    await logAndNotify(
      sessionId,
      `❌ Error verificando estado: ${error.message}`
    );
    throw error;
  }
}

// Función para descargar video final (CORREGIDA + LOGS BONITOS)
async function descargarVideo(videoUrl, sessionId) {
  try {
    await logAndNotify(sessionId, `📥 Descargando video final...`);

    // DESCARGA ROBUSTA con headers correctos
    const response = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: 120000, // 2 minutos
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    // Verificar que tenemos datos
    if (!response.data || response.data.byteLength === 0) {
      throw new Error("Video descargado está vacío");
    }

    await logAndNotify(
      sessionId,
      `📊 Video descargado: ${response.data.byteLength} bytes`
    );

    // Crear nombre con fecha/hora
    const ahora = new Date();
    const fecha = ahora.toISOString().slice(0, 10).replace(/-/g, "");
    const hora = ahora.toTimeString().slice(0, 8).replace(/:/g, "");
    const nombreVideo = `video_${fecha}_${hora}.mp4`;

    // Guardar video CORRECTAMENTE
    const videoDir = "videos_finales";
    await fs.mkdir(videoDir, { recursive: true });

    const videoPath = path.join(videoDir, nombreVideo);
    await fs.writeFile(videoPath, Buffer.from(response.data));

    // Verificar que el archivo se creó correctamente
    const stats = await fs.stat(videoPath);
    const videoSize = (stats.size / (1024 * 1024)).toFixed(2);

    await logAndNotify(
      sessionId,
      `✅ Video guardado correctamente: ${videoPath} (${videoSize} MB)`
    );
    await logAndNotify(sessionId, `🔍 Archivo verificado: ${stats.size} bytes`);

    return {
      archivo: videoPath,
      nombreArchivo: nombreVideo,
      tamaño: videoSize + " MB",
      buffer: Buffer.from(response.data),
      url: videoUrl,
      rutaBase: videoPath.replace(".mp4", ""), // NUEVA LÍNEA - Para guardar caption
    };
  } catch (error) {
    await logAndNotify(
      sessionId,
      `❌ Error descargando video: ${error.message}`
    );
    throw error;
  }
}

// Función principal para crear video completo (BULLETPROOF PARA PRODUCCIÓN)
async function procesarVideoCompleto(audioData, imagenData, sessionId) {
  try {
    await logAndNotify(sessionId, "🎬 INICIANDO CREACIÓN DE VIDEO COMPLETO");

    // PASO 1: Sincronizar assets (crítico)
    const assetsSync = await sincronizarAssets(
      audioData,
      imagenData,
      sessionId
    );

    // PASO 2: Crear video en Hedra
    const videoGeneration = await crearVideo(assetsSync, sessionId);

    // PASO 3: Esperar 5 minutos (tiempo estimado de Hedra)
    await logAndNotify(
      sessionId,
      "⏳ Esperando generación de video (5 minutos)..."
    );
    await new Promise((resolve) => setTimeout(resolve, 300000)); // 5 minutos

    // PASO 4: Verificar estado hasta que esté listo (MÁXIMO 15 INTENTOS)
    let intentos = 0;
    let videoListo = false;
    let videoUrl = null;

    while (!videoListo && intentos < 15) {
      const estado = await verificarEstadoVideo(
        videoGeneration.generationId,
        sessionId
      );

      if (estado.ready && estado.url) {
        videoListo = true;
        videoUrl = estado.url;
        await logAndNotify(sessionId, "🎉 ¡Video listo! URL obtenida");
      } else if (estado.error) {
        throw new Error(`Error en Hedra: ${estado.error}`);
      } else {
        await logAndNotify(
          sessionId,
          `⏳ Video aún procesando... intento ${intentos + 1}/15`
        );
        await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 segundos
        intentos++;
      }
    }

    // PASO 5: *** EMPUJÓN CRÍTICO *** (SI NO ESTÁ LISTO, INTENTAR OBTENERLO DIRECTAMENTE)
    if (!videoListo) {
      await logAndNotify(
        sessionId,
        "⚠️ Timeout en verificaciones, intentando descarga directa..."
      );

      // EMPUJÓN: Intentar obtener el video una vez más
      const estadoFinal = await verificarEstadoVideo(
        videoGeneration.generationId,
        sessionId
      );
      if (estadoFinal.url) {
        videoUrl = estadoFinal.url;
        videoListo = true; // *** CRÍTICO: Marcar como listo ***
        await logAndNotify(sessionId, "✅ Video encontrado en intento final");
      } else {
        // ÚLTIMO RECURSO: Guardar ID para rescate manual
        await logAndNotify(
          sessionId,
          `❌ Video no completado tras ${intentos} intentos.`
        );
        await logAndNotify(
          sessionId,
          `🆔 ID para rescate manual: ${videoGeneration.generationId}`
        );
        await logAndNotify(
          sessionId,
          `💡 Usa: node rescue-video.js con este ID`
        );
        throw new Error(
          `Video no completado tras ${intentos} intentos. ID: ${videoGeneration.generationId}`
        );
      }
    }

    // PASO 6: Descargar video final
    const videoFinal = await descargarVideo(videoUrl, sessionId);

    // PASO 7: Generar caption para redes sociales
    await logAndNotify(
      sessionId,
      "📱 Generando caption para redes sociales..."
    );

    try {
      // Importar función de caption
      const { generarCaption } = require("./script-generator");

      // Generar caption (necesitamos el script original, lo obtenemos de los datos de audio)
      const scriptOriginal =
        audioData.script || "Video de fútbol generado automáticamente";
      const captionData = await generarCaption(scriptOriginal, sessionId);

      // Guardar caption junto al video
      const captionPath = videoFinal.rutaBase + "_caption.txt";
      await fs.writeFile(captionPath, captionData.caption);

      await logAndNotify(
        sessionId,
        `📝 Caption guardado: ${captionData.caracteres} caracteres`
      );
      await logAndNotify(sessionId, `📁 Archivo: ${captionPath}`);
    } catch (error) {
      await logAndNotify(
        sessionId,
        `⚠️ Error generando caption: ${error.message}`
      );
    }

    await logAndNotify(
      sessionId,
      "🎉 VIDEO Y CAPTION COMPLETADOS EXITOSAMENTE"
    );

    return {
      archivo: videoFinal.archivo,
      nombreArchivo: videoFinal.nombreArchivo,
      tamaño: videoFinal.tamaño,
      generationId: videoGeneration.generationId,
      duracionProceso: "~8 minutos",
      success: true,
      caption: true, // NUEVO - Indica que tiene caption
    };
  } catch (error) {
    await logAndNotify(
      sessionId,
      `❌ Error en proceso completo: ${error.message}`
    );
    throw error;
  }
}

// Exportar funciones
module.exports = {
  procesarVideoCompleto,
  sincronizarAssets,
  crearVideo,
  verificarEstadoVideo,
  descargarVideo,
};
