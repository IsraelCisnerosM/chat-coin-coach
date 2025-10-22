import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HICAP_API_KEY = Deno.env.get('HICAP_API_KEY');
const HICAP_BASE_URL = 'https://api.hicap.ai/v2/openai';
const MODELO_CHAT = 'gemini-2.5-flash';

// Base de conocimiento RAG embebida
const BASE_CONOCIMIENTO = {
  conceptos_basicos: {
    presupuesto: "Un presupuesto es un plan que te ayuda a administrar tu dinero. Te muestra cuánto ganas y cuánto gastas.",
    ahorro: "Ahorrar es guardar una parte de tu dinero para el futuro. Te ayuda a prepararte para emergencias y alcanzar tus metas.",
    inversion: "Invertir es poner tu dinero a trabajar para generar más dinero en el futuro.",
    deuda: "Una deuda es dinero que debes a alguien. Es importante pagarla a tiempo para evitar intereses altos.",
  },
  criptomonedas: {
    ethereum: "Ethereum (ETH) es una plataforma blockchain que permite crear contratos inteligentes y aplicaciones descentralizadas.",
    bitcoin: "Bitcoin (BTC) es la primera criptomoneda. Se usa principalmente como reserva de valor.",
    wallet: "Una wallet o billetera digital es donde guardas tus criptomonedas de forma segura.",
    gas: "El gas es la tarifa que pagas por realizar transacciones en la red Ethereum.",
  },
  consejos: [
    "Ahorra al menos el 10% de tus ingresos cada mes",
    "Evita deudas con intereses altos",
    "Diversifica tus inversiones",
    "Mantén un fondo de emergencia",
    "Revisa tus gastos regularmente"
  ]
};

async function chatConIA(messages: any[]) {
  try {
    const response = await fetch(`${HICAP_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'api-key': HICAP_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELO_CHAT,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de API:', response.status, errorText);
      return `[ERROR] Error al llamar a la API: ${response.status}`;
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }
    return 'No se recibió respuesta del modelo.';
  } catch (error) {
    console.error('Error en chatConIA:', error);
    return `[ERROR] ${error instanceof Error ? error.message : 'Error desconocido'}`;
  }
}

const EDUCATION_SYSTEM_PROMPT = `Eres Bloky Health, un asesor financiero amigable, empático y educativo. Tu especialidad son las finanzas personales y la gestión de activos digitales como Ethereum (ETH).

BASE DE CONOCIMIENTO:
${JSON.stringify(BASE_CONOCIMIENTO, null, 2)}

REGLAS:
1. Usa la base de conocimiento para responder preguntas sobre conceptos financieros y criptomonedas
2. Sé amigable, claro y educativo
3. Simplifica conceptos complejos
4. Celebra los logros del usuario
5. Nunca juzgues decisiones pasadas

CAPACIDADES:
- Explicar conceptos financieros básicos
- Enseñar sobre criptomonedas
- Dar consejos de ahorro e inversión
- Analizar situaciones financieras

Responde siempre en español de manera amigable y accesible.`;

async function clasificarIntencion(userInput: string): Promise<string> {
  const prompt = [
    {
      role: 'system',
      content: `Clasifica la consulta en UNA categoría:
A. EDUCACION → conceptos, definiciones, aprender
B. ANALISIS → análisis de gastos/finanzas personales
C. META → objetivos de ahorro
D. MERCADO → precios de criptos
E. TRANSACCION → compra/venta/transferencia

Responde SOLO con UNA PALABRA: EDUCACION, ANALISIS, META, MERCADO o TRANSACCION.`
    },
    { role: 'user', content: userInput }
  ];

  const respuesta = await chatConIA(prompt);
  let categoria = respuesta.trim().toUpperCase();

  if (categoria.includes('EDUCACION')) return 'EDUCACION';
  if (categoria.includes('ANALISIS')) return 'ANALISIS_PERSONAL';
  if (categoria.includes('META')) return 'META';
  if (categoria.includes('MERCADO')) return 'MERCADO';
  if (categoria.includes('TRANSACCION')) return 'TRANSACCION';
  
  return 'EDUCACION';
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
    const tipoIntencion = await clasificarIntencion(message);
    console.log('🎯 Intención detectada:', tipoIntencion);

    // Construir mensajes base
    const messages = [
      { 
        role: 'system', 
        content: EDUCATION_SYSTEM_PROMPT
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
    if (history && history.length > 0) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }

    // Agregar mensaje actual
    messages.push({ role: 'user', content: message });

    console.log('🤖 Llamando a HICAP API...');

    // Obtener respuesta
    const assistantMessage = await chatConIA(messages);

    if (assistantMessage.startsWith('[ERROR]')) {
      throw new Error(assistantMessage);
    }

    console.log('✅ Respuesta educativa generada');

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
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
