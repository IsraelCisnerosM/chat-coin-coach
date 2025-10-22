import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HICAP_API_KEY = Deno.env.get('HICAP_API_KEY');
const HICAP_BASE_URL = 'https://api.hicap.ai/v2/openai';
const MODELO_CHAT = 'gemini-2.5-flash';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Base de conocimiento para educación
const BASE_CONOCIMIENTO = {
  criptomonedas: {
    bitcoin: "Bitcoin (BTC) es la primera criptomoneda descentralizada creada en 2009. Funciona sobre tecnología blockchain.",
    ethereum: "Ethereum (ETH) es una plataforma blockchain que permite contratos inteligentes y aplicaciones descentralizadas.",
    stablecoins: "Las stablecoins son criptomonedas cuyo valor está anclado a activos estables como el dólar estadounidense."
  },
  conceptos: {
    blockchain: "Blockchain es una tecnología de registro distribuido que permite transacciones seguras sin intermediarios.",
    wallet: "Una wallet o billetera digital es un software que permite almacenar, enviar y recibir criptomonedas."
  }
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

async function clasificarIntencion(userInput: string): Promise<string> {
  const prompt = [
    {
      role: 'system',
      content: `Clasifica la consulta del usuario en UNA de estas categorías:

A. INVERSIONES → análisis de portafolio, preguntas sobre inversiones, rendimiento, recomendaciones de activos
B. TRANSACCIONES → transferencias, pagos, consultas de saldo, historial de movimientos
C. EDUCACION → conceptos financieros, aprender sobre criptomonedas, preguntas teóricas, consejos generales

Responde SOLO con UNA PALABRA: INVERSIONES, TRANSACCIONES o EDUCACION.`
    },
    { role: 'user', content: userInput }
  ];

  const respuesta = await chatConIA(prompt);
  let categoria = respuesta.trim().toUpperCase();

  if (categoria.includes('INVERSIONES') || categoria.includes('INVERSION')) return 'INVERSIONES';
  if (categoria.includes('TRANSACCIONES') || categoria.includes('TRANSACCION')) return 'TRANSACCIONES';
  if (categoria.includes('EDUCACION')) return 'EDUCACION';
  
  return 'EDUCACION';
}

async function obtenerPrecioActual(activo_id: string = "bitcoin", vs_currency: string = "usd") {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${activo_id}&vs_currencies=${vs_currency}&include_24hr_change=true`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data[activo_id] || null;
  } catch (error) {
    console.error(`Error obteniendo precio de ${activo_id}:`, error);
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
          response: '¡Hola! Soy Bloky, tu asistente financiero inteligente. Puedo ayudarte con:\n\n💼 Análisis de inversiones y portafolio\n💸 Transacciones y pagos\n📚 Educación financiera\n\n¿En qué puedo ayudarte hoy?',
          botType: 'home'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log('🏠 Procesando consulta en home-chat:', message);

    // Clasificar intención
    const tipoIntencion = await clasificarIntencion(message);
    console.log('🎯 Intención detectada:', tipoIntencion);

    let systemPrompt = '';
    let contexto_adicional = '';

    // Configurar prompt según tipo de intención
    if (tipoIntencion === 'INVERSIONES') {
      const btc = await obtenerPrecioActual("bitcoin", "usd");
      const eth = await obtenerPrecioActual("ethereum", "usd");
      
      contexto_adicional = "Contexto de mercado actual:\n";
      if (btc) {
        contexto_adicional += `- Bitcoin: $${btc.usd?.toFixed(2) || 'N/A'}, cambio 24h: ${btc.usd_24h_change?.toFixed(2) || 'N/A'}%\n`;
      }
      if (eth) {
        contexto_adicional += `- Ethereum: $${eth.usd?.toFixed(2) || 'N/A'}, cambio 24h: ${eth.usd_24h_change?.toFixed(2) || 'N/A'}%\n`;
      }

      systemPrompt = `Eres un asesor financiero especializado en inversiones en criptomonedas. Ayuda al usuario con análisis de portafolio, recomendaciones de inversión y estrategias de trading.

${contexto_adicional}

Responde de manera profesional pero accesible, sin tecnicismos innecesarios.`;

    } else if (tipoIntencion === 'TRANSACCIONES') {
      // Buscar contactos si menciona transferencia
      if (message.toLowerCase().includes('enviar') || message.toLowerCase().includes('transferir')) {
        const palabras = message.toLowerCase().split(" ");
        const indiceA = palabras.indexOf("a");
        if (indiceA !== -1 && indiceA < palabras.length - 1) {
          const posibleNombre = palabras.slice(indiceA + 1).join(" ");
          const { data: contactos } = await supabase
            .from("contacts")
            .select("*")
            .or(`name.ilike.%${posibleNombre}%,phone.ilike.%${posibleNombre}%`)
            .limit(5);

          if (contactos && contactos.length > 0) {
            contexto_adicional = `\nContactos encontrados: ${JSON.stringify(contactos, null, 2)}`;
          }
        }
      }

      systemPrompt = `Eres un asistente experto en transacciones de criptomonedas. Ayudas a enviar dinero, registrar contactos y pagar servicios.

${contexto_adicional}

Cuando detectes una intención de transferencia, pregunta por los detalles necesarios (destinatario, monto, criptomoneda).
Siempre usa lenguaje claro y sin tecnicismos.`;

    } else { // EDUCACION
      systemPrompt = `Eres un tutor financiero amigable especializado en educación sobre criptomonedas y finanzas. Tu objetivo es enseñar conceptos de manera clara y accesible.

Base de conocimiento disponible:
${JSON.stringify(BASE_CONOCIMIENTO, null, 2)}

Cuando el usuario pregunte sobre conceptos, explícalos de forma simple con ejemplos prácticos. Si preguntan por precios actuales, búscalos en tiempo real.`;
    }

    // Construir mensajes para la IA
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    // Obtener respuesta
    const assistant_response = await chatConIA(messages);

    return new Response(
      JSON.stringify({ 
        response: assistant_response,
        botType: tipoIntencion.toLowerCase()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error en home-chat:', error);
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
