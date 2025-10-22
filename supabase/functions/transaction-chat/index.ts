import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HICAP_API_KEY = Deno.env.get('HICAP_API_KEY');
const HICAP_BASE_URL = "https://api.hicap.ai/v2/openai";
const MODELO_CHAT = "gemini-2.5-pro";

// Inicializar cliente de Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    return `[ERROR] ${error instanceof Error ? error.message : 'Error desconocido'}`;
  }
}

async function detectarIntencion(user_input: string) {
  const prompt = [
    {
      role: "system",
      content: `Clasifica la siguiente consulta del usuario en UNA de estas categorías:
A. TRANSFERENCIA → si quiere enviar dinero a alguien
B. REGISTRO_CONTACTO → si quiere agregar un nuevo contacto
C. PAGO_SERVICIO → si quiere pagar un servicio
D. CONSULTA → si es una pregunta general

Responde SOLO con UNA palabra: TRANSFERENCIA, REGISTRO_CONTACTO, PAGO_SERVICIO o CONSULTA.`
    },
    { role: "user", content: user_input }
  ];

  const respuesta = await chatConIA(prompt);
  let categoria = respuesta.trim().toUpperCase();
  
  if (categoria.includes("TRANSFERENCIA")) return "TRANSFERENCIA";
  if (categoria.includes("REGISTRO")) return "REGISTRO_CONTACTO";
  if (categoria.includes("PAGO")) return "PAGO_SERVICIO";
  return "CONSULTA";
}

async function buscarContacto(query: string) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(5);
  
  if (error) {
    console.error('Error buscando contactos:', error);
    return [];
  }
  return data || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages: clientMessages, isFirstMessage } = await req.json();

    const systemPrompt = `Eres un asistente especializado en transacciones de criptomonedas. Tu objetivo es ayudar al usuario a:
1. Realizar transferencias de criptomonedas a contactos registrados
2. Registrar nuevos contactos (necesitas nombre y email o teléfono)
3. Pagar servicios guardados

IMPORTANTE: Cuando necesites ejecutar una acción, debes responder con un JSON al final de tu mensaje entre los marcadores ###ACTION_JSON###:

Para transferencias:
###ACTION_JSON###
{
  "id": "action-[número único]",
  "type": "transfer",
  "data": {
    "amount": "[cantidad]",
    "token": "[BTC|ETH|USDT|etc]",
    "network": "[Ethereum|Polygon|etc]",
    "recipient_name": "[nombre del destinatario]",
    "recipient_email": "[email]",
    "description": "[descripción opcional]"
  }
}
###ACTION_JSON###

Para registro de contactos:
###ACTION_JSON###
{
  "id": "action-[número único]",
  "type": "contact_register",
  "data": {
    "name": "[nombre completo]",
    "email": "[email]",
    "phone": "[teléfono opcional]",
    "wallet_address": "[dirección opcional]"
  }
}
###ACTION_JSON###

Para pagos de servicios:
###ACTION_JSON###
{
  "id": "action-[número único]",
  "type": "service_payment",
  "data": {
    "service_name": "[nombre del servicio]",
    "amount": "[cantidad]",
    "token": "[USDT|USDC|etc]",
    "network": "[red]",
    "description": "[descripción]"
  }
}
###ACTION_JSON###

Sé claro, amigable y eficiente. Siempre confirma los detalles antes de crear una acción.`;

    if (isFirstMessage && (!clientMessages || clientMessages.length === 0)) {
      return new Response(
        JSON.stringify({ 
          response: "¡Hola! Soy tu asistente de transacciones. Puedo ayudarte a enviar dinero, registrar contactos y pagar servicios. ¿Qué necesitas hacer hoy?",
          intencion: null 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!clientMessages || clientMessages.length === 0) {
      throw new Error('No se proporcionaron mensajes');
    }

    const lastUserMessage = clientMessages[clientMessages.length - 1];
    if (lastUserMessage.role === 'user') {
      const user_input = lastUserMessage.content;
      
      // Detectar intención
      const intencion = await detectarIntencion(user_input);
      console.log('[Debug] Intención detectada:', intencion);

      let contexto_adicional = "";

      // Si es transferencia, buscar contactos
      if (intencion === "TRANSFERENCIA") {
        // Extraer posible nombre del contacto
        const palabras = user_input.toLowerCase().split(' ');
        const indiceA = palabras.indexOf('a');
        if (indiceA !== -1 && indiceA < palabras.length - 1) {
          const posibleNombre = palabras.slice(indiceA + 1).join(' ');
          const contactos = await buscarContacto(posibleNombre);
          
          if (contactos.length > 0) {
            contexto_adicional = `\nContactos encontrados: ${JSON.stringify(contactos, null, 2)}`;
          } else {
            contexto_adicional = "\nNo se encontraron contactos con ese nombre. Pregunta si desea registrar un nuevo contacto.";
          }
        }
      }

      // Construir mensajes
      const messages = [
        { role: "system", content: systemPrompt + contexto_adicional },
        ...clientMessages
      ];

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
          action: actionJson
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('No se encontró un mensaje de usuario válido');

  } catch (error) {
    console.error('Error en transaction-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
