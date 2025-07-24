const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');

// Configuración
const HEDRA_API_KEY = process.env.HEDRA_API_KEY;

console.log('📸 IMAGE PROCESSOR INICIADO');

// Función para cargar imagen desde la carpeta images/
async function cargarImagen(imageName, sessionId) {
  try {
    console.log(`📸 [${sessionId}] Cargando imagen: ${imageName}`);
    
    // Buscar archivo en la carpeta images/
    const imagePath = path.join('images', `${imageName}.png`);
    
    // Verificar que el archivo existe
    try {
      await fs.access(imagePath);
    } catch (error) {
      throw new Error(`Imagen no encontrada: ${imagePath}`);
    }
    
    // Leer el archivo
    const imageBuffer = await fs.readFile(imagePath);
    const imageSize = (imageBuffer.length / 1024).toFixed(2);
    
    console.log(`✅ [${sessionId}] Imagen cargada: ${imagePath} (${imageSize} KB)`);
    
    return {
      buffer: imageBuffer,
      nombre: imageName,
      archivo: imagePath,
      tamaño: imageSize + ' KB'
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error cargando imagen:`, error.message);
    throw new Error(`Error cargando imagen: ${error.message}`);
  }
}

// Función para crear asset de imagen en Hedra (Paso 1)
async function crearImagenAsset(imageBuffer, imageName, sessionId) {
  try {
    console.log(`🎬 [${sessionId}] Creando imagen asset en Hedra...`);
    
    // Convertir imagen a base64
    const imageBase64 = imageBuffer.toString('base64');
    
    const response = await axios.post(
      'https://api.hedra.com/web-app/public/assets',
      {
        name: `${imageName}.png`,
        type: 'image',
        data: imageBase64
      },
      {
        headers: {
          'X-Api-Key': HEDRA_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 MINUTOS en lugar de 30 segundos
      }
    );

    const imageAssetId = response.data.id;
    console.log(`✅ [${sessionId}] Imagen asset creada: ${imageAssetId}`);

    return {
      id: imageAssetId,
      type: 'image',
      name: `${imageName}.png`
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error creando imagen asset:`, error.response?.status || error.message);
    throw new Error(`Error creando imagen asset: ${error.message}`);
  }
}

// Función para subir imagen file a Hedra (Paso 2)
async function subirImagenFile(imageBuffer, imageAssetId, imageName, sessionId) {
  try {
    console.log(`🎬 [${sessionId}] Subiendo imagen file a Hedra...`);
    
    // Crear FormData con el archivo
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: `${imageName}.png`,
      contentType: 'image/png'
    });
    
    const response = await axios.post(
      `https://api.hedra.com/web-app/public/assets/${imageAssetId}/upload`,
      formData,
      {
        headers: {
          'X-Api-Key': HEDRA_API_KEY,
          ...formData.getHeaders()
        },
        timeout: 120000 // 2 MINUTOS
      }
    );

    console.log(`✅ [${sessionId}] Imagen file subida exitosamente`);

    return {
      id: imageAssetId,
      type: 'image',
      uploaded: true,
      asset: response.data
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error subiendo imagen file:`, error.response?.status || error.message);
    throw new Error(`Error subiendo imagen file: ${error.message}`);
  }
}

// Función completa para procesar imagen (Cargar + Hedra)
async function procesarImagen(imageName, sessionId) {
  try {
    console.log(`📸 [${sessionId}] Iniciando proceso completo de imagen...`);

    // PASO 1: Cargar imagen desde carpeta local
    const imagenData = await cargarImagen(imageName, sessionId);
    
    // PASO 2: Crear imagen asset en Hedra
    const imagenAsset = await crearImagenAsset(imagenData.buffer, imageName, sessionId);
    
    // PASO 3: Subir imagen file a Hedra
    const imagenCompleta = await subirImagenFile(imagenData.buffer, imagenAsset.id, imageName, sessionId);
    
    console.log(`✅ [${sessionId}] Imagen completamente procesada para Hedra: ${imagenCompleta.id}`);

    return {
      // Datos de la imagen local
      nombre: imagenData.nombre,
      archivo: imagenData.archivo,
      tamaño: imagenData.tamaño,
      
      // Datos de Hedra
      imageAssetId: imagenCompleta.id,
      hedraMetadata: imagenAsset,
      hedraUpload: imagenCompleta,
      
      // Buffer para uso posterior
      buffer: imagenData.buffer
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error en proceso de imagen:`, error.message);
    throw error;
  }
}

// Función para verificar imágenes disponibles
async function verificarImagenesDisponibles() {
  try {
    const imagenesDir = 'images';
    const archivos = await fs.readdir(imagenesDir);
    
    const imagenesDisponibles = archivos
      .filter(archivo => archivo.endsWith('.png'))
      .map(archivo => archivo.replace('.png', ''));
    
    console.log(`📸 Imágenes disponibles: ${imagenesDisponibles.join(', ')}`);
    return imagenesDisponibles;
    
  } catch (error) {
    console.error('❌ Error verificando imágenes:', error.message);
    return [];
  }
}

// Exportar funciones
module.exports = {
  procesarImagen,
  cargarImagen,
  crearImagenAsset,
  subirImagenFile,
  verificarImagenesDisponibles
};