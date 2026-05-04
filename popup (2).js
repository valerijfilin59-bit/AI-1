document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('btn');
    const score = document.getElementById('score');
    const advice = document.getElementById('advice');

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerText = "Думаю...";
        score.innerText = "...";
        advice.innerText = "Запрос идет через Нарнию...";

        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            const response = await fetch('http://127.0.0.1:8000/analyze', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ title: tab.title })
            });

            const data = await response.json();

            if (data.error) {
                advice.innerText = "Ошибка: " + data.error;
                score.innerText = "!";
            } else {
                score.innerText = data.score;
                advice.innerText = data.advice;
                const s = parseInt(data.score);
                score.style.color = s >= 7 ? "#28a745" : (s >= 4 ? "#fd7e14" : "#dc3545");
            }
        } catch (e) {
            advice.innerText = "Ошибка: Python-сервер не отвечает!";
            score.innerText = "!";
        } finally {
            btn.disabled = false;
            btn.innerText = "Анализировать";
        }
    });
});