const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Configuración
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log('🤖 SCRIPT GENERATOR INICIADO');

// Función RAG para buscar en la base de datos
async function consultarRAG(consulta) {
  try {
    console.log(`🔍 [RAG] Buscando información para: "${consulta}"`);
    
    const palabrasClave = consulta.toLowerCase()
      .replace(/[^\wáéíóúñü\s]/g, '')
      .split(' ')
      .filter(palabra => palabra.length > 2)
      .filter(palabra => !['que', 'del', 'las', 'los', 'una', 'sobre', 'para', 'con', 'por', 'dame', 'dime', 'noticias'].includes(palabra));

    console.log(`🔎 [RAG] Palabras clave: [${palabrasClave.join(', ')}]`);

    if (palabrasClave.length === 0) {
      console.log('⚠️ [RAG] No se encontraron palabras clave válidas');
      return [];
    }

    let documentosEncontrados = [];

    // Priorizar equipos y jugadores TOP
    const equiposTop = ['barcelona', 'madrid', 'manchester', 'liverpool', 'city', 'chelsea', 'arsenal', 'tottenham', 'psg', 'milan', 'inter', 'juventus', 'napoli', 'bayern', 'dortmund'];
    const jugadoresTop = ['mbappe', 'haaland', 'vinicius', 'bellingham', 'pedri', 'gavi', 'lautaro', 'dembele', 'messi', 'cristiano', 'benzema'];

    // Buscar primero por equipos y jugadores TOP
    for (const palabra of palabrasClave.slice(0, 3)) {
      let prioridad = equiposTop.some(equipo => palabra.includes(equipo)) || 
                     jugadoresTop.some(jugador => palabra.includes(jugador));

      const { data, error } = await supabase
        .from('documents')
        .select('content, metadata')
        .or(`content.ilike.%${palabra}%,metadata->>title.ilike.%${palabra}%`)
        .limit(prioridad ? 8 : 5);

      if (!error && data && data.length > 0) {
        documentosEncontrados.push(...data);
        console.log(`📄 [RAG] Encontrados ${data.length} docs para "${palabra}" ${prioridad ? '(TOP PRIORITY)' : ''}`);
      }
    }

    // Eliminar duplicados y priorizar contenido TOP
    const documentosUnicos = documentosEncontrados.filter((doc, index, self) => 
      index === self.findIndex(d => d.content === doc.content)
    ).slice(0, 5);

    console.log(`✅ [RAG] Total: ${documentosUnicos.length} documentos únicos encontrados`);

    return documentosUnicos;

  } catch (error) {
    console.error('❌ [RAG] Error:', error.message);
    return [];
  }
}

// Función para generar script con IA REAL + RAG OPTIMIZADA
async function generarScript(consulta, sessionId) {
  try {
    console.log(`🤖 [${sessionId}] Iniciando generación con IA + RAG`);

    // PASO 1: Consultar RAG
    const documentos = await consultarRAG(consulta);
    
    if (documentos.length === 0) {
      console.log(`❌ [${sessionId}] No hay documentos en RAG`);
      return {
        script: "Lo siento, actualmente no contamos con esta información en nuestra base de conocimientos deportivos. ¿Hay alguna otra noticia deportiva sobre la que pueda informarte?",
        encontrado: false,
        palabras: 0
      };
    }

    // PASO 2: Preparar contexto para IA
    const contextoRAG = documentos.map((doc, index) => {
      const metadata = doc.metadata || {};
      return `DOCUMENTO ${index + 1}:
TÍTULO: ${metadata.title || 'Sin título'}
PAÍS: ${metadata.pais || 'Sin país'}
FECHA: ${metadata.pubDate || 'Sin fecha'}
CONTENIDO: ${doc.content}
---`;
    }).join('\n\n');

    // PASO 3: Prompt EXACTO del original optimizado
    const promptOriginalOptimizado = `Eres una presentadora de noticias deportivas muy alegre especializada en crear scripts de audio dirigidos al público amante del futbol y de los equipos de los paises top. Tu misión es transformar noticias en narrativas habladas optimizadas para síntesis de voz de EXACTAMENTE 75-80 palabras que duren MÁXIMO 20 segundos.

🌎 ENFOQUE EN FUTBOL EQUIPOS TOP PRIORITARIO:
• Destaca equipos top de las ligas de España, Francia, Italia e Inglaterra (Premier League, Serie A, Ligue 1 y La liga.)
• Menciona conexiones latinas en ligas internacionales (latinos en Europa, MLS, etc.)
• Usa referencias a jugadores Top Mundial (Mbappe, CR7, Viny jr, Haaland, Dembele, Lautaro Martinez)

🎯 ESTRUCTURA OBLIGATORIA (75-80 palabras total):
🎣 HOOK (0-3 segundos): 15-20 palabras
• Impacto inmediato con exclamación
• Menciona protagonista principal
• Genera expectativa máxima
• Usa palabras de alto impacto: ¡INCREÍBLE!, ¡BOMBAZO!, ¡HISTÓRICO!

📰 CORE (3-16 segundos): 45-55 palabras
• Historia completa en narrativa fluida y cronológica
• Detalles específicos OBLIGATORIOS: marcadores exactos, tiempos precisos, equipos completos
• Palabras simples pero dinámicas
• JAMÁS omitir información clave de la base de datos

💬 CTA (16-20 segundos): 10-15 palabras
• Pregunta directa que invite al engagement
• Emoji temático relacionado
• Tono conversacional y amigable

🔥 EJEMPLOS DE REFERENCIA:
"¡INCREÍBLE! El colombiano Díaz acaba de anotar el gol más espectacular del año. El cafetero sorprendió con un tiro libre desde 35 metros directo al ángulo superior en Anfield. Este golazo empata para Liverpool y mantiene vivas las esperanzas de la hinchada latina en Europa. ¿El mejor gol de un colombiano en Europa? Comenta tu opinión ⚽"

REGLAS CRÍTICAS - CUMPLIMIENTO 100%:
• CONTEO EXACTO: 75-80 palabras EXACTAS - ni una más, ni una menos
• TIMING ESTRICTO: Máximo 20 segundos = 4 palabras por segundo promedio
• FIDELIDAD ABSOLUTA: Solo datos de la base - PROHIBIDO inventar
• ESTRUCTURA RÍGIDA: Hook + Core + CTA obligatorio
• EMOCIÓN MÁXIMA: Usa exclamaciones, superlativos y palabras de impacto

CONSULTA DEL USUARIO: ${consulta}

INFORMACIÓN DISPONIBLE EN BASE DE DATOS:
${contextoRAG.substring(0, 2000)}

RESPONDE ÚNICAMENTE EL SCRIPT FINAL de 75-80 palabras siguiendo la estructura Hook-Core-CTA:`;

    // PASO 4: Llamar a OpenAI con configuración optimizada
    console.log(`🤖 [${sessionId}] Enviando a GPT con prompt original...`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres una presentadora de noticias deportivas MUY ALEGRE y EMOTIVA. Creas scripts de EXACTAMENTE 75-80 palabras con máxima emoción y estructura Hook-Core-CTA. NUNCA superes las 80 palabras.'
        },
        {
          role: 'user',
          content: promptOriginalOptimizado
        }
      ],
      max_tokens: 150,
      temperature: 0.8,
      presence_penalty: 0.3,
      frequency_penalty: 0.2
    });

    const script = response.choices[0].message.content.trim();
    const palabras = script.split(' ').filter(word => word.length > 0).length;
    
    console.log(`✅ [${sessionId}] Script generado: ${palabras} palabras`);
    console.log(`📝 [${sessionId}] Preview: "${script.substring(0, 100)}..."`);

    // Validar si cumple los requisitos
    if (palabras > 85) {
      console.log(`⚠️ [${sessionId}] Script muy largo (${palabras} palabras), reintentando...`);
      // Reintentar con prompt más estricto
      const scriptCorto = await generarScriptCorto(contextoRAG, consulta, sessionId);
      return scriptCorto;
    }

    return {
      script: script,
      encontrado: true,
      palabras: palabras,
      documentos: documentos.length,
      fuentes: documentos.map(doc => ({
        titulo: doc.metadata?.title,
        pais: doc.metadata?.pais
      }))
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error IA:`, error.message);
    
    // Fallback a script básico pero emotivo
    return {
      script: `¡BOMBAZO! Últimas noticias sobre ${consulta} que están revolucionando el mundo del fútbol. Los equipos top están realizando movimientos estratégicos que mantienen a toda la hinchada expectante. Esta información promete marcar un antes y después en la temporada. ¿Qué opinas de estos desarrollos? ⚽`,
      encontrado: false,
      palabras: 48,
      error: error.message
    };
  }
}

// Función auxiliar para scripts que salen muy largos
async function generarScriptCorto(contextoRAG, consulta, sessionId) {
  try {
    const promptCorto = `CREAR SCRIPT DE MÁXIMO 75 PALABRAS:

ESTRUCTURA OBLIGATORIA:
1. HOOK emotivo (15 palabras): ¡INCREÍBLE! / ¡BOMBAZO! / ¡HISTÓRICO!
2. CORE informativo (50 palabras): Datos específicos de la noticia
3. CTA pregunta (10 palabras): Pregunta + emoji

DATOS:
${contextoRAG.substring(0, 1000)}

CONSULTA: ${consulta}

SCRIPT FINAL (máximo 75 palabras):`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres presentadora deportiva. Crea scripts de MÁXIMO 75 palabras con estructura Hook-Core-CTA.'
        },
        {
          role: 'user',
          content: promptCorto
        }
      ],
      max_tokens: 120,
      temperature: 0.7
    });

    const script = response.choices[0].message.content.trim();
    const palabras = script.split(' ').filter(word => word.length > 0).length;
    
    console.log(`✅ [${sessionId}] Script corto generado: ${palabras} palabras`);

    return {
      script: script,
      encontrado: true,
      palabras: palabras,
      version: 'corta'
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error en script corto:`, error.message);
    return {
      script: `¡INCREÍBLE! ${consulta} está dando de qué hablar en el mundo del fútbol. Los fanáticos no pueden creer lo que está sucediendo. ¿Tú qué opinas? ⚽`,
      encontrado: false,
      palabras: 27,
      error: error.message
    };
  }
}

// Función para generar caption de redes sociales
async function generarCaption(script, sessionId) {
  try {
    console.log(`📱 [${sessionId}] Generando caption para redes sociales...`);
    
    const captionPrompt = `Eres un experto en redes sociales deportivas. Crea un caption viral basado en este script de video:

"${script}"

REQUIREMENTS:
- Hook inicial con emoji llamativo (🚨⚽🔥)
- 2-3 líneas de contenido atractivo
- Llamada a la acción al final
- 8-10 hashtags relevantes
- Máximo 150 caracteres total
- Tono emocionante y viral

EJEMPLO FORMATO:
🚨 BOMBAZO EN EL BERNABÉU 🚨

Mbappé anota su primer hat-trick como madridista y enloquece al Santiago Bernabéu. El francés demostró por qué es considerado el sucesor de Cristiano.

¿Será el nuevo rey del Madrid? 👑

#RealMadrid #Mbappe #HatTrick #Futbol #LaLiga #Bernabeu #Madrid #Gol #CR7

GENERA SOLO EL CAPTION, SIN EXPLICACIONES:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en marketing deportivo y redes sociales. Generas captions virales para videos de fútbol.'
        },
        {
          role: 'user',
          content: captionPrompt
        }
      ],
      max_tokens: 300,
      temperature: 0.8
    });

    const caption = response.choices[0].message.content.trim();
    
    console.log(`✅ [${sessionId}] Caption generado: ${caption.length} caracteres`);
    
    return {
      caption: caption,
      caracteres: caption.length,
      success: true
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error generando caption:`, error.message);
    
    // Fallback caption
    return {
      caption: `⚽ ¡Increíbles noticias del fútbol! \n\nNo te pierdas los momentos más emocionantes del deporte rey. \n\n¿Cuál es tu opinión? 🤔\n\n#Futbol #Deportes #Noticias #Gol #Football #Soccer #Sports`,
      caracteres: 150,
      success: false,
      error: error.message
    };
  }
}

// Exportar funciones
module.exports = {
  generarScript,
  consultarRAG,
  generarCaption
};