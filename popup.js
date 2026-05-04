const SERVER_URL = 'http://127.0.0.1:8000/analyze';

document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const btn = document.getElementById('analyzeBtn');
    const adviceDiv = document.getElementById('advice');
    const scoreCircle = document.getElementById('score-circle');
    const statsBlock = document.getElementById('statsBlock');
    const linksBlock = document.getElementById('linksBlock'); // Блок со ссылками
    
    btn.disabled = true;
    btn.innerText = "ПОИСК И АНАЛИЗ...";

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Получаем название товара и текст
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                return {
                    title: document.title,
                    text: document.body.innerText.substring(0, 800)
                };
            }
        });

        const rawTitle = results[0].result.title;
        const reviews = results[0].result.text;

        // Отправляем на сервер
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: rawTitle, reviews: reviews })
        });

        const data = await response.json();

        // 1. Отображаем оценку и совет
        scoreCircle.innerText = data.score || "0";
        scoreCircle.style.background = `hsl(${(data.score || 0) * 12}, 60%, 40%)`;
        adviceDiv.innerText = data.advice;

        // 2. Логика поиска "Где дешевле"
        // Убираем из названия мусор (названия магазинов и т.д.), берем первые 5 слов
        const cleanQuery = rawTitle
            .replace(/Wildberries|Ozon|купить в интернет-магазине|отзывы|цена/gi, '')
            .split(' ').slice(0, 5).join(' ');
        
        const query = encodeURIComponent(cleanQuery);

        // Настраиваем ссылки
        document.getElementById('link-ozon').href = `https://www.ozon.ru/search/?text=${query}&sort=price`;
        document.getElementById('link-wb').href = `https://www.wildberries.ru/catalog/0/search.aspx?search=${query}&sort=priceup`;
        document.getElementById('link-market').href = `https://market.yandex.ru/search?text=${query}&how=aprice`;

        // Показываем блоки
        statsBlock.style.display = 'block';
        linksBlock.style.display = 'flex'; // Показываем кнопки поиска
        
        if (data.quality) {
            document.getElementById('q-bar').style.width = data.quality + '%';
            document.getElementById('q-val').innerText = data.quality + '%';
        }

    } catch (err) {
        console.error(err);
        adviceDiv.innerText = "Ошибка связи. Проверь bridge.py";
    } finally {
        btn.disabled = false;
        btn.innerText = "ПРОАНАЛИЗИРОВАТЬ";
    }
});