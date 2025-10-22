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

# Datos ficticios
usuario = {
    "nombre": "Juan Pérez",
    "perfil_riesgo": "Moderado",
    "objetivo": "Crecimiento moderado en 12-24 meses",
}

portafolio = {
    "valor_total_usd": 45823.67,
    "rentabilidad_24h_pct": +12.34,
    "distribucion": {
        "bitcoin": 0.35,
        "ethereum": 0.30,
        "stablecoins": 0.20,
        "other": 0.15
    },
    "detalle": {
        "bitcoin": {"cantidad": 0.8, "precio_usd": 30000},
        "ethereum": {"cantidad": 5, "precio_usd": 3200},
        "stablecoins": {"cantidad": 9000, "precio_usd": 1},
        "other": {"cantidad": 2000, "precio_usd": 1}
    }
}

transacciones_historicas = [
    {"fecha": "2025-10-10", "activo": "bitcoin", "cantidad": 0.5, "tipo": "compra", "precio_usd": 25000},
    {"fecha": "2025-09-15", "activo": "ethereum", "cantidad": 5, "tipo": "compra", "precio_usd": 3000},
    {"fecha": "2025-08-01", "activo": "stablecoins", "cantidad": 9000, "tipo": "compra", "precio_usd": 1},
]

# Contexto fijo
contexto_fijo = f"""
--- CONTEXTO FIJO DEL USUARIO ---
Perfil del usuario:
- Nombre: {usuario['nombre']}
- Perfil de riesgo: {usuario['perfil_riesgo']} (Recuerda: Moderado = balance entre crecimiento y seguridad)
- Objetivo: {usuario['objetivo']}

Portafolio Actual:
- Valor total: ${portafolio['valor_total_usd']:.2f}
- Rentabilidad 24h: {portafolio['rentabilidad_24h_pct']}%
- Distribución: {json.dumps(portafolio['distribucion'], indent=2)}
- Detalle de la composición (cantidades y precios): {json.dumps(portafolio['detalle'], indent=2)}

Histórico de Transacciones (Recientes):
{json.dumps(transacciones_historicas[-3:], indent=2)}
--- FIN CONTEXTO FIJO ---
"""

system_prompt = contexto_fijo + """
Eres un asesor financiero basado en inteligencia artificial especializado en inversiones Web3. Tu misión es ayudar al usuario a analizar su portafolio, ofrecer recomendaciones de inversión personalizadas, crear y gestionar tareas programadas (como compras recurrentes), y simplificar la experiencia financiera en blockchain. Respondes siempre en español. Actúas como asistente experto pero accesible, simplificando conceptos complejos y eliminando tecnicismos innecesarios. Te comportas como un asesor profesional con enfoque amigable, directo y centrado en resultados.

--- CONTEXTO DE FUNCIONALIDAD ---

1. Tu principal objetivo es **maximizar la rentabilidad del portafolio del usuario**, considerando todos los datos de su Perfil y Portafolio Actual que tienes arriba.
2. **NO debes hacer recomendaciones sin que el usuario lo solicite**, a menos que haya una alerta crítica que amerite una sugerencia (ej: alta volatilidad o riesgo inminente).
3. Eres capaz de generar y simular acciones futuras en forma de **tareas programadas**, que deben ser objetos JSON.
4. Si el usuario desea crear tareas programadas, debes guiarlo y confirmar antes de sugerir el formato JSON con los campos: `tipo`, `activo`, `cantidad`, `frecuencia`, `confirmada: false`, `notas`.
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
        
        return {
            "response": response.choices[0].message.content
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
