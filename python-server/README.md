# Servidor Python Local para AI Chat

Este servidor permite ejecutar la funcionalidad del chat AI localmente para desarrollo y pruebas.

## Instalación

```bash
pip install -r requirements.txt
```

## Configuración

Asegúrate de tener la variable de entorno `HICAP_API_KEY` configurada:

```bash
export HICAP_API_KEY="tu_api_key_aqui"
```

## Ejecutar el servidor

```bash
python main.py
```

El servidor correrá en `http://localhost:8000`

## Configurar el frontend para usar el servidor local

En el archivo `.env` de tu proyecto, agrega:

```env
VITE_USE_LOCAL_PYTHON=true
VITE_LOCAL_PYTHON_URL=http://localhost:8000
```

## Endpoints

- `POST /chat` - Envía mensajes al asistente AI
- `POST /transcribe` - Transcribe audio a texto usando Whisper
