require('dotenv').config();
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const TelegramBot = require('node-telegram-bot-api');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// TELEGRAM CONFIG
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Inicializar clientes
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const parser = new Parser();
const bot = new TelegramBot(BOT_TOKEN);

// Variable global para almacenar títulos
let titulosRecolectados = [];

// LAS MISMAS 4 FUENTES DE TU N8N ORIGINAL 🔥
const fuentesRSS = [
  {
    url: 'https://www.marca.com/rss/futbol.xml',
    seccion: 'Sport',
    pais: 'España',
    bandera: '🇪🇸'
  },
  {
    url: 'https://frenchfootballweekly.com/feed/',
    seccion: 'NZnews',
    pais: 'Francia',
    bandera: '🇫🇷'
  },
  {
    url: 'https://feeds.bbci.co.uk/sport/rss.xml',
    seccion: 'world',
    pais: 'Inglaterra',
    bandera: '🇬🇧'
  },
  {
    url: 'https://gazzetta.it/rss/home.xml',
    seccion: 'technology',
    pais: 'Italia',
    bandera: '🇮🇹'
  }
];

// ===== FUNCIÓN PARA ENVIAR TELEGRAM =====
async function enviarTelegram(mensaje) {
  try {
    await bot.sendMessage(CHAT_ID, mensaje, { parse_mode: 'HTML' });
    console.log('✅ Mensaje enviado a Telegram');
  } catch (error) {
    console.error('❌ Error enviando Telegram:', error.message);
  }
}

// ===== FUNCIONES AUXILIARES =====

function esperar(segundos) {
  return new Promise(resolve => setTimeout(resolve, segundos * 1000));
}

// Extraer contenido (versión optimizada para sitios internacionales)
async function extraerContenido(url) {
  try {
    console.log(`🔍 Extrayendo: ${url.substring(0, 50)}...`);
    
    const response = await axios.get(url, {
      timeout: 25000, // Más tiempo para sitios internacionales
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7,it;q=0.6'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Selectores ampliados para sitios internacionales
    const selectores = [
      'main article p',           // Sitios modernos
      '.article-content p',       // Marca, sitios españoles
      '.content p',               // Genérico
      'article p',                // BBC, sitios ingleses
      '.post-content p',          // Blogs franceses
      '.story-body p',            // BBC específico
      '.entry-content p',         // WordPress
      '.articolo-body p',         // Gazzetta italiana
      '.text p',                  // Gazzetta alternativo
      'div[data-module="ArticleBody"] p' // Gazzetta moderno
    ];
    
    let paragrafos = [];
    
    for (const selector of selectores) {
      $(selector).each((i, elem) => {
        const texto = $(elem).text().trim();
        if (texto.length > 30 && !texto.includes('Cookie') && !texto.includes('JavaScript')) {
          paragrafos.push(texto);
        }
      });
      
      if (paragrafos.length > 0) {
        console.log(`✅ Contenido extraído con: ${selector}`);
        break;
      }
    }
    
    // Si no encuentra nada, intentar párrafos genéricos
    if (paragrafos.length === 0) {
      $('p').each((i, elem) => {
        const texto = $(elem).text().trim();
        if (texto.length > 50 && !texto.includes('Cookie')) {
          paragrafos.push(texto);
        }
      });
      
      if (paragrafos.length > 0) {
        console.log(`✅ Contenido extraído con selector genérico`);
      }
    }
    
    // Mantener máximo 5 párrafos
    paragrafos = paragrafos.slice(0, 5);
    
    const contenidoLimpio = paragrafos
      .join('\n\n')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\[.*?\]/g, '') // Remover [enlaces]
      .substring(0, 2000);
    
    return contenidoLimpio;
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return '';
  }
}

// Crear embeddings
async function crearEmbedding(texto) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texto.substring(0, 8000)
    });
    
    return response.data[0].embedding;
    
  } catch (error) {
    console.error('❌ Error embedding:', error.message);
    return null;
  }
}

// Dividir en chunks
function dividirEnChunks(texto, tamanoChunk = 800, overlap = 100) {
  const chunks = [];
  let inicio = 0;
  
  while (inicio < texto.length && chunks.length < 3) {
    const fin = Math.min(inicio + tamanoChunk, texto.length);
    const chunk = texto.substring(inicio, fin);
    
    if (chunk.trim().length > 50) {
      chunks.push(chunk.trim());
    }
    
    inicio = fin - overlap;
    if (inicio >= texto.length) break;
  }
  
  return chunks;
}

// Procesar un país completo (MODIFICADA para recolectar títulos)
async function procesarPais(fuente, numerosPais) {
  console.log(`\n${fuente.bandera} PROCESANDO ${fuente.pais.toUpperCase()}`);
  console.log('='.repeat(50));
  
  let vectoresCreados = 0;
  let articulosProcesados = 0;
  let articulosExitosos = 0;
  let titulosPais = []; // Almacenar títulos del país
  
  try {
    // Leer RSS
    console.log(`📰 Leyendo RSS de ${fuente.pais}...`);
    const feed = await parser.parseURL(fuente.url);
    const noticias = feed.items.slice(0, 10);
    
    console.log(`✅ ${noticias.length} noticias obtenidas de ${fuente.pais}`);
    
    // Procesar en lotes de 2 (fórmula probada)
    for (let lote = 0; lote < noticias.length; lote += 2) {
      const noticiasBatch = noticias.slice(lote, lote + 2);
      
      console.log(`\n📦 ${fuente.bandera} LOTE ${Math.floor(lote/2) + 1}: Artículos ${lote + 1}-${Math.min(lote + 2, noticias.length)}`);
      
      for (let i = 0; i < noticiasBatch.length; i++) {
        const noticia = noticiasBatch[i];
        const numeroLocal = lote + i + 1;
        const numeroGlobal = numerosPais.inicio + articulosProcesados;
        
        console.log(`\n📄 ${numeroGlobal}/40: [${fuente.pais}] ${noticia.title.substring(0, 45)}...`);
        
        // Extraer contenido
        const contenido = await extraerContenido(noticia.link);
        
        if (contenido.length > 100) {
          // GUARDAR TÍTULO EXITOSO
          titulosPais.push({
            titulo: noticia.title,
            url: noticia.link,
            fecha: noticia.pubDate
          });
          
          // Crear texto completo
          const textoCompleto = `${noticia.title}\n\n${contenido}`;
          
          // Dividir en chunks
          const chunks = dividirEnChunks(textoCompleto);
          
          console.log(`📝 ${chunks.length} chunks creados`);
          
          // Procesar cada chunk
          for (let j = 0; j < chunks.length; j++) {
            const chunk = chunks[j];
            
            console.log(`  🔢 Embedding ${j + 1}/${chunks.length}...`);
            
            // Crear embedding
            const embedding = await crearEmbedding(chunk);
            
            if (embedding) {
              // Insertar en Supabase
              const { error } = await supabase.from('documents').insert({
                content: chunk,
                metadata: {
                  title: noticia.title,
                  url: noticia.link,
                  pubDate: noticia.pubDate,
                  section: fuente.seccion,
                  pais: fuente.pais,
                  chunk_index: j,
                  articulo_numero: numeroGlobal
                },
                embedding: embedding
              });
              
              if (!error) {
                vectoresCreados++;
                console.log(`  ✅ Vector ${numerosPais.vectorInicio + vectoresCreados} insertado`);
              } else {
                console.error(`  ❌ Error: ${error.message}`);
              }
            }
            
            await esperar(0.5);
          }
          
          articulosExitosos++;
        } else {
          console.log(`  ⚠️  Contenido insuficiente, saltando...`);
        }
        
        articulosProcesados++;
        await esperar(2);
      }
      
      // Delay entre lotes
      console.log(`⏳ Lote completado. Esperando 5 segundos...`);
      await esperar(5);
      
      if (global.gc) {
        global.gc();
      }
      
      console.log(`📊 ${fuente.pais}: ${articulosExitosos}/${articulosProcesados} exitosos | ${vectoresCreados} vectores`);
    }
    
  } catch (error) {
    console.error(`❌ Error procesando ${fuente.pais}:`, error.message);
  }
  
  // AGREGAR TÍTULOS A LA COLECCIÓN GLOBAL
  titulosRecolectados.push({
    pais: fuente.pais,
    bandera: fuente.bandera,
    titulos: titulosPais
  });
  
  console.log(`\n${fuente.bandera} ${fuente.pais.toUpperCase()} COMPLETADO:`);
  console.log(`📰 Artículos procesados: ${articulosProcesados}/10`);
  console.log(`✅ Artículos exitosos: ${articulosExitosos}`);
  console.log(`🔢 Vectores creados: ${vectoresCreados}`);
  
  return {
    articulos: articulosProcesados,
    exitosos: articulosExitosos,
    vectores: vectoresCreados
  };
}

// ===== FUNCIÓN PARA GENERAR RESUMEN TELEGRAM =====
async function enviarResumenTelegram(resultados, tiempoMinutos, vectoresTotales) {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString();
  const hora = ahora.toLocaleTimeString();
  
  // MENSAJE PRINCIPAL
  let mensaje = `🎉 <b>RAG ACTUALIZADO EXITOSAMENTE</b>\n\n`;
  mensaje += `📅 <b>Fecha:</b> ${fecha}\n`;
  mensaje += `⏰ <b>Hora:</b> ${hora}\n`;
  mensaje += `⚡ <b>Tiempo:</b> ${tiempoMinutos} minutos\n`;
  mensaje += `🔢 <b>Vectores totales:</b> ${vectoresTotales}\n\n`;
  
  // RESUMEN POR PAÍS
  mensaje += `📊 <b>RESUMEN POR PAÍS:</b>\n`;
  titulosRecolectados.forEach(paisData => {
    mensaje += `${paisData.bandera} <b>${paisData.pais}:</b> ${paisData.titulos.length} noticias\n`;
  });
  
  mensaje += `\n📰 <b>NOTICIAS AGREGADAS AL RAG:</b>\n\n`;
  
  // Enviar mensaje principal
  await enviarTelegram(mensaje);
  
  // ENVIAR TÍTULOS POR PAÍS (en mensajes separados para evitar límite)
  for (const paisData of titulosRecolectados) {
    if (paisData.titulos.length > 0) {
      let mensajePais = `${paisData.bandera} <b>${paisData.pais.toUpperCase()}</b>\n\n`;
      
      paisData.titulos.forEach((noticia, index) => {
        mensajePais += `${index + 1}. ${noticia.titulo}\n\n`;
      });
      
      // Dividir mensaje si es muy largo
      if (mensajePais.length > 4000) {
        const mensajes = [];
        let mensajeActual = `${paisData.bandera} <b>${paisData.pais.toUpperCase()}</b>\n\n`;
        
        paisData.titulos.forEach((noticia, index) => {
          const linea = `${index + 1}. ${noticia.titulo}\n\n`;
          
          if (mensajeActual.length + linea.length > 4000) {
            mensajes.push(mensajeActual);
            mensajeActual = linea;
          } else {
            mensajeActual += linea;
          }
        });
        
        if (mensajeActual.trim()) {
          mensajes.push(mensajeActual);
        }
        
        // Enviar todos los mensajes divididos
        for (const msg of mensajes) {
          await enviarTelegram(msg);
          await esperar(1); // Evitar rate limit
        }
      } else {
        await enviarTelegram(mensajePais);
      }
      
      await esperar(1);
    }
  }
  
  // MENSAJE FINAL
  const mensajeFinal = `✅ <b>RAG COMPLETAMENTE ACTUALIZADO</b>\n\n🚀 El sistema está listo para generar videos con las últimas noticias deportivas internacionales.`;
  await enviarTelegram(mensajeFinal);
}

// ===== FUNCIÓN PRINCIPAL ÉPICA =====
async function scraperRAGCompleto4Paises() {
  console.log('🚀 FOOTBALL RAG - REEMPLAZO COMPLETO DE N8N');
  console.log('🌍 PROCESANDO 4 PAÍSES × 10 ARTÍCULOS = 40 TOTAL');
  console.log('🎯 OBJETIVO: ~120 VECTORES EN RAG INTERNACIONAL\n');
  console.log('='.repeat(70));
  
  const horaInicio = new Date();
  console.log(`⏰ Inicio: ${horaInicio.toLocaleTimeString()}`);
  
  // Limpiar array de títulos
  titulosRecolectados = [];
  
  // NOTIFICAR INICIO
  await enviarTelegram(`🚀 <b>INICIANDO ACTUALIZACIÓN RAG</b>\n\n⏰ Inicio: ${horaInicio.toLocaleTimeString()}\n🌍 Procesando 4 países...\n📰 ~40 artículos deportivos`);
  
  // PASO 1: Limpiar base de datos
  console.log('\n🗑️  LIMPIANDO BASE DE DATOS...');
  try {
    const { error } = await supabase.from('documents').delete().gt('id', 0);
    if (error) throw error;
    console.log('✅ Base de datos limpiada - listo para datos frescos');
  } catch (error) {
    console.error('❌ Error limpiando DB:', error.message);
  }
  
  await esperar(3);
  
  // PASO 2: Procesar los 4 países
  const resultados = {};
  let vectoresTotales = 0;
  let articulosTotales = 0;
  let articulosExitososTotales = 0;
  
  for (let i = 0; i < fuentesRSS.length; i++) {
    const fuente = fuentesRSS[i];
    
    // Calcular números para tracking global
    const numerosPais = {
      inicio: articulosTotales + 1,
      vectorInicio: vectoresTotales
    };
    
    console.log(`\n🌍 PAÍS ${i + 1}/4: ${fuente.bandera} ${fuente.pais.toUpperCase()}`);
    
    const resultado = await procesarPais(fuente, numerosPais);
    
    resultados[fuente.pais] = resultado;
    vectoresTotales += resultado.vectores;
    articulosTotales += resultado.articulos;
    articulosExitososTotales += resultado.exitosos;
    
    // Pausa entre países (más larga para procesos grandes)
    if (i < fuentesRSS.length - 1) {
      console.log(`\n⏳ PAUSA ENTRE PAÍSES: Esperando 25 segundos...`);
      console.log(`📊 Progreso general: ${articulosExitososTotales} exitosos | ${vectoresTotales} vectores`);
      await esperar(25);
    }
  }
  
  const horaFin = new Date();
  const tiempoTotal = Math.round((horaFin - horaInicio) / 1000 / 60);
  
  console.log('\n🎉 ¡PROCESO ÉPICO COMPLETADO!');
  console.log('='.repeat(70));
  console.log(`⏰ Tiempo total: ${tiempoTotal} minutos`);
  console.log(`🌍 Países procesados: ${fuentesRSS.length}/4`);
  console.log(`📰 Total artículos: ${articulosTotales}/40`);
  console.log(`✅ Artículos exitosos: ${articulosExitososTotales}`);
  console.log(`🔢 Total vectores: ${vectoresTotales}`);
  console.log(`📊 Tasa de éxito: ${((articulosExitososTotales/articulosTotales)*100).toFixed(1)}%`);
  console.log(`🎯 Promedio: ${(vectoresTotales/articulosExitososTotales).toFixed(1)} vectores/artículo`);
  
  console.log('\n🏆 DESGLOSE POR PAÍS:');
  Object.entries(resultados).forEach(([pais, resultado]) => {
    const fuente = fuentesRSS.find(f => f.pais === pais);
    console.log(`${fuente.bandera} ${pais}: ${resultado.exitosos}/${resultado.articulos} → ${resultado.vectores} vectores`);
  });
  
  console.log(`\n🚀 RAG INTERNACIONAL COMPLETO - LISTO PARA CONSULTAS AVANZADAS`);
  console.log(`🎯 Tu workflow de n8n ha sido COMPLETAMENTE REEMPLAZADO`);
  
  // ENVIAR RESUMEN COMPLETO A TELEGRAM
  console.log('\n📱 Enviando resumen completo a Telegram...');
  await enviarResumenTelegram(resultados, tiempoTotal, vectoresTotales);
  
  return {
    totalArticulos: articulosTotales,
    articulosExitosos: articulosExitososTotales,
    totalVectores: vectoresTotales,
    tiempoMinutos: tiempoTotal,
    paises: resultados
  };
}

// EJECUTAR EL PROCESO ÉPICO
console.log('🔥 FOOTBALL RAG SCRAPER - VERSIÓN FINAL CON TELEGRAM');
console.log('Reemplazando workflow completo de n8n...');
console.log('España + Francia + Inglaterra + Italia\n');

scraperRAGCompleto4Paises()
  .then((resultado) => {
    console.log(`\n✅ ¡ÉXITO LEGENDARIO!`);
    console.log(`🏆 ${resultado.articulosExitosos} artículos → ${resultado.totalVectores} vectores`);
    console.log(`⚡ Completado en ${resultado.tiempoMinutos} minutos`);
    console.log(`🌍 RAG multi-idioma y multi-país operativo`);
    console.log(`🎯 ¡N8N OFICIALMENTE REEMPLAZADO!`);
    console.log(`📱 Resumen enviado a Telegram`);
  })
  .catch(error => {
    console.error('\n❌ ERROR:', error.message);
  });