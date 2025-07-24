require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser'); // NUEVO
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// IMPORTAR SISTEMA DE AUTENTICACIÓN
const { requireAuth, requireAdmin, validarCredenciales, crearUsuario, listarUsuarios } = require('./modules/auth-manager'); // NUEVO

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cookieParser()); // NUEVO
app.use(express.static('.'));

// Variables globales para procesos
let scraperProcess = null;
let botProcess = null;
let clients = []; // Para Server-Sent Events
let videoSessions = new Map(); // Para sesiones de video pendientes


console.log('🚀 SERVIDOR EXPRESS INICIANDO...');

// ================================
// RUTAS DE AUTENTICACIÓN - NUEVAS
// ================================

// Ruta de login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.json({ success: false, message: 'Usuario y contraseña requeridos' });
    }
    
    const result = await validarCredenciales(username, password);
    
    if (result.success) {
      // Establecer cookie con el token
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: false, // En producción cambiar a true
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      });
      
      broadcastLog(`✅ Login exitoso: ${username} (${result.user.role})`);
      
      res.json({
        success: true,
        message: 'Login exitoso',
        user: result.user
      });
    } else {
      broadcastLog(`❌ Login fallido: ${username} - ${result.message}`);
      res.json(result);
    }
    
  } catch (error) {
    broadcastLog(`❌ Error en login: ${error.message}`);
    res.json({ success: false, message: 'Error interno del servidor' });
  }
});

// Ruta de logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Logout exitoso' });
});

// Ruta para listar usuarios (solo admin)
app.get('/api/auth/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await listarUsuarios();
    res.json(result);
  } catch (error) {
    res.json({ success: false, message: 'Error cargando usuarios' });
  }
});

// Ruta para crear usuario (solo admin)
// Ruta para crear usuario (solo admin) - VERSIÓN CON EMAIL
app.post('/api/auth/create-user', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, name, email, role } = req.body; // AGREGAMOS EMAIL
    
    if (!username || !password || !name || !email) { // AGREGAMOS EMAIL A LA VALIDACIÓN
      return res.json({ success: false, message: 'Todos los campos son requeridos' });
    }
    
    const result = await crearUsuario(username, password, name, email, role); // AGREGAMOS EMAIL
    
    if (result.success) {
      broadcastLog(`✅ Usuario creado: ${username} (${email}) por ${req.user.username}`);
    }
    
    res.json(result);
  } catch (error) {
    res.json({ success: false, message: 'Error creando usuario' });
  }
});

// Verificar si el usuario está autenticado
app.get('/api/auth/check', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});





// Endpoint para logs en tiempo real (Server-Sent Events)
app.get('/api/logs', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  clients.push(res);
  console.log(`📱 Cliente conectado. Total: ${clients.length}`);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
    console.log(`📱 Cliente desconectado. Total: ${clients.length}`);
  });
});

// Función para enviar logs a todos los clientes
function broadcastLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  
  clients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify({ log: logMessage })}\n\n`);
    } catch (error) {
      // Cliente desconectado
    }
  });
}

// Endpoint para ejecutar scraper
app.post('/api/scraper/start', requireAuth, (req, res) => {
  if (scraperProcess) {
    return res.json({ success: false, message: 'Scraper ya está ejecutándose' });
  }

  broadcastLog('🚀 Iniciando scraper de noticias...');
  
  scraperProcess = spawn('node', ['scraper-4-paises-final.js'], {
    cwd: __dirname
  });

  scraperProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => broadcastLog(`📰 ${line}`));
  });

  scraperProcess.stderr.on('data', (data) => {
    broadcastLog(`❌ Error: ${data.toString()}`);
  });

  scraperProcess.on('close', (code) => {
    if (code === 0) {
      broadcastLog('✅ Scraper completado exitosamente');
    } else {
      broadcastLog(`❌ Scraper terminó con código: ${code}`);
    }
    scraperProcess = null;
  });

  res.json({ success: true, message: 'Scraper iniciado' });
});

// Endpoint para iniciar bot
app.post('/api/bot/start', requireAuth, (req, res) => {
  if (botProcess) {
    return res.json({ success: false, message: 'Bot ya está ejecutándose' });
  }

  broadcastLog('🤖 Iniciando bot de Telegram...');
  
  botProcess = spawn('node', ['main.js'], {
    cwd: __dirname
  });

  botProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => broadcastLog(`🤖 ${line}`));
  });

  botProcess.stderr.on('data', (data) => {
    broadcastLog(`❌ Bot Error: ${data.toString()}`);
  });

  botProcess.on('close', (code) => {
    broadcastLog(`🤖 Bot terminado con código: ${code}`);
    botProcess = null;
  });

  res.json({ success: true, message: 'Bot iniciado' });
});

// Endpoint para detener bot
app.post('/api/bot/stop', requireAuth, (req, res) => {
  if (botProcess) {
    botProcess.kill('SIGTERM');
    broadcastLog('⏹️ Bot de Telegram detenido');
    botProcess = null;
    res.json({ success: true, message: 'Bot detenido' });
  } else {
    res.json({ success: false, message: 'Bot no está ejecutándose' });
  }
});

// Endpoint para generar video manual (CON APROBACIÓN)
app.post('/api/video/generate', requireAuth, async (req, res) => {
  const { imagen, consulta } = req.body;
  
  if (!imagen || !consulta) {
    return res.json({ success: false, message: 'Imagen y consulta son requeridas' });
  }

  const sessionId = `manual_${Date.now()}`;
  broadcastLog(`🎬 Generación manual: ${imagen}@${consulta}`);
  
  try {
    // Importar módulo de script
    const { generarScript } = require('./modules/script-generator');
    
    // PASO 1: Generar script SOLAMENTE
    broadcastLog('🤖 Consultando IA + RAG...');
    const scriptData = await generarScript(consulta, sessionId);
    
    if (!scriptData.encontrado) {
      broadcastLog('❌ No se encontraron datos en RAG para esta consulta');
      return res.json({ success: false, message: 'No se encontraron datos para esta consulta' });
    }
    
    // Guardar sesión pendiente
    videoSessions.set(sessionId, {
      imagen,
      consulta,
      script: scriptData.script,
      palabras: scriptData.palabras,
      timestamp: Date.now()
    });
    
    // Enviar script para aprobación
    broadcastLog(`📝 SCRIPT GENERADO [${sessionId}]:`);
    broadcastLog(`"${scriptData.script}"`);
    broadcastLog(`📊 PALABRAS: ${scriptData.palabras}`);
    broadcastLog(`⏱️ DURACIÓN ESTIMADA: ${Math.floor(scriptData.palabras/4)} segundos`);
    broadcastLog(`🤖 GENERADO CON: OpenAI + RAG`);
    broadcastLog(`📚 FUENTES: ${scriptData.documentos} documentos`);
    broadcastLog('');
    broadcastLog('❓ ¿APROBAR SCRIPT?');
    broadcastLog('✅ Usa los botones APROBAR/RECHAZAR que aparecerán');
    
    res.json({ 
      success: true, 
      sessionId: sessionId,
      script: scriptData.script,
      palabras: scriptData.palabras,
      needsApproval: true,
      message: 'Script generado - Requiere aprobación'
    });
    
  } catch (error) {
    broadcastLog(`❌ Error generando script: ${error.message}`);
    res.json({ success: false, message: error.message });
  }
});

// Endpoint para aprobar script (ULTRA ROBUSTO)
app.post('/api/video/approve/:sessionId', requireAuth, async (req, res) => {
  const { sessionId } = req.params;
  const session = videoSessions.get(sessionId);
  
  if (!session) {
    return res.json({ success: false, message: 'Sesión no encontrada o expirada' });
  }
  
  // Verificar que no haya pasado mucho tiempo (30 minutos max)
  const now = Date.now();
  if (now - session.timestamp > 30 * 60 * 1000) {
    videoSessions.delete(sessionId);
    return res.json({ success: false, message: 'Sesión expirada (30 min)' });
  }
  
  // Responder inmediatamente para que el frontend no se cuelgue
  res.json({ success: true, message: 'Video iniciado - Proceso puede tardar 8-10 minutos' });
  
  broadcastLog('✅ Script aprobado - Continuando con el proceso...');
  broadcastLog('⚠️  PROCESO LARGO - Esto tomará varios minutos');
  broadcastLog('📋 Puedes seguir el progreso en estos logs');
  
  try {
    // Importar módulos del sistema
    const { procesarAudio } = require('./modules/audio-processor');
    const { procesarImagen } = require('./modules/image-processor');
    const { procesarVideoCompleto } = require('./modules/video-creator');
    
    // PASO 2: Procesar audio e imagen en paralelo
    broadcastLog('🔄 Iniciando procesos paralelos...');
    broadcastLog('⏳ Audio: ~2 minutos (ElevenLabs + Hedra)');
    broadcastLog('⏳ Imagen: ~30 segundos (Hedra upload)');
    
    // Delay inicial para evitar rate limits
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let audioData, imagenData;
    
    try {
      [audioData, imagenData] = await Promise.all([
        procesarAudio(session.script, sessionId),
        procesarImagen(session.imagen, sessionId)
      ]);
    } catch (parallelError) {
      broadcastLog(`❌ Error en procesos paralelos: ${parallelError.message}`);
      
      if (parallelError.message.includes('429')) {
        broadcastLog('💡 Límite de ElevenLabs alcanzado');
        broadcastLog('🕐 Intenta de nuevo en 5-10 minutos');
      } else if (parallelError.message.includes('timeout')) {
        broadcastLog('💡 Timeout en Hedra');
        broadcastLog('🌐 Las APIs están lentas, intenta más tarde');
      }
      
      videoSessions.delete(sessionId);
      return;
    }
    
    broadcastLog('✅ PROCESAMIENTO COMPLETADO:');
    broadcastLog(`🔊 Audio: ${audioData.nombreArchivo}`);
    broadcastLog(`📸 Imagen: ${imagenData.nombre}`);
    broadcastLog(`🎬 Audio Asset: ${audioData.audioAssetId}`);
    broadcastLog(`📸 Image Asset: ${imagenData.imageAssetId}`);
    broadcastLog('');
    broadcastLog('🎬 Creando video final con Hedra...');
    broadcastLog('⏳ Esta es la parte más lenta: 5-8 minutos');
    broadcastLog('🤖 Hedra está creando presentadora con sync de labios');
    
    // PASO 3: Crear video final
    let videoFinal;
    
    try {
      videoFinal = await procesarVideoCompleto(audioData, imagenData, sessionId);
    } catch (videoError) {
      broadcastLog(`❌ Error creando video final: ${videoError.message}`);
      
      if (videoError.message.includes('Timeout')) {
        broadcastLog('💡 El video puede estar aún procesándose en Hedra');
        broadcastLog(`🆔 Video ID: Revisa manualmente más tarde`);
      }
      
      videoSessions.delete(sessionId);
      return;
    }
    
    broadcastLog('');
    broadcastLog('🎉 VIDEO COMPLETADO EXITOSAMENTE! 🎉');
    broadcastLog(`📁 Archivo: ${videoFinal.nombreArchivo}`);
    broadcastLog(`📏 Tamaño: ${videoFinal.tamaño}`);
    broadcastLog(`⏱️ Proceso total: ${videoFinal.duracionProceso}`);
    broadcastLog(`📅 Completado: ${new Date().toLocaleTimeString()}`);
    broadcastLog('📂 Ubicación: videos_finales/');
    broadcastLog('🚀 ¡Tu video está listo para usar!');
    
    // Limpiar sesión
    videoSessions.delete(sessionId);
    
  } catch (error) {
    broadcastLog(`❌ Error inesperado: ${error.message}`);
    broadcastLog('🔧 Stack trace para debugging:');
    broadcastLog(error.stack || 'No stack available');
    
    videoSessions.delete(sessionId);
  }
});

// Endpoint para rechazar script
app.post('/api/video/reject/:sessionId', requireAuth, (req, res) => {
  const { sessionId } = req.params;
  const session = videoSessions.get(sessionId);
  
  if (!session) {
    return res.json({ success: false, message: 'Sesión no encontrada' });
  }
  
  broadcastLog('❌ PROCESO CANCELADO');
  broadcastLog('El script no fue aprobado.');
  broadcastLog('Puedes intentar con otra consulta.');
  
  videoSessions.delete(sessionId);
  
  res.json({ success: true, message: 'Script rechazado' });
});

// Endpoint para obtener estadísticas
app.get('/api/stats', requireAuth, (req, res) => {
  try {
    // Contar archivos en carpetas
    const videosDir = 'videos_finales';
    const audioDir = 'audios_generados';
    
    let videosCount = 0;
    let audiosCount = 0;
    
    if (fs.existsSync(videosDir)) {
      videosCount = fs.readdirSync(videosDir).filter(file => file.endsWith('.mp4')).length;
    }
    
    if (fs.existsSync(audioDir)) {
      audiosCount = fs.readdirSync(audioDir).filter(file => file.endsWith('.mp3')).length;
    }

    res.json({
      vectores: 84, // Valor fijo por ahora
      videos: videosCount,
      audios: audiosCount,
      exito: videosCount > 0 ? '100%' : '0%',
      scraperActivo: scraperProcess !== null,
      botActivo: botProcess !== null
    });
  } catch (error) {
    res.json({
      vectores: 0,
      videos: 0,
      audios: 0,
      exito: '0%',
      scraperActivo: false,
      botActivo: false
    });
  }
});

// Endpoint para limpiar logs
app.post('/api/logs/clear', requireAuth, (req, res) => {
  broadcastLog('🗑️ Logs limpiados');
  res.json({ success: true });
});

// Servir página de login
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// NUEVA RUTA - Redirigir root a login si no está autenticado
app.get('/', (req, res) => {
  const token = req.cookies?.auth_token;
  
  if (!token) {
    // No hay token, redirigir a login
    return res.redirect('/login.html');
  }
  
  // Verificar token
  const { verificarToken } = require('./modules/auth-manager');
  const verification = verificarToken(token);
  
  if (!verification.success) {
    // Token inválido, redirigir a login
    return res.redirect('/login.html');
  }
  
  // Token válido, mostrar dashboard
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});


// Servir panel de admin (solo admin) - VERSIÓN REFORZADA
app.get('/admin.html', requireAuth, requireAdmin, (req, res) => {
  // Doble verificación de seguridad
  if (req.user.role !== 'admin') {
    broadcastLog(`❌ Acceso denegado al panel admin: ${req.user.username} (${req.user.role})`);
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. Solo administradores.' 
    });
  }
  
  broadcastLog(`✅ Acceso admin autorizado: ${req.user.username}`);
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Servir dashboard (requiere autenticación)
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Redirigir a login si no está autenticado
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    res.redirect('/login.html');
  } else {
    next(err);
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor iniciado en http://localhost:${PORT}`);
  console.log('📋 Dashboard disponible en el navegador');
  console.log('⚡ APIs listas para conectar frontend con backend');
  
  broadcastLog('🌐 Servidor Express iniciado');
  broadcastLog('📋 Dashboard web disponible');
  broadcastLog('⚡ Sistema listo para usar');
});

// Manejo de cierre del servidor
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  
  if (scraperProcess) {
    scraperProcess.kill('SIGTERM');
  }
  
  if (botProcess) {
    botProcess.kill('SIGTERM');
  }
  
  process.exit(0);
});

// Endpoint para descargar videos
app.get('/api/videos/download/:filename', requireAuth, (req, res) => {
  try {
    const { filename } = req.params;
    const videoPath = path.join(__dirname, 'videos_finales', filename);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ success: false, message: 'Video no encontrado' });
    }
    
    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');
    
    // Enviar archivo
    res.sendFile(videoPath);
    
    broadcastLog(`📥 Video descargado: ${filename} por ${req.user.username}`);
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error descargando video' });
  }
});

// Endpoint para listar videos disponibles
app.get('/api/videos/list', requireAuth, (req, res) => {
  try {
    const videosDir = 'videos_finales';
    
    // Verificar que la carpeta existe
    if (!fs.existsSync(videosDir)) {
      return res.json({ success: true, videos: [] });
    }
    
    // Leer archivos de video
    const archivos = fs.readdirSync(videosDir)
      .filter(file => file.endsWith('.mp4'))
      .map(file => {
        const filePath = path.join(videosDir, file);
        const stats = fs.statSync(filePath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        return {
          nombre: file,
          fecha: stats.mtime.toISOString().split('T')[0], // Solo fecha
          hora: stats.mtime.toTimeString().split(' ')[0], // Solo hora
          tamaño: sizeInMB + ' MB',
          fechaCompleta: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.fechaCompleta) - new Date(a.fechaCompleta)); // Más recientes primero
    
    res.json({ 
      success: true, 
      videos: archivos,
      total: archivos.length 
    });
    
  } catch (error) {
    console.error('Error listando videos:', error);
    res.status(500).json({ success: false, message: 'Error listando videos' });
  }
});