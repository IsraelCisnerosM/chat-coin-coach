import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HICAP_API_KEY = Deno.env.get("HICAP_API_KEY");
const HICAP_BASE_URL = "https://api.hicap.ai/v2/openai";
const MODELO_CHAT = "gemini-2.5-flash";

// Inicializar cliente de Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para obtener precios actuales de criptomonedas
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

// Función para convertir entre criptomonedas y fiat
async function convertirMoneda(cantidad: number, de: string, a: string = "mxn") {
  const cripto_ids: { [key: string]: string } = {
    btc: "bitcoin",
    bitcoin: "bitcoin",
    eth: "ethereum",
    ethereum: "ethereum",
    usdt: "tether",
    tether: "tether",
    usdc: "usd-coin",
    sol: "solana",
    solana: "solana",
    matic: "matic-network",
    polygon: "matic-network",
  };

  const de_id = cripto_ids[de.toLowerCase()] || de.toLowerCase();
  const precio = await obtenerPrecioActual(de_id, a.toLowerCase());

  if (precio && precio[a.toLowerCase()]) {
    return cantidad * precio[a.toLowerCase()];
  }
  return null;
}

async function chatConIA(messages: any[]) {
  try {
    const response = await fetch(`${HICAP_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "api-key": HICAP_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO_CHAT,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error de API:", response.status, errorText);
      return `[ERROR] Error al llamar a la API: ${response.status}`;
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }
    return "No se recibió respuesta del modelo.";
  } catch (error) {
    console.error("Error en chatConIA:", error);
    return `[ERROR] ${error instanceof Error ? error.message : "Error desconocido"}`;
  }
}

async function detectarIntencion(user_input: string) {
  const prompt = [
    {
      role: "system",
      content: `Eres un sistema de clasificación de intenciones para un asistente de transacciones de criptomonedas.
Clasifica la consulta en UNA de estas categorías:
A. TRANSFERENCIA → si quiere enviar dinero/criptos a alguien
B. REGISTRO_CONTACTO → si quiere guardar un contacto nuevo con su numero telefono solamente, NO PIDAS WALLET.
C. PAGO_SERVICIO → si quiere pagar un servicio (luz, agua, internet, etc)
D. MERCADO → si pregunta por precios actuales, conversiones de moneda o valores de mercado
E. CONSULTA → para cualquier otra pregunta o solicitud de información

Responde SOLO con UNA PALABRA en mayúsculas: TRANSFERENCIA, REGISTRO_CONTACTO, PAGO_SERVICIO, MERCADO o CONSULTA.`,
    },
    { role: "user", content: user_input },
  ];

  const respuesta = await chatConIA(prompt);
  let categoria = respuesta.trim().toUpperCase();

  if (categoria.includes("TRANSFERENCIA")) return "TRANSFERENCIA";
  if (categoria.includes("REGISTRO")) return "REGISTRO_CONTACTO";
  if (categoria.includes("PAGO")) return "PAGO_SERVICIO";
  if (categoria.includes("MERCADO")) return "MERCADO";
  return "CONSULTA";
}

async function buscarContacto(query: string) {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(5);

  if (error) {
    console.error("Error buscando contactos:", error);
    return [];
  }
  return data || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages: clientMessages, isFirstMessage } = await req.json();

    const systemPrompt = `Eres un asistente experto en transferencias de criptomonedas. Tu misión es hacer que las transacciones sean simples, seguras y sin fricción para el usuario.

PRINCIPIOS CLAVE:
1. **Simplicidad**: Usa lenguaje claro, NO USES tecnicismos.
2. **Seguridad**: Siempre verifica datos antes de ejecutar transacciones
4. **Conversiones automáticas**: Ayuda a convertir entre monedas fiat y criptos
5. **Contexto del mercado**: Usa datos en tiempo real para dar recomendaciones precisas

CAPACIDADES:
- Realizar transferencias de criptomonedas, sin informacion adicional.
- Registrar y gestionar contactos UNICAMNETE COIN NUMERO DE TELEFONO O CELULAR, no uses el Wallet.
- Pagar servicios con cripto
- Consultar precios actuales y hacer conversiones
- Se breve

CONVERSIONES:
- Siempre ofrece convertir pesos mexicanos (MXN) a la cripto equivalente
- Usa los precios de mercado actuales

IMPORTANTE: Cuando detectes una intención clara de acción, genera un JSON al final entre marcadores ###ACTION_JSON###

Para TRANSFERENCIAS:
###ACTION_JSON###
{
  "id": "action-[número único]",
  "type": "transfer",
  "data": {
    "amount": "[cantidad]",
    "token": "[símbolo]",
    "recipient_name": "[nombre]",
    "recipient_email": "[email]",
    "description": "[descripción]"
  }
}
###ACTION_JSON###

Para REGISTRO CONTACTO:
###ACTION_JSON###
{
  "id": "action-[número único]",
  "type": "contact_register",
  "data": {
    "name": "[nombre]",
    "email": "[email]",
    "phone": "[teléfono]",
  }
}
###ACTION_JSON###

Para PAGO SERVICIO:
###ACTION_JSON###
{
  "id": "action-[número único]",
  "type": "service_payment",
  "data": {
    "service_name": "[servicio]",
    "amount": "[monto]",
    "token": "[cripto]",
    "description": "[descripción]"
  }
}
###ACTION_JSON###

Responde siempre en español de manera amigable y profesional.`;

    if (isFirstMessage && (!clientMessages || clientMessages.length === 0)) {
      return new Response(
        JSON.stringify({
          response:
            "¡Hola! Soy tu asistente de transacciones. Puedo ayudarte a enviar dinero, registrar contactos y pagar servicios. ¿Qué necesitas hacer hoy?",
          intencion: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!clientMessages || clientMessages.length === 0) {
      throw new Error("No se proporcionaron mensajes");
    }

    const lastUserMessage = clientMessages[clientMessages.length - 1];
    if (lastUserMessage.role === "user") {
      const user_input = lastUserMessage.content;

      // Detectar intención
      const intencion = await detectarIntencion(user_input);
      console.log("[Debug] Intención detectada:", intencion);

      let contexto_adicional = "";

      // Si es transferencia, buscar contactos
      if (intencion === "TRANSFERENCIA") {
        const palabras = user_input.toLowerCase().split(" ");
        const indiceA = palabras.indexOf("a");
        if (indiceA !== -1 && indiceA < palabras.length - 1) {
          const posibleNombre = palabras.slice(indiceA + 1).join(" ");
          const contactos = await buscarContacto(posibleNombre);

          if (contactos.length > 0) {
            contexto_adicional = `\nContactos encontrados: ${JSON.stringify(contactos, null, 2)}`;
          } else {
            contexto_adicional =
              "\nNo se encontraron contactos con ese nombre. Pregunta si desea registrar un nuevo contacto.";
          }
        }
      } else if (intencion === "PAGO_SERVICIO") {
        // Buscar servicios guardados
        const { data: servicios } = await supabase.from("saved_services").select("*");

        if (servicios && servicios.length > 0) {
          contexto_adicional = `\n\nServicios guardados:\n${JSON.stringify(servicios, null, 2)}`;
        }
      } else if (intencion === "MERCADO") {
        // Obtener precios actuales
        const btc = await obtenerPrecioActual("bitcoin", "usd");
        const eth = await obtenerPrecioActual("ethereum", "usd");
        const usdt = await obtenerPrecioActual("tether", "usd");
        const mxn_btc = await obtenerPrecioActual("bitcoin", "mxn");
        const mxn_eth = await obtenerPrecioActual("ethereum", "mxn");

        contexto_adicional = "\n\nPrecios de mercado actuales:\n";
        if (btc) {
          contexto_adicional += `- Bitcoin (BTC): $${btc.usd?.toFixed(2)} USD`;
          if (mxn_btc?.mxn) {
            contexto_adicional += ` | $${mxn_btc.mxn.toFixed(2)} MXN`;
          }
          contexto_adicional += ` | Cambio 24h: ${btc.usd_24h_change?.toFixed(2)}%\n`;
        }
        if (eth) {
          contexto_adicional += `- Ethereum (ETH): $${eth.usd?.toFixed(2)} USD`;
          if (mxn_eth?.mxn) {
            contexto_adicional += ` | $${mxn_eth.mxn.toFixed(2)} MXN`;
          }
          contexto_adicional += ` | Cambio 24h: ${eth.usd_24h_change?.toFixed(2)}%\n`;
        }
        if (usdt) {
          contexto_adicional += `- Tether (USDT): $${usdt.usd?.toFixed(4)} USD (stablecoin)\n`;
        }
        contexto_adicional += "\nTasas de cambio aprox: 1 USD = 20 MXN";
      }

      // Construir mensajes
      const messages = [{ role: "system", content: systemPrompt + contexto_adicional }, ...clientMessages];

      // Obtener respuesta
      let assistant_response = await chatConIA(messages);

      // Detectar acción
      let actionJson = null;
      if (assistant_response.includes("###ACTION_JSON###")) {
        try {
          const parts = assistant_response.split("###ACTION_JSON###");
          if (parts.length >= 3) {
            const jsonStr = parts[1].trim();
            actionJson = JSON.parse(jsonStr);
            assistant_response = parts[0].trim() + (parts[2]?.trim() || "");
          }
        } catch (error) {
          console.error("Error parseando action JSON:", error);
        }
      }

      return new Response(
        JSON.stringify({
          response: assistant_response,
          intencion,
          action: actionJson,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    throw new Error("No se encontró un mensaje de usuario válido");
  } catch (error) {
    console.error("Error en transaction-chat:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
