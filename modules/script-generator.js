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

    for (const palabra of palabrasClave.slice(0, 3)) {
      const { data, error } = await supabase
        .from('documents')
        .select('content, metadata')
        .or(`content.ilike.%${palabra}%,metadata->>title.ilike.%${palabra}%`)
        .limit(5);

      if (!error && data && data.length > 0) {
        documentosEncontrados.push(...data);
        console.log(`📄 [RAG] Encontrados ${data.length} docs para "${palabra}"`);
      }
    }

    // Eliminar duplicados
    const documentosUnicos = documentosEncontrados.filter((doc, index, self) => 
      index === self.findIndex(d => d.content === doc.content)
    ).slice(0, 5);

    console.log(`✅ [RAG] Total: ${documentosUnicos.length} documentos únicos encontrados`);

    if (documentosUnicos.length > 0) {
      const mejorDoc = documentosUnicos[0];
      console.log(`🏆 [RAG] Mejor match: "${mejorDoc.metadata?.title}" (${mejorDoc.metadata?.pais})`);
    }

    return documentosUnicos;

  } catch (error) {
    console.error('❌ [RAG] Error:', error.message);
    return [];
  }
}

// Función para generar script con IA REAL + RAG
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

    // PASO 3: Prompt optimizado (más corto para ahorrar tokens)
    const promptOptimizado = `Eres presentadora deportiva. Crea script de 50-55 palabras EXACTAS para síntesis de voz.

ESTRUCTURA OBLIGATORIA (75-80 palabras total):
🎣 HOOK (0-3 segundos): 15-20 palabras
Impacto inmediato con exclamación
✓ Menciona protagonista principal
✓ Genera expectativa máxima
✓ Usa palabras de alto impacto: ¡INCREÍBLE!, ¡BOMBAZO!, ¡HISTÓRICO!
📰 CORE (3-16 segundos): 45-55 palabras
✓ Historia completa en narrativa fluida y cronológica
✓ Detalles específicos OBLIGATORIOS: marcadores exactos, tiempos precisos, equipos completos
✓ Palabras simples pero dinámicas
✓ JAMÁS omitir información clave de la base de datos
💬 CTA (16-20 segundos): 10-15 palabras
✓ Pregunta directa que invite al engagement
✓ Emoji temático relacionado
✓ Tono conversacional y amigable
🔥 EJEMPLOS MEJORADOS:
EJEMPLO 1 - Gol Espectacular (Enfoque Latino):
"¡INCREÍBLE! El colombiano Díaz acaba de anotar el gol más espectacular del año"
"El cafetero sorprendió con un tiro libre desde 35 metros directo al ángulo superior en Anfield. Este golazo empata para Liverpool y mantiene vivas las esperanzas de la hinchada latina en Europa."
"¿El mejor gol de un colombiano en Europa? Comenta tu opinión"

EJEMPLO 2 - Fichaje Latino:
"¡BOMBAZO! El crack argentino Álvarez ficha por el Manchester City"
"El delantero de River firmó por cinco años tras pagar 20 millones. El pibe se une a su compatriota Messi como referente albiceleste en Europa. Guardiola confirmó que será titular desde enero."
"¿Será el próximo crack argentino en triunfar? Danos tu predicción"

REGLAS CRÍTICAS - CUMPLIMIENTO 100%:

VERIFICACIÓN OBLIGATORIA: Antes de responder, SIEMPRE consultar "basededatos" - CERO excepciones
CONTEO EXACTO: Contar palabras manualmente - objetivo 75-80 palabras máximo
TIMING ESTRICTO: Máximo 20 segundos = 4 palabras por segundo promedio
FIDELIDAD ABSOLUTA: Solo datos de la base - PROHIBIDO inventar o asumir
ESTRUCTURA RÍGIDA: Hook + Core + CTA - sin variaciones
COMPLETITUD: Incluir TODOS los detalles importantes de la noticia original

CONSULTA: ${consulta}

DATOS DISPONIBLES:
${contextoRAG.substring(0, 1500)}

RESPONDE SOLO EL SCRIPT:`;

    // PASO 4: Llamar a OpenAI
    console.log(`🤖 [${sessionId}] Enviando a GPT-4...`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres presentadora de noticias deportivas. Genera scripts de 75-80 palabras exactas.'
        },
        {
          role: 'user',
          content: promptOptimizado
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    const script = response.choices[0].message.content.trim();
    const palabras = script.split(' ').length;
    
    console.log(`✅ [${sessionId}] Script generado: ${palabras} palabras`);
    console.log(`📝 [${sessionId}] Preview: "${script.substring(0, 100)}..."`);

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
    
    // Fallback a script básico
    return {
      script: `¡INCREÍBLE! Últimas noticias sobre ${consulta}. Los equipos están realizando movimientos estratégicos que mantienen a toda la hinchada expectante. Esta información promete marcar un antes y después en la temporada actual. ¿Qué opinas de estos desarrollos? ⚽`,
      encontrado: false,
      palabras: 48,
      error: error.message
    };
  }
}

// Exportar funciones
module.exports = {
  generarScript,
  consultarRAG
};