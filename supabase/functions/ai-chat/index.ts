import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HICAP_API_KEY = Deno.env.get('HICAP_API_KEY');
const HICAP_BASE_URL = "https://api.hicap.ai/v2/openai";
const MODELO_CHAT = "gemini-2.5-pro";

// Datos del usuario y portafolio
const usuario = {
  nombre: "Juan Pérez",
  perfil_riesgo: "Moderado",
  objetivo: "Crecimiento moderado en 12-24 meses",
};

const portafolio = {
  valor_total_usd: 45823.67,
  rentabilidad_24h_pct: 12.34,
  distribucion: {
    bitcoin: 0.35,
    ethereum: 0.30,
    stablecoins: 0.20,
    other: 0.15
  },
  detalle: {
    bitcoin: { cantidad: 0.8, precio_usd: 30000 },
    ethereum: { cantidad: 5, precio_usd: 3200 },
    stablecoins: { cantidad: 9000, precio_usd: 1 },
    other: { cantidad: 2000, precio_usd: 1 }
  }
};

const transacciones_historicas = [
  { fecha: "2025-10-10", activo: "bitcoin", cantidad: 0.5, tipo: "compra", precio_usd: 25000 },
  { fecha: "2025-09-15", activo: "ethereum", cantidad: 5, tipo: "compra", precio_usd: 3000 },
  { fecha: "2025-08-01", activo: "stablecoins", cantidad: 9000, tipo: "compra", precio_usd: 1 },
];

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

async function detectarEventoRelevante() {
  const precio_info = await obtenerPrecioActual("bitcoin", "usd");
  if (precio_info) {
    const cambio24 = precio_info.usd_24h_change;
    if (cambio24 !== undefined && Math.abs(cambio24) >= 10) {
      return `🚨 **ALERTA DE VOLATILIDAD**: Se ha detectado un cambio significativo en Bitcoin en las últimas 24h (${cambio24.toFixed(2)}%). Recomiendo revisar tu portafolio.`;
    }
  }
  return null;
}

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
    return "No se recibió respuesta del modelo.";
  } catch (error) {
    console.error('Error en chatConIA:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return `[ERROR] Ocurrió un error al llamar a la API: ${errorMessage}`;
  }
}

async function clasificarIntencion(user_input: string) {
  const prompt_clasificador = [
    {
      role: "system",
      content: `Eres un sistema de clasificación de intenciones. Recibirás una consulta de un usuario sobre finanzas e inversiones. 
Debes clasificar la consulta en UNA de las siguientes categorías:
A. PORTAFOLIO → si la consulta trata sobre la distribución, rentabilidad o estado actual de sus inversiones.
B. TRANSACCIONES → si está buscando consejos, quiere saber qué hacer, desea una sugerencia o análisis basado en su comportamiento pasado o futuro (compras/ventas).
C. MERCADO → si está preguntando por el estado actual de criptomonedas como Bitcoin, Ethereum u otras, precios o eventos del mercado.

Responde **SOLO** con UNA PALABRA en mayúsculas: PORTAFOLIO, TRANSACCIONES o MERCADO.`
    },
    {
      role: "user",
      content: user_input
    }
  ];

  const respuesta = await chatConIA(prompt_clasificador);
  let categoria = respuesta.trim().toUpperCase();
  
  if (categoria.startsWith("PORTAFOLIO")) {
    categoria = "PORTAFOLIO";
  } else if (categoria.startsWith("TRANSACCIONES")) {
    categoria = "TRANSACCIONES";
  } else if (categoria.startsWith("MERCADO")) {
    categoria = "MERCADO";
  } else {
    categoria = "TRANSACCIONES";
  }

  console.log('[Debug] Intención detectada:', categoria);
  return categoria;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages: clientMessages, isFirstMessage } = await req.json();

    // Contexto fijo del usuario
    const contexto_fijo = `--- CONTEXTO FIJO DEL USUARIO ---
Perfil del usuario:
- Nombre: ${usuario.nombre}
- Perfil de riesgo: ${usuario.perfil_riesgo} (Recuerda: Moderado = balance entre crecimiento y seguridad)
- Objetivo: ${usuario.objetivo}

Portafolio Actual:
- Valor total: $${portafolio.valor_total_usd.toFixed(2)}
- Rentabilidad 24h: ${portafolio.rentabilidad_24h_pct}%
- Distribución: ${JSON.stringify(portafolio.distribucion, null, 2)}
- Detalle de la composición (cantidades y precios): ${JSON.stringify(portafolio.detalle, null, 2)}

Histórico de Transacciones (Recientes):
${JSON.stringify(transacciones_historicas.slice(-3), null, 2)}
--- FIN CONTEXTO FIJO ---`;

    // Construir mensajes iniciales
    let messages = [
      {
        role: "system",
        content: contexto_fijo + `

Eres un asesor financiero basado en inteligencia artificial especializado en inversiones Web3. Tu misión es ayudar al usuario a analizar su portafolio, ofrecer recomendaciones de inversión personalizadas, crear y gestionar tareas programadas (como compras recurrentes), y simplificar la experiencia financiera en blockchain. Respondes siempre en español. Actúas como asistente experto pero accesible, simplificando conceptos complejos y eliminando tecnicismos innecesarios. Te comportas como un asesor profesional con enfoque amigable, directo y centrado en resultados.

--- CONTEXTO DE FUNCIONALIDAD ---

1. Tu principal objetivo es **maximizar la rentabilidad del portafolio del usuario**, considerando todos los datos de su Perfil y Portafolio Actual que tienes arriba.
2. **NO debes hacer recomendaciones sin que el usuario lo solicite**, a menos que haya una alerta crítica que amerite una sugerencia (ej: alta volatilidad o riesgo inminente).
3. Eres capaz de generar y simular acciones futuras en forma de **tareas programadas**, que deben ser objetos JSON.
4. Si el usuario desea crear tareas programadas, debes guiarlo y confirmar antes de sugerir el formato JSON con los campos: tipo, activo, cantidad, frecuencia, confirmada: false, notas.
5. Usa un tono profesional, claro y útil. Mantén siempre una actitud colaborativa.

Comienza saludando al usuario si es la primera interacción, y espera sus instrucciones. Siempre estás listo para ayudar.`
      }
    ];

    // Si es el primer mensaje o no hay mensajes, devolver solo el saludo
    if (isFirstMessage && (!clientMessages || clientMessages.length === 0)) {
      const evento = await detectarEventoRelevante();
      let greeting = `¡Hola ${usuario.nombre}! Soy tu asistente de inversión. ¿Cómo puedo ayudarte hoy?`;
      
      if (evento) {
        greeting += `\n\n${evento}`;
      }

      return new Response(
        JSON.stringify({ 
          response: greeting,
          tipo_intencion: null 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Procesar el último mensaje del usuario
    if (!clientMessages || clientMessages.length === 0) {
      throw new Error('No se proporcionaron mensajes');
    }

    const lastUserMessage = clientMessages[clientMessages.length - 1];
    if (lastUserMessage.role === 'user') {
      const user_input = lastUserMessage.content;
      
      // Clasificar intención
      const tipo_intencion = await clasificarIntencion(user_input);
      console.log('[Debug] Tipo de intención:', tipo_intencion);

      // Agregar contexto dinámico según tipo
      let mensaje_contexto = "";
      
      if (tipo_intencion === "MERCADO") {
        const btc = await obtenerPrecioActual("bitcoin", "usd");
        const eth = await obtenerPrecioActual("ethereum", "usd");
        mensaje_contexto = "Contexto de mercado actual (información en tiempo real):\n";
        if (btc) {
          mensaje_contexto += `- Bitcoin: $${btc.usd?.toFixed(2) || 'N/A'}, cambio 24h: ${btc.usd_24h_change?.toFixed(2) || 'N/A'}%\n`;
        }
        if (eth) {
          mensaje_contexto += `- Ethereum: $${eth.usd?.toFixed(2) || 'N/A'}, cambio 24h: ${eth.usd_24h_change?.toFixed(2) || 'N/A'}%\n`;
        }
      }

      if (mensaje_contexto) {
        messages.push({ role: "system", content: mensaje_contexto });
      }

      // Agregar todo el historial de mensajes del cliente
      messages.push(...clientMessages);

      // Obtener respuesta de IA
      const assistant_response = await chatConIA(messages);

      return new Response(
        JSON.stringify({ 
          response: assistant_response,
          tipo_intencion 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('No se encontró un mensaje de usuario válido');

  } catch (error) {
    console.error('Error en ai-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
