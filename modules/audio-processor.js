const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');

// Configuración
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID; // Nathalia
const HEDRA_API_KEY = process.env.HEDRA_API_KEY;

console.log('🔊 AUDIO PROCESSOR INICIADO');

// Función para generar audio con ElevenLabs
async function generarAudio(texto, sessionId) {
  try {
    console.log(`🔊 [${sessionId}] Generando audio con Nathalia...`);
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        text: texto,
        model_id: "eleven_multilingual_v2", // Modelo para español
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );

    console.log(`✅ [${sessionId}] Audio generado con ElevenLabs`);
    
    // Crear nombre con fecha/hora: audioDDMMhhmmss
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const hora = String(ahora.getHours()).padStart(2, '0');
    const minuto = String(ahora.getMinutes()).padStart(2, '0');
    const segundo = String(ahora.getSeconds()).padStart(2, '0');
    
    const nombreArchivo = `audio${dia}${mes}${hora}${minuto}${segundo}.mp3`;
    
    // Guardar archivo de audio
    const audioDir = 'audios_generados';
    await fs.mkdir(audioDir, { recursive: true });
    
    const audioFile = path.join(audioDir, nombreArchivo);
    const audioBuffer = Buffer.from(response.data);
    await fs.writeFile(audioFile, audioBuffer);
    
    console.log(`💾 [${sessionId}] Audio guardado: ${audioFile}`);
    
    return {
      buffer: audioBuffer,
      archivo: audioFile,
      nombreArchivo: nombreArchivo,
      duracion: Math.floor(texto.split(' ').length / 3),
      voz: 'Nathalia',
      modelo: 'eleven_multilingual_v2',
      palabras: texto.split(' ').length
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error ElevenLabs:`, error.response?.status || error.message);
    throw new Error(`Error generando audio: ${error.message}`);
  }
}

// Función para crear asset de audio en Hedra (Paso 1)
async function crearAudioAsset(audioBuffer, sessionId) {
  try {
    console.log(`🎬 [${sessionId}] Creando audio asset en Hedra...`);
    
    // Convertir audio a base64
    const audioBase64 = audioBuffer.toString('base64');
    
    const response = await axios.post(
      'https://api.hedra.com/web-app/public/assets',
      {
        name: 'journalist-audio',
        type: 'audio',
        data: audioBase64
      },
      {
        headers: {
          'X-Api-Key': HEDRA_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 MINUTOS
      }
    );

    const audioAssetId = response.data.id;
    console.log(`✅ [${sessionId}] Audio asset creado: ${audioAssetId}`);

    return {
      id: audioAssetId,
      type: 'audio',
      name: 'journalist-audio'
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error creando audio asset:`, error.response?.status || error.message);
    throw new Error(`Error creando audio asset: ${error.message}`);
  }
}

// Función para subir audio file a Hedra (Paso 2)
async function subirAudioFile(audioBuffer, audioAssetId, sessionId) {
  try {
    console.log(`🎬 [${sessionId}] Subiendo audio file a Hedra...`);
    
    // Crear FormData con el archivo
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.mp3',
      contentType: 'audio/mpeg'
    });
    
    const response = await axios.post(
      `https://api.hedra.com/web-app/public/assets/${audioAssetId}/upload`,
      formData,
      {
        headers: {
          'X-Api-Key': HEDRA_API_KEY,
          ...formData.getHeaders()
        },
        timeout: 120000 // 2 MINUTOS
      }
    );

    console.log(`✅ [${sessionId}] Audio file subido exitosamente`);

    return {
      id: audioAssetId,
      type: 'audio',
      uploaded: true,
      asset: response.data
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error subiendo audio file:`, error.response?.status || error.message);
    throw new Error(`Error subiendo audio file: ${error.message}`);
  }
}

// Función completa para procesar audio (ElevenLabs + Hedra)
async function procesarAudio(texto, sessionId) {
  try {
    console.log(`🔊 [${sessionId}] Iniciando proceso completo de audio...`);

    // PASO 1: Generar audio con ElevenLabs
    const audioData = await generarAudio(texto, sessionId);
    
    // PASO 2: Crear audio asset en Hedra
    const audioAsset = await crearAudioAsset(audioData.buffer, sessionId);
    
    // PASO 3: Subir audio file a Hedra
    const audioCompleto = await subirAudioFile(audioData.buffer, audioAsset.id, sessionId);
    
    console.log(`✅ [${sessionId}] Audio completamente procesado para Hedra: ${audioCompleto.id}`);

    return {
      // Datos de ElevenLabs
      archivo: audioData.archivo,
      nombreArchivo: audioData.nombreArchivo,
      duracion: audioData.duracion,
      voz: audioData.voz,
      modelo: audioData.modelo,
      palabras: audioData.palabras,
      
      // Datos de Hedra
      audioAssetId: audioCompleto.id,
      hedraMetadata: audioAsset,
      hedraUpload: audioCompleto,
      
      // Buffer para uso posterior
      buffer: audioData.buffer
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error en proceso de audio:`, error.message);
    throw error;
  }
}

// Exportar funciones
module.exports = {
  procesarAudio,
  generarAudio,
  crearAudioAsset,
  subirAudioFile
};