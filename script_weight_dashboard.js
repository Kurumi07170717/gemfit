// script_l.js

(async () => {
    // 新APIエンドポイント（サーバーレス関数経由）
    const API_ENDPOINT = '/api/sheet';


    // 1. DOM要素の取得
    const form = document.getElementById('weight-form');
    const weightInput = document.getElementById('weight');
    const messageElement = document.getElementById('message');
    const chartCanvas = document.getElementById('weightChart');
    let weightChart = null; 


    // グラフ描画関数 (簡略化)
    function renderChart(weightRecords) {
        if (!chartCanvas) { return; }
        if (!weightRecords || weightRecords.length === 0) {
            if (weightChart) { weightChart.destroy(); weightChart = null; }
            return;
        }
        
        const last7Records = weightRecords.slice(-7);
        const labels = last7Records.map(record => record.date); 
        const data = last7Records.map(record => parseFloat(record.weight));

        if (weightChart) { weightChart.destroy(); }

        // Chart.jsでグラフを作成 (詳細は省略)
        weightChart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '体重 (kg)',
                    data: data,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    pointRadius: 5,
                    tension: 0.3,
                    spanGaps: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    /**
     * GASから体重履歴を取得し、renderChartを呼び出す
     */
    async function loadAndRenderChart() {

        try {
            messageElement.textContent = 'グラフデータを読み込み中...';
            messageElement.style.color = 'gray';

            // GETリクエストで履歴を取得（サーバー経由）
            const response = await fetch(`${API_ENDPOINT}`);
            
            if (!response.ok) { throw new Error(`GAS履歴取得エラー: ${response.status}`); }
            
            const data = await response.json();

            if (data.status === 'success' && data.data) {
                renderChart(data.data);
                messageElement.textContent = '';
            } else {
                renderChart([]);
                messageElement.textContent = 'データがありません。体重を入力してください。';
                messageElement.style.color = 'black';
            }

        } catch (error) {
            console.error("体重履歴の読み込み中にエラー:", error);
            renderChart([]);
            messageElement.textContent = '❌ グラフデータの読み込みに失敗しました。';
            messageElement.style.color = 'red';
        }
    }


    // 2. フォーム送信時のイベント処理
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();

            if (weightInput.value === "" || isNaN(parseFloat(weightInput.value))) {
                messageElement.textContent = '❌ 有効な体重を入力してください。';
                messageElement.style.color = 'red';
                return;
            }

            const enteredWeight = weightInput.value;
            const weightValue = parseFloat(enteredWeight);
            const now = new Date();
            const dateKey = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;

            // ⭐ GETリクエストで記録データ送信 ⭐
            // POSTでサーバーへ送信
            const recordUrl = `${API_ENDPOINT}`;

            if (true) {
                messageElement.textContent = '記録を送信中...';
                messageElement.style.color = 'blue';
                
                fetch(recordUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: dateKey, weight: weightValue.toFixed(1) })
                    })
                    .then(response => response.json().then(data => ({ ok: response.ok, data })))
                    .then(data => {
                        if (data.ok && data.data && data.data.status === 'success' || data.data?.status === 'success') {
                            loadAndRenderChart(); 
                            messageElement.textContent = '✅ 体重を記録しました！グラフを更新します。';
                            messageElement.style.color = 'orange';
                        } else {
                            const d = data.data || {};
                            throw new Error(d.message || '記録失敗');
                        }
                    })
                    .catch(error => {
                        console.error('GAS送信エラー:', error);
                        messageElement.textContent = `❌ 送信失敗: ${error.message}`;
                        messageElement.style.color = 'red';
                    });
            } else {
                    messageElement.textContent = '❌ GAS URLが未設定のため記録できません。';
                    messageElement.style.color = 'red';
            }

            form.reset();
        });
    }

    // ⭐ ページ読み込み時の実行
    await loadAndRenderChart();
})();