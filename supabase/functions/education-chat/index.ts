import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HICAP_API_KEY = Deno.env.get('HICAP_API_KEY');
const HICAP_BASE_URL = Deno.env.get('HICAP_BASE_URL') || 'https://api.hicap.ai/v1';

// Sistema RAG con conocimientos financieros
const FINANCIAL_KNOWLEDGE_BASE = `
# Base de Conocimientos Financieros

## Conceptos Básicos de Ahorro
- El ahorro ideal es del 20% de tus ingresos mensuales
- Fondo de emergencia: 3-6 meses de gastos esenciales
- Regla 50/30/20: 50% necesidades, 30% deseos, 20% ahorro

## Gestión de Gastos
- Pequeños gastos diarios pueden sumar mucho (efecto latte)
- Revisar suscripciones mensuales puede ahorrar 10-15% del presupuesto
- Planificar compras grandes reduce gastos impulsivos en 30%

## Inversión en Criptomonedas
- Diversificación: No más del 5-10% del portafolio en una sola crypto
- DCA (Dollar Cost Averaging): Invertir cantidades fijas regularmente reduce riesgo
- ETH y BTC son las más estables para principiantes
- Considerar redes Layer 2 (Polygon, Arbitrum) para reducir fees

## Pago de Deudas
- Método avalancha: Pagar primero deudas con mayor interés
- Método bola de nieve: Pagar primero deudas más pequeñas para motivación
- Pago extra del 10% mensual puede reducir tiempo de pago hasta 40%

## Presupuesto Inteligente
- Apps de presupuesto pueden reducir gastos innecesarios en 20%
- Revisar gastos semanalmente mejora control financiero
- Establecer límites por categoría previene sobregastos

## Educación Financiera
- Leer 15 minutos diarios sobre finanzas mejora decisiones económicas
- Consultar asesores financieros para decisiones importantes
- Entender términos: APR, ROI, liquidez, volatilidad
`;

const EDUCATION_SYSTEM_PROMPT = `Eres Bloky Health, un asistente experto en educación financiera y análisis de finanzas personales.

# TU ROL
Ayudas a usuarios a entender su situación financiera y tomar mejores decisiones con su dinero.

# PRINCIPIOS
1. **Educación primero**: Explica el "por qué" detrás de cada consejo
2. **Personalización**: Adapta recomendaciones al contexto del usuario
3. **Empoderamiento**: Enseña a pescar, no des el pescado
4. **Claridad**: Usa lenguaje simple y ejemplos concretos
5. **Motivación**: Resalta logros y progreso del usuario

# CAPACIDADES CON RAG
Tienes acceso a una base de conocimientos financieros que incluye:
- Estrategias de ahorro y presupuesto
- Conceptos de inversión en criptomonedas
- Métodos de pago de deudas
- Gestión de gastos y optimización

IMPORTANTE: Usa este conocimiento para dar respuestas fundamentadas y educativas.

# ESTILO DE COMUNICACIÓN
- Empático y alentador
- Usa ejemplos específicos con números
- Ofrece pasos accionables
- Celebra pequeños logros
- Explica conceptos complejos de forma simple

# RESPUESTAS TÍPICAS
Cuando el usuario pregunta sobre:

1. **Gastos**: Analiza patrones, identifica áreas de mejora, explica impacto de pequeños cambios
2. **Ahorro**: Sugiere estrategias específicas, calcula impacto a corto/largo plazo
3. **Presupuesto**: Recomienda distribución 50/30/20, explica cada categoría
4. **Inversión**: Educa sobre riesgos, diversificación, y estrategias para principiantes
5. **Deudas**: Explica métodos de pago, calcula ahorros potenciales en intereses

# FORMATO DE RESPUESTAS
Estructura tus respuestas así:
1. Reconocimiento de la situación del usuario
2. Dato educativo relevante
3. Recomendación específica con números
4. Pregunta de seguimiento para profundizar

EJEMPLO:
"Veo que te interesa mejorar tus gastos. Sabías que reducir gastos pequeños pero frecuentes puede generar ahorros de hasta 20% mensual? 

En tu caso, podrías comenzar identificando tus 3 gastos más frecuentes. Si reduces cada uno en 30%, podrías ahorrar aproximadamente X ETH al mes, que en un año serían Y ETH.

¿Te gustaría que analicemos alguna categoría específica de gastos?"
`;

function extractRelevantKnowledge(query: string): string {
  const queryLower = query.toLowerCase();
  const sections = FINANCIAL_KNOWLEDGE_BASE.split('\n## ');
  
  const relevantSections = sections.filter(section => {
    const sectionLower = section.toLowerCase();
    return (
      queryLower.includes('ahorro') && sectionLower.includes('ahorro') ||
      queryLower.includes('gasto') && sectionLower.includes('gasto') ||
      queryLower.includes('inversión') && sectionLower.includes('inversión') ||
      queryLower.includes('deuda') && sectionLower.includes('deuda') ||
      queryLower.includes('presupuesto') && sectionLower.includes('presupuesto') ||
      queryLower.includes('crypto') && sectionLower.includes('crypto')
    );
  });

  return relevantSections.length > 0 
    ? '## ' + relevantSections.join('\n## ')
    : FINANCIAL_KNOWLEDGE_BASE;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();

    if (!HICAP_API_KEY) {
      throw new Error('HICAP_API_KEY no está configurada');
    }

    console.log('📚 Procesando consulta educativa:', message);

    // RAG: Extraer conocimiento relevante
    const relevantKnowledge = extractRelevantKnowledge(message);
    console.log('🔍 Conocimiento relevante extraído');

    // Construir mensajes con contexto RAG
    const messages = [
      { 
        role: 'system', 
        content: `${EDUCATION_SYSTEM_PROMPT}\n\n# CONOCIMIENTO RELEVANTE\n${relevantKnowledge}` 
      },
      ...history,
      { role: 'user', content: message }
    ];

    console.log('🤖 Llamando a HICAP API con contexto educativo...');

    const response = await fetch(`${HICAP_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HICAP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de HICAP API:', response.status, errorText);
      throw new Error(`Error de API: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    console.log('✅ Respuesta educativa generada');

    return new Response(
      JSON.stringify({ response: assistantMessage }),
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
