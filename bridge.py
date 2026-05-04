import uvicorn
import json
import re
import requests
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- НАСТРОЙКИ ---
GEMINI_API_KEY = "AIzaSyDkhvIOC0hO3idppycoSvBgyFDXbdgriKg"

# Твой прокси (Nekoray/V2Ray)
PROXIES = {
    "http": "http://127.0.0.1:10809", 
    "https": "http://127.0.0.1:10809"
}

# Используем самую быструю и новую модель из твоего списка
MODEL_NAME = "gemini-3.1-flash-lite-preview" 

app = FastAPI()

# Настройка CORS, чтобы расширение могло получать ответы
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

class ProductData(BaseModel):
    title: str
    reviews: str

# Логика эксперта (База знаний)
MARKETPLACE_LOGIC = """
Ты — ИИ-аналитик маркетплейсов. 
Твоя задача: проанализировать отзывы и название товара.
Выяви: реальное качество, скрытые дефекты и честность продавца.
Отвечай строго в формате JSON:
{"score": 1-10, "advice": "короткий совет", "quality": 1-100}
"""

last_request_time = 0

@app.get("/")
def home():
    return {"status": "online", "model": MODEL_NAME}

@app.post("/analyze")
async def analyze(data: ProductData):
    global last_request_time
    current_time = time.time()
    
    # Защита от 429: пауза 3 секунды между запросами
    if current_time - last_request_time < 3:
        time.sleep(1)
        
    last_request_time = current_time
    print(f"📡 Анализ товара: {data.title[:60]}...")

    # Формируем запрос к Google Gemini
    prompt = (
        f"{MARKETPLACE_LOGIC}\n"
        f"Товар: {data.title}\n"
        f"Отзывы/Описание: {data.reviews[:1000]}\n"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 300,
            "responseMimeType": "application/json"
        }
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"

    try:
        response = requests.post(
            url, 
            json=payload, 
            proxies=PROXIES, 
            timeout=20
        )
        
        # Если Google ответил ошибкой (например, 429)
        if response.status_code != 200:
            print(f"🧨 Ошибка Google API: {response.status_code}")
            return {
                "score": 0, 
                "advice": f"Ошибка API ({response.status_code}). Подождите минуту.", 
                "quality": 0
            }

        res_json = response.json()
        raw_text = res_json['candidates'][0]['content']['parts'][0]['text']
        
        # Чистим ответ от возможных лишних знаков
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if match:
            final_data = json.loads(match.group())
            print(f"✅ Успешно! Оценка: {final_data.get('score')}")
            return final_data
        
        raise ValueError("ИИ прислал текст вместо JSON")

    except Exception as e:
        print(f"❌ Системная ошибка: {str(e)}")
        return {
            "score": 5, 
            "advice": "Сервер перегружен или VPN подводит. Попробуйте еще раз через 10 секунд.", 
            "quality": 50
        }

if __name__ == "__main__":
    print(f"🚀 Эксперт запущен на порту 8000")
    print(f"📍 Используемая модель: {MODEL_NAME}")
    uvicorn.run(app, host="127.0.0.1", port=8000)
