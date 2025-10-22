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
  
  // Por defecto, educación
  return 'EDUCACION';
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

    // Crear cliente de Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Delegar a la función apropiada
    let targetFunction = '';
    switch (tipoIntencion) {
      case 'INVERSIONES':
        targetFunction = 'ai-chat';
        break;
      case 'TRANSACCIONES':
        targetFunction = 'transaction-chat';
        break;
      case 'EDUCACION':
        targetFunction = 'education-chat';
        break;
      default:
        targetFunction = 'education-chat';
    }

    console.log('🔀 Delegando a:', targetFunction);

    // Llamar a la función apropiada
    const { data: functionData, error: functionError } = await supabase.functions.invoke(targetFunction, {
      body: { message, history, isFirstMessage: false }
    });

    if (functionError) {
      console.error('❌ Error llamando a función:', functionError);
      throw new Error(`Error en función ${targetFunction}: ${functionError.message}`);
    }

    console.log('✅ Respuesta recibida de:', targetFunction);

    // Retornar respuesta con información del bot usado
    return new Response(
      JSON.stringify({ 
        ...functionData,
        botType: tipoIntencion.toLowerCase(),
        delegatedTo: targetFunction
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
