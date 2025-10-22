from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import requests
from openai import OpenAI
import base64
import io

app = FastAPI()

# Configurar CORS para desarrollo local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de la API
HICAP_API_KEY = os.getenv("HICAP_API_KEY", "92549a12e4254ad9b4838d8321a7a19c")
HICAP_BASE_URL = "https://api.hicap.ai/v2/openai"
MODELO_CHAT = "gemini-2.5-pro"

HEADERS = {
    "api-key": HICAP_API_KEY
}

client = OpenAI(
    api_key=HICAP_API_KEY,
    base_url=HICAP_BASE_URL,
    default_headers=HEADERS
)

# Datos ficticios de usuario
usuario = {
    "nombre": "Juan Pérez",
    "perfil_riesgo": "Moderado",
    "objetivo": "Crecimiento moderado en 12-24 meses",
}

# Transacciones históricas se mantienen igual
transacciones_historicas = [
    {"fecha": "2025-10-10", "activo": "bitcoin", "cantidad": 0.5, "tipo": "compra", "precio_usd": 25000},
    {"fecha": "2025-09-15", "activo": "ethereum", "cantidad": 5, "tipo": "compra", "precio_usd": 3000},
    {"fecha": "2025-08-01", "activo": "stablecoins", "cantidad": 9000, "tipo": "compra", "precio_usd": 1},
]

def cargar_portafolio():
    try:
        with open("public/portfolio-data.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(f"Error leyendo portafolio dinámico: {e}")
        return None

def generar_contexto_fijo(portafolio_data):
    # Mapeamos distribución a objeto para detalle (simplificado)
    distribucion_obj = {}
    for item in portafolio_data.get("distribution", []):
        key = item["name"].lower()
        distribucion_obj[key] = item["value"] / 100  # porcentaje a decimal

    # No tenemos detalle de cantidades y precios en el JSON dinámico, mantenemos vacío o predeterminado
    detalle_predeterminado = {
        "bitcoin": {"cantidad": 0.8, "precio_usd": 30000},
        "ethereum": {"cantidad": 5, "precio_usd": 3200},
        "solana": {"cantidad": 10, "precio_usd": 100},  # ejemplo
        "other": {"cantidad": 2000, "precio_usd": 1}
    }

    contexto = f"""
--- CONTEXTO FIJO DEL USUARIO ---
Perfil del usuario:
- Nombre: {usuario['nombre']}
- Perfil de riesgo: {usuario['perfil_riesgo']} (Recuerda: Moderado = balance entre crecimiento y seguridad)
- Objetivo: {usuario['objetivo']}

Portafolio Actual:
- Valor total: ${portafolio_data.get('totalValue', 0):.2f}
- Rentabilidad 24h: {portafolio_data.get('performance', 0)}%
- Distribución: {json.dumps(distribucion_obj, indent=2)}
- Detalle de la composición (cantidades y precios): {json.dumps(detalle_predeterminado, indent=2)}

Histórico de Transacciones (Recientes):
{json.dumps(transacciones_historicas[-3:], indent=2)}
--- FIN CONTEXTO FIJO ---
"""
    return contexto

# Se genera el contexto fijo una vez cargando datos dinámicos
portafolio_dinamico = cargar_portafolio()
if portafolio_dinamico:
    contexto_fijo = generar_contexto_fijo(portafolio_dinamico)
else:
        contexto_fijo = "No se pudo cargar la información del portafolio dinámico."

system_prompt = contexto_fijo + """
Eres un asesor financiero basado en inteligencia artificial especializado en inversiones Web3. Tu misión es ayudar al usuario a analizar su portafolio, ofrecer recomendaciones de inversión personalizadas, crear y gestionar tareas programadas (como compras recurrentes), y simplificar la experiencia financiera en blockchain. Respondes siempre en español. Actúas como asistente experto pero accesible, simplificando conceptos complejos y eliminando tecnicismos innecesarios. Te comportas como un asesor profesional con enfoque amigable, directo y centrado en resultados.

--- CONTEXTO DE FUNCIONALIDAD ---

1. Tu principal objetivo es **maximizar la rentabilidad del portafolio del usuario**, considerando todos los datos de su Perfil y Portafolio Actual que tienes arriba.
2. **NO debes hacer recomendaciones sin que el usuario lo solicite**, a menos que haya una alerta crítica que amerite una sugerencia (ej: alta volatilidad o riesgo inminente).
3. Eres capaz de generar y simular acciones futuras en forma de **tareas programadas**.
4. **IMPORTANTE**: Cuando el usuario quiera programar una tarea, debes responder con un JSON en este formato EXACTO al final de tu mensaje, entre marcadores ###TASK_JSON###:

###TASK_JSON###
{
  "id": "task-[número único]",
  "title": "[Descripción clara de la tarea]",
  "type": "[buy|sell|transfer|stake]",
  "amount": "[cantidad como string]",
  "token": "[símbolo del token, ej: BTC, ETH, SOL]",
  "network": "[red blockchain, ej: Ethereum, Solana, Polygon]",
  "gasEstimate": "[estimación de gas como string, ej: $2.50]"
}
###TASK_JSON###

5. Usa un tono profesional, claro y útil. Mantén siempre una actitud colaborativa.

Comienza saludando al usuario si es la primera interacción, y espera sus instrucciones. Siempre estás listo para ayudar.
"""

class ChatRequest(BaseModel):
    messages: list
    isFirstMessage: bool = False

class TranscribeRequest(BaseModel):
    audio: str

def obtener_precio_actual(activo_id="bitcoin", vs_currency="usd"):
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={activo_id}&vs_currencies={vs_currency}&include_24hr_change=true"
    try:
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        if activo_id in data:
            return data[activo_id]
    except Exception as e:
        print(f"Error al obtener precio: {e}")
    return None

def clasificar_intencion(user_input):
    prompt_clasificador = [
        {
            "role": "system",
            "content": (
                "Eres un sistema de clasificación de intenciones. Recibirás una consulta de un usuario sobre finanzas e inversiones. "
                "Debes clasificar la consulta en UNA de las siguientes categorías:\n"
                "A. PORTAFOLIO → si la consulta trata sobre la distribución, rentabilidad o estado actual de sus inversiones.\n"
                "B. TRANSACCIONES → si está buscando consejos, quiere saber qué hacer, desea una sugerencia o análisis basado en su comportamiento pasado o futuro (compras/ventas).\n"
                "C. MERCADO → si está preguntando por el estado actual de criptomonedas como Bitcoin, Ethereum u otras, precios o eventos del mercado.\n\n"
                "Responde **SOLO** con UNA PALABRA en mayúsculas: PORTAFOLIO, TRANSACCIONES o MERCADO."
            )
        },
        {
            "role": "user",
            "content": user_input
        }
    ]

    try:
        response = client.chat.completions.create(
            model=MODELO_CHAT,
            messages=prompt_clasificador
        )
        categoria = response.choices[0].message.content.strip().upper()
        
        if categoria.startswith("PORTAFOLIO"):
            return "PORTAFOLIO"
        elif categoria.startswith("TRANSACCIONES"):
            return "TRANSACCIONES"
        elif categoria.startswith("MERCADO"):
            return "MERCADO"
        else:
            return "TRANSACCIONES"
    except Exception as e:
        print(f"Error clasificando intención: {e}")
        return "TRANSACCIONES"

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        messages = request.messages
        
        # Si es el primer mensaje, enviar saludo
        if request.isFirstMessage or len(messages) == 0:
            return {
                "response": f"Hola {usuario['nombre']}! Soy tu asistente de inversión. ¿Cómo puedo ayudarte hoy?"
            }
        
        # Obtener el último mensaje del usuario
        last_user_message = None
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                last_user_message = msg.get('content', '')
                break
        
        if not last_user_message:
            raise HTTPException(status_code=400, detail="No se encontró mensaje del usuario")
        
        # Clasificar intención
        tipo_intencion = clasificar_intencion(last_user_message)
        
        # Construir mensajes para la IA
        ai_messages = [{"role": "system", "content": system_prompt}]
        
        # Agregar contexto de mercado si es necesario
        if tipo_intencion == "MERCADO":
            btc = obtener_precio_actual("bitcoin", "usd")
            eth = obtener_precio_actual("ethereum", "usd")
            mensaje_contexto = "Contexto de mercado actual (información en tiempo real):\n"
            if btc:
                mensaje_contexto += f"- Bitcoin: ${btc.get('usd', 'N/A'):.2f}, cambio 24h: {btc.get('usd_24h_change', 'N/A'):.2f}%\n"
            if eth:
                mensaje_contexto += f"- Ethereum: ${eth.get('usd', 'N/A'):.2f}, cambio 24h: {eth.get('usd_24h_change', 'N/A'):.2f}%\n"
            ai_messages.append({"role": "system", "content": mensaje_contexto})
        
        # Agregar historial de mensajes
        for msg in messages:
            if msg.get('role') in ['user', 'assistant']:
                ai_messages.append({
                    "role": msg['role'],
                    "content": msg['content']
                })
        
        # Llamar a la IA
        response = client.chat.completions.create(
            model=MODELO_CHAT,
            messages=ai_messages
        )
        
        ai_response = response.choices[0].message.content
        
        # Detectar si hay una tarea programada en la respuesta
        task_json = None
        if "###TASK_JSON###" in ai_response:
            try:
                parts = ai_response.split("###TASK_JSON###")
                if len(parts) >= 3:
                    json_str = parts[1].strip()
                    task_json = json.loads(json_str)
                    # Remover el JSON de la respuesta visible
                    ai_response = parts[0].strip() + (parts[2].strip() if len(parts) > 2 else "")
            except Exception as e:
                print(f"Error parseando task JSON: {e}")
        
        return {
            "response": ai_response,
            "task": task_json
        }
    
    except Exception as e:
        print(f"Error en chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe")
async def transcribe(request: TranscribeRequest):
    try:
        # Decodificar audio de base64
        audio_data = base64.b64decode(request.audio)
        
        # Crear archivo temporal en memoria
        audio_file = io.BytesIO(audio_data)
        audio_file.name = "audio.webm"
        
        # Transcribir con Whisper
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        
        return {
            "text": transcription.text
        }
    
    except Exception as e:
        print(f"Error en transcripción: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def convertir_moneda(cantidad, de, a="mxn"):
    """Convierte entre criptomonedas y monedas fiat"""
    cripto_ids = {
        'btc': 'bitcoin',
        'bitcoin': 'bitcoin',
        'eth': 'ethereum',
        'ethereum': 'ethereum',
        'usdt': 'tether',
        'tether': 'tether',
        'usdc': 'usd-coin',
        'sol': 'solana',
        'solana': 'solana',
        'matic': 'matic-network',
        'polygon': 'matic-network'
    }
    
    de_id = cripto_ids.get(de.lower(), de.lower())
    precio = obtener_precio_actual(de_id, a.lower())
    
    if precio and a.lower() in precio:
        return cantidad * precio[a.lower()]
    return None

@app.post("/transaction-chat")
async def transaction_chat(request: ChatRequest):
    """Endpoint para el chatbot de transacciones"""
    try:
        messages = request.messages
        
        # Si es el primer mensaje, enviar saludo
        if request.isFirstMessage or len(messages) == 0:
            return {
                "response": "¡Hola! Soy tu asistente de transacciones. Puedo ayudarte a enviar dinero, registrar contactos y pagar servicios. ¿Qué necesitas hacer hoy?",
                "intencion": None
            }
        
        # Obtener el último mensaje del usuario
        last_user_message = None
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                last_user_message = msg.get('content', '')
                break
        
        if not last_user_message:
            raise HTTPException(status_code=400, detail="No se encontró mensaje del usuario")
        
        # Clasificar intención para transacciones
        tipo_intencion = clasificar_intencion_transacciones(last_user_message)
        
        # System prompt específico para transacciones
        transaction_system_prompt = """Eres un asistente experto en transferencias de criptomonedas. Tu misión es hacer que las transacciones sean simples, seguras y sin fricción para el usuario.

PRINCIPIOS CLAVE:
1. **Simplicidad**: Usa lenguaje claro, evita tecnicismos innecesarios
2. **Seguridad**: Siempre verifica datos antes de ejecutar transacciones
3. **Recomendaciones inteligentes**: Sugiere la mejor red según el monto y la urgencia
4. **Conversiones automáticas**: Ayuda a convertir entre monedas fiat y criptos
5. **Contexto del mercado**: Usa datos en tiempo real para dar recomendaciones precisas

CAPACIDADES:
- Realizar transferencias de criptomonedas
- Registrar y gestionar contactos
- Pagar servicios con cripto
- Consultar precios actuales y hacer conversiones
- Recomendar redes óptimas según el caso de uso

RECOMENDACIONES DE REDES:
- **Polygon**: Óptima para montos pequeños (<$100 USD), fees muy bajos (~$0.01-0.50)
- **BSC (Binance Smart Chain)**: Balance entre velocidad y costo, fees bajos (~$0.20-1.00)
- **Ethereum Mainnet**: Para grandes montos (>$1000 USD) donde seguridad es prioritaria, fees altos (~$5-50)
- **Arbitrum/Optimism**: Layer 2 de Ethereum, buenos fees (~$0.50-2.00), alta seguridad
- **Solana**: Ultra rápida y barata (~$0.0001-0.01), ideal para microtransacciones

CONVERSIONES:
- Siempre ofrece convertir pesos mexicanos (MXN) a la cripto equivalente
- Usa los precios de mercado actuales
- Explica las comisiones estimadas (gas fees)

IMPORTANTE: Cuando detectes una intención clara de acción, genera un JSON al final entre marcadores ###ACTION_JSON###

Para TRANSFERENCIAS:
###ACTION_JSON###
{
  "id": "action-[número]",
  "type": "transfer",
  "data": {
    "amount": "[cantidad]",
    "token": "[símbolo]",
    "network": "[red]",
    "recipient_name": "[nombre]",
    "recipient_email": "[email]",
    "description": "[descripción]"
  }
}
###ACTION_JSON###

Para REGISTRO CONTACTO:
###ACTION_JSON###
{
  "id": "action-[número]",
  "type": "contact_register",
  "data": {
    "name": "[nombre]",
    "email": "[email]",
    "phone": "[teléfono]",
    "wallet_address": "[wallet opcional]"
  }
}
###ACTION_JSON###

Para PAGO SERVICIO:
###ACTION_JSON###
{
  "id": "action-[número]",
  "type": "service_payment",
  "data": {
    "service_name": "[servicio]",
    "amount": "[monto]",
    "token": "[cripto]",
    "network": "[red]",
    "description": "[descripción]"
  }
}
###ACTION_JSON###

Responde siempre en español de manera amigable y profesional."""
        
        # Construir mensajes para la IA
        ai_messages = [{"role": "system", "content": transaction_system_prompt}]
        
        # Agregar contexto de mercado si es necesario
        if tipo_intencion == "MERCADO":
            btc = obtener_precio_actual("bitcoin", "usd")
            eth = obtener_precio_actual("ethereum", "usd")
            usdt = obtener_precio_actual("tether", "usd")
            mxn_btc = obtener_precio_actual("bitcoin", "mxn")
            mxn_eth = obtener_precio_actual("ethereum", "mxn")
            
            mensaje_contexto = "Precios de mercado actuales:\n"
            if btc:
                mensaje_contexto += f"- Bitcoin (BTC): ${btc.get('usd', 'N/A'):.2f} USD"
                if mxn_btc and 'mxn' in mxn_btc:
                    mensaje_contexto += f" | ${mxn_btc['mxn']:.2f} MXN"
                mensaje_contexto += f" | Cambio 24h: {btc.get('usd_24h_change', 0):.2f}%\n"
            if eth:
                mensaje_contexto += f"- Ethereum (ETH): ${eth.get('usd', 'N/A'):.2f} USD"
                if mxn_eth and 'mxn' in mxn_eth:
                    mensaje_contexto += f" | ${mxn_eth['mxn']:.2f} MXN"
                mensaje_contexto += f" | Cambio 24h: {eth.get('usd_24h_change', 0):.2f}%\n"
            if usdt:
                mensaje_contexto += f"- Tether (USDT): ${usdt.get('usd', 'N/A'):.4f} USD (stablecoin)\n"
            mensaje_contexto += "\nTasas de cambio aprox: 1 USD = 20 MXN"
            
            ai_messages.append({"role": "system", "content": mensaje_contexto})
        
        # Agregar historial de mensajes
        for msg in messages:
            if msg.get('role') in ['user', 'assistant']:
                ai_messages.append({
                    "role": msg['role'],
                    "content": msg['content']
                })
        
        # Llamar a la IA
        response = client.chat.completions.create(
            model=MODELO_CHAT,
            messages=ai_messages
        )
        
        ai_response = response.choices[0].message.content
        
        # Detectar si hay una acción en la respuesta
        action_json = None
        if "###ACTION_JSON###" in ai_response:
            try:
                parts = ai_response.split("###ACTION_JSON###")
                if len(parts) >= 3:
                    json_str = parts[1].strip()
                    action_json = json.loads(json_str)
                    # Remover el JSON de la respuesta visible
                    ai_response = parts[0].strip() + (parts[2].strip() if len(parts) > 2 else "")
            except Exception as e:
                print(f"Error parseando action JSON: {e}")
        
        return {
            "response": ai_response,
            "intencion": tipo_intencion,
            "action": action_json
        }
    
    except Exception as e:
        print(f"Error en transaction-chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def clasificar_intencion_transacciones(user_input):
    """Clasificador de intenciones específico para transacciones"""
    prompt_clasificador = [
        {
            "role": "system",
            "content": (
                "Eres un sistema de clasificación de intenciones para un asistente de transacciones de criptomonedas. "
                "Clasifica la consulta en UNA de estas categorías:\n"
                "A. TRANSFERENCIA → si quiere enviar dinero/criptos a alguien\n"
                "B. REGISTRO_CONTACTO → si quiere guardar un contacto nuevo\n"
                "C. PAGO_SERVICIO → si quiere pagar un servicio (luz, agua, internet, etc)\n"
                "D. MERCADO → si pregunta por precios actuales, conversiones de moneda o valores de mercado\n"
                "E. CONSULTA → para cualquier otra pregunta o solicitud de información\n\n"
                "Responde SOLO con UNA PALABRA en mayúsculas."
            )
        },
        {
            "role": "user",
            "content": user_input
        }
    ]
    
    try:
        response = client.chat.completions.create(
            model=MODELO_CHAT,
            messages=prompt_clasificador
        )
        categoria = response.choices[0].message.content.strip().upper()
        
        if "TRANSFERENCIA" in categoria:
            return "TRANSFERENCIA"
        elif "REGISTRO" in categoria or "CONTACTO" in categoria:
            return "REGISTRO_CONTACTO"
        elif "PAGO" in categoria or "SERVICIO" in categoria:
            return "PAGO_SERVICIO"
        elif "MERCADO" in categoria:
            return "MERCADO"
        else:
            return "CONSULTA"
    except Exception as e:
        print(f"Error clasificando intención: {e}")
        return "CONSULTA"

# Base de conocimientos para RAG educativo
FINANCIAL_KNOWLEDGE_BASE = """
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
"""

EDUCATION_SYSTEM_PROMPT = """Eres Bloky Health, un asistente experto en educación financiera y análisis de finanzas personales.

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
"""

def extract_relevant_knowledge(query: str) -> str:
    """Extrae conocimiento relevante de la base de datos usando RAG simple"""
    query_lower = query.lower()
    sections = FINANCIAL_KNOWLEDGE_BASE.split('\n## ')
    
    relevant_sections = [
        section for section in sections
        if any(keyword in section.lower() for keyword in [
            'ahorro' if 'ahorro' in query_lower else '',
            'gasto' if 'gasto' in query_lower else '',
            'inversión' if 'inversión' in query_lower else '',
            'deuda' if 'deuda' in query_lower else '',
            'presupuesto' if 'presupuesto' in query_lower else '',
            'crypto' if 'crypto' in query_lower else ''
        ]) if any(keyword in section.lower() for keyword in ['ahorro', 'gasto', 'inversión', 'deuda', 'presupuesto', 'crypto'])
    ]
    
    return '## ' + '\n## '.join(relevant_sections) if relevant_sections else FINANCIAL_KNOWLEDGE_BASE

@app.post("/education-chat")
async def education_chat_endpoint(request: dict):
    """Endpoint para chat educativo con RAG"""
    try:
        message = request.get("message", "")
        history = request.get("history", [])
        
        print(f"📚 Procesando consulta educativa: {message}")
        
        # RAG: Extraer conocimiento relevante
        relevant_knowledge = extract_relevant_knowledge(message)
        print("🔍 Conocimiento relevante extraído")
        
        # Construir mensajes con contexto RAG
        messages = [
            {
                "role": "system",
                "content": f"{EDUCATION_SYSTEM_PROMPT}\n\n# CONOCIMIENTO RELEVANTE\n{relevant_knowledge}"
            }
        ]
        messages.extend(history)
        messages.append({"role": "user", "content": message})
        
        print("🤖 Llamando a OpenAI API con contexto educativo...")
        
        # Llamar a la API de OpenAI
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=800
        )
        
        assistant_message = response.choices[0].message.content
        print("✅ Respuesta educativa generada")
        
        return {"response": assistant_message}
        
    except Exception as e:
        print(f"❌ Error en education-chat: {str(e)}")
        return {
            "error": str(e),
            "response": "Disculpa, hubo un error procesando tu consulta. Por favor intenta de nuevo."
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
