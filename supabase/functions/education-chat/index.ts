import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HICAP_API_KEY = Deno.env.get('HICAP_API_KEY');
const HICAP_BASE_URL = Deno.env.get('HICAP_BASE_URL') || 'https://api.hicap.ai/v1';

// ============ CARGA DE BASE DE CONOCIMIENTO RAG ============

let baseConocimientoRAG: any = null;
let contextoRAG = "";

async function cargarBaseConocimiento() {
  try {
    const [eduRes, transRes] = await Promise.all([
      fetch('https://jkywmvvgpvmqheeevzvn.supabase.co/storage/v1/object/public/bloky-educacion-financiera.json').catch(() => 
        fetch(`${Deno.env.get('SUPABASE_URL')?.replace('/functions/v1', '')}/storage/v1/object/public/bloky-educacion-financiera.json`)
      ),
      fetch('https://jkywmvvgpvmqheeevzvn.supabase.co/storage/v1/object/public/conocimiento-de-transacciones.json').catch(() =>
        fetch(`${Deno.env.get('SUPABASE_URL')?.replace('/functions/v1', '')}/storage/v1/object/public/conocimiento-de-transacciones.json`)
      )
    ]);

    const educacion = await eduRes.json();
    const transacciones = await transRes.json();

    baseConocimientoRAG = {
      bloky_educacion_financiera: educacion,
      conocimiento_de_transacciones: transacciones
    };

    console.log('✅ Base de conocimiento RAG cargada');
    return true;
  } catch (error) {
    console.error('⚠️ Error cargando base de conocimiento:', error);
    return false;
  }
}

function generarContextoRAG() {
  if (!baseConocimientoRAG) {
    return "⚠️ Base de conocimiento no disponible.";
  }

  let contexto = "\n--- BASE DE CONOCIMIENTO RAG ---\n";

  // Educación Financiera
  if (baseConocimientoRAG.bloky_educacion_financiera) {
    const edu = baseConocimientoRAG.bloky_educacion_financiera;
    contexto += `\n## MÓDULOS EDUCATIVOS:\n${JSON.stringify(edu.modulos_educativos || {}, null, 2)}\n`;
    contexto += `\n## CONCEPTOS BÁSICOS:\n${JSON.stringify(edu.conceptos_basicos || {}, null, 2)}\n`;
    contexto += `\n## GLOSARIO:\n${JSON.stringify(edu.glosario || {}, null, 2)}\n`;
    contexto += `\n## PREGUNTAS FRECUENTES:\n${JSON.stringify(edu.preguntas_frecuentes || [], null, 2)}\n`;
    contexto += `\n## CONSEJOS ACTIVOS:\n${JSON.stringify(edu.consejos_activos || [], null, 2)}\n`;
  }

  // Conocimiento de Transacciones
  if (baseConocimientoRAG.conocimiento_de_transacciones) {
    const trans = baseConocimientoRAG.conocimiento_de_transacciones;
    contexto += `\n## CONTEXTO CRIPTO:\n${JSON.stringify(trans.contexto_cripto_especifico || {}, null, 2)}\n`;
    contexto += `\n## PATRONES CONVERSACIONALES:\n${JSON.stringify(trans.patrones_conversacionales || {}, null, 2)}\n`;
    contexto += `\n## PLANTILLAS DE ANÁLISIS:\n${JSON.stringify(trans.plantillas_analisis || {}, null, 2)}\n`;
    contexto += `\n## ALERTAS PROACTIVAS:\n${JSON.stringify(trans.alertas_proactivas || {}, null, 2)}\n`;
    contexto += `\n## SEGURIDAD:\n${JSON.stringify(trans.seguridad_transacciones || {}, null, 2)}\n`;
    contexto += `\n## ESTRATEGIAS:\n${JSON.stringify(trans.estrategias_inversion || {}, null, 2)}\n`;
  }

  contexto += "\n--- FIN BASE DE CONOCIMIENTO RAG ---\n";
  return contexto;
}

const EDUCATION_SYSTEM_PROMPT = `Eres Bloky Health, un asesor financiero amigable, empático y educativo. Tu especialidad son las finanzas personales y la gestión de activos digitales como Ethereum (ETH). Tu misión es ayudar al usuario a analizar sus transacciones, entender sus hábitos de gasto, y aprender conceptos financieros y de criptomonedas de forma sencilla.

--- REGLAS IMPORTANTES ---

1. Eres un agente **RAG (Retrieval-Augmented Generation)**. Debes usar **EXCLUSIVAMENTE** la base de conocimiento RAG proporcionada para responder preguntas teóricas. **NO inventes información financiera**.

2. Cuando el usuario pida un análisis personal (ej. '¿Cómo voy?', '¿En qué gasto más?'), conecta la información teórica del RAG con los datos en tiempo real del usuario.

3. Puedes tomar la iniciativa y enviar mensajes proactivos solo si se cumple una condición de alertas_proactivas del RAG.

4. **IMPORTANTE: Creación de Tareas**. Si el usuario pide crear una acción programada (DCA, transferencia, stake), responde con este JSON al final entre marcadores ###TASK_JSON###:

###TASK_JSON###
{
  "id": "task-[timestamp]",
  "title": "[Descripción]",
  "type": "[buy|sell|transfer|stake]",
  "amount": "[cantidad]",
  "token": "[ETH|BTC|USDT]",
  "recurrence": "[once|daily|weekly|monthly]",
  "network": "[Ethereum|Polygon|etc]",
  "gasEstimate": "[estimación]"
}
###TASK_JSON###

5. **IMPORTANTE: Generación de Insights**. Cuando tu análisis resulte en un consejo concreto de consejos_activos, preséntalo también en JSON entre marcadores ###INSIGHT_JSON###:

###INSIGHT_JSON###
{
  "id": "insight-[timestamp]",
  "type": "[ahorro|meta|deuda|inversion]",
  "title": "[Título del insight]",
  "description": "[Descripción detallada]",
  "data_summary": {
    "categoria": "[categoría]",
    "monto_gastado": "[monto]",
    "ahorro_potencial": "[ahorro]"
  },
  "rag_chunk_id": "[ID del chunk RAG usado]",
  "suggested_action": "[Acción sugerida]"
}
###INSIGHT_JSON###

6. Usa las plantillas_analisis del RAG para formatear análisis complejos.

7. Sigue los patrones_conversacionales del RAG para mantener el tono apropiado.

8. Para preguntas sobre precios de criptomonedas, usa los datos de mercado en tiempo real proporcionados.

Respondes siempre en español. Actúas como tutor experto pero accesible, simplificando conceptos complejos. Nunca juzgas decisiones financieras pasadas y celebras los logros.
`;

function clasificarIntencion(userInput: string): string {
  const input = userInput.toLowerCase();
  
  // EDUCACION
  if (input.includes('qué es') || input.includes('explica') || input.includes('cómo funciona') || 
      input.includes('no entiendo') || input.includes('ayúdame a aprender') || input.includes('definición')) {
    return 'EDUCACION';
  }
  
  // ANALISIS_PERSONAL
  if (input.includes('cómo voy') || input.includes('en qué gasto') || input.includes('analiza mis') || 
      input.includes('mis gastos') || input.includes('mis finanzas') || input.includes('mi situación')) {
    return 'ANALISIS_PERSONAL';
  }
  
  // META
  if (input.includes('meta') || input.includes('objetivo') || input.includes('quiero ahorrar') || 
      input.includes('plan de ahorro')) {
    return 'META';
  }
  
  // MERCADO
  if (input.includes('precio') || input.includes('mercado') || input.includes('cuánto vale') || 
      input.includes('cotiza') || input.includes('tendencia')) {
    return 'MERCADO';
  }
  
  // TRANSACCION
  if (input.includes('comprar') || input.includes('vender') || input.includes('transferir') || 
      input.includes('enviar') || input.includes('stake') || input.includes('dca')) {
    return 'TRANSACCION';
  }
  
  return 'EDUCACION'; // Default
}

async function obtenerPrecioActual(activoId = 'bitcoin', vsCurrency = 'usd') {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${activoId}&vs_currencies=${vsCurrency}&include_24hr_change=true`;
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data[activoId] || null;
  } catch (error) {
    console.error('Error obteniendo precio:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [], isFirstMessage = false } = await req.json();

    if (!HICAP_API_KEY) {
      throw new Error('HICAP_API_KEY no está configurada');
    }

    // Cargar base de conocimiento si no está cargada
    if (!baseConocimientoRAG) {
      await cargarBaseConocimiento();
      contextoRAG = generarContextoRAG();
    }

    // Si es primer mensaje, enviar saludo
    if (isFirstMessage || !message) {
      return new Response(
        JSON.stringify({ 
          response: '¡Hola! Soy Bloky, tu asesor financiero personal. Estoy aquí para ayudarte a entender tus finanzas, aprender sobre criptomonedas y alcanzar tus metas. ¿En qué puedo ayudarte hoy?'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log('📚 Procesando consulta educativa:', message);

    // Clasificar intención
    const tipoIntencion = clasificarIntencion(message);
    console.log('🎯 Intención detectada:', tipoIntencion);

    // Construir mensajes base
    const messages = [
      { 
        role: 'system', 
        content: `${EDUCATION_SYSTEM_PROMPT}\n\n${contextoRAG}` 
      }
    ];

    // Agregar contexto de mercado si es necesario
    if (tipoIntencion === 'MERCADO') {
      const [eth, btc] = await Promise.all([
        obtenerPrecioActual('ethereum', 'usd'),
        obtenerPrecioActual('bitcoin', 'usd')
      ]);

      let mensajeContexto = '\n--- CONTEXTO DE MERCADO EN TIEMPO REAL ---\n';
      if (eth) {
        mensajeContexto += `Ethereum (ETH): $${eth.usd?.toFixed(2) || 'N/A'}, cambio 24h: ${eth.usd_24h_change?.toFixed(2) || 'N/A'}%\n`;
      }
      if (btc) {
        mensajeContexto += `Bitcoin (BTC): $${btc.usd?.toFixed(2) || 'N/A'}, cambio 24h: ${btc.usd_24h_change?.toFixed(2) || 'N/A'}%\n`;
      }
      
      messages.push({ role: 'system', content: mensajeContexto });
    }

    // Agregar historial
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Agregar mensaje actual
    messages.push({ role: 'user', content: message });

    console.log('🤖 Llamando a HICAP API con contexto RAG completo...');

    const response = await fetch(`${HICAP_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HICAP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de HICAP API:', response.status, errorText);
      throw new Error(`Error de API: ${response.status}`);
    }

    const data = await response.json();
    let assistantMessage = data.choices[0].message.content;

    // Detectar TASK_JSON
    let taskJson = null;
    if (assistantMessage.includes('###TASK_JSON###')) {
      try {
        const parts = assistantMessage.split('###TASK_JSON###');
        if (parts.length >= 3) {
          const jsonStr = parts[1].trim();
          taskJson = JSON.parse(jsonStr);
          assistantMessage = parts[0].trim() + (parts[2]?.trim() || '');
          console.log('📋 Task JSON detectado:', taskJson);
        }
      } catch (e) {
        console.error('Error parseando task JSON:', e);
      }
    }

    // Detectar INSIGHT_JSON
    let insightJson = null;
    if (assistantMessage.includes('###INSIGHT_JSON###')) {
      try {
        const parts = assistantMessage.split('###INSIGHT_JSON###');
        if (parts.length >= 3) {
          const jsonStr = parts[1].trim();
          insightJson = JSON.parse(jsonStr);
          assistantMessage = parts[0].trim() + (parts[2]?.trim() || '');
          console.log('💡 Insight JSON detectado:', insightJson);
        }
      } catch (e) {
        console.error('Error parseando insight JSON:', e);
      }
    }

    console.log('✅ Respuesta educativa generada');

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        task: taskJson,
        insight: insightJson,
        intencion: tipoIntencion
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error en education-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        response: 'Disculpa, hubo un error procesando tu consulta. Por favor intenta de nuevo.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
