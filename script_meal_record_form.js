// script_meal_record_form.js
// 食事記録ページ (meal_record_form.html) 用のスクリプト

(async () => {
    // APIエンドポイント
    const API_ENDPOINT = '/api/sheet'; 

    // ===============================================
    // DOM要素の取得
    // ===============================================
    const foodInput = document.getElementById('food-input');
    const searchButton = document.getElementById('search-button');
    const calorieResultDiv = document.getElementById('calorie-result');
    
    const mealForm = document.getElementById('meal-form');
    const mealDateInput = document.getElementById('meal-date');
    const recordedCalorieInput = document.getElementById('recorded-calorie');
    const mealNameInput = document.getElementById('meal-name');
    const recordMealButton = document.getElementById('record-meal-button');
    const mealMessageElement = document.getElementById('meal-message');

    // ★ 追加: 履歴表示用のコンテナ
    const historyContainer = document.getElementById('meal-history-container');

    // 日付の初期設定
    const today = new Date();
    const dateKey = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
    mealDateInput.value = dateKey;

    // ===============================================
    // ★ 新機能: 食事履歴の読み込みと描画
    // ===============================================
    async function loadAndRenderMealHistory() {
        if (!historyContainer) return;

        try {
            // /api/sheet に ?type=meal をつけてGETリクエスト
            const response = await fetch(`${API_ENDPOINT}?type=meal`);
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();

            if (data.status === 'success' && data.data && data.data.length > 0) {
                // データを逆順にして最新5件を取得
                const recentMeals = data.data.reverse().slice(0, 5);
                
                // テーブルHTMLを構築
                let tableHTML = '<table class="history-table">';
                tableHTML += '<thead><tr><th>日付</th><th>食事名</th><th>カロリー</th></tr></thead>';
                tableHTML += '<tbody>';
                
                for (const meal of recentMeals) {
                    tableHTML += `
                        <tr>
                            <td>${escapeHTML(meal.date)}</td>
                            <td>${escapeHTML(meal.mealName)}</td>
                            <td>${escapeHTML(meal.calorie)} kcal</td>
                        </tr>
                    `;
                }
                
                tableHTML += '</tbody></table>';
                historyContainer.innerHTML = tableHTML;
                
            } else {
                historyContainer.innerHTML = '<p style="color: gray;">記録はまだありません。</p>';
            }

        } catch (error) {
            console.error('食事履歴の読み込みエラー:', error);
            historyContainer.innerHTML = '<p style="color: red;">❌ 履歴の読み込みに失敗しました。</p>';
        }
    }

    // HTMLエスケープ用ヘルパー関数
    function escapeHTML(str) {
        if (str == null) return ''; // nullやundefinedを空文字に
        return String(str).replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    // ===============================================
    // 3. カロリー検索のイベント処理 (変更なし)
    // ===============================================
    if (searchButton) {
        searchButton.addEventListener('click', async () => {
            const foodName = foodInput.value.trim();
            if (!foodName) { /* (中略) */ return; }
            searchButton.disabled = true;
            calorieResultDiv.innerHTML = `<p style="color:blue;">「${foodName}」の情報を検索中...</p>`;
            recordedCalorieInput.value = '';
            mealNameInput.value = '';

            try {
                const response = await fetch('/api/search-calorie', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ foodName })
                });
                const data = await response.json();
                if (response.ok && data.status === 'success') {
                    const result = data.data;
                    const calories = parseFloat(result.calories);
                    calorieResultDiv.innerHTML = `
                        <div style="padding: 10px; background-color: #e6f7ff; border: 1px solid #007bff;">
                            <h4>✅ ${foodName} の推定栄養情報</h4>
                            <p><strong>カロリー:</strong> <span id="display-cal">${calories || '不明'}</span> kcal</p>
                            <ul style="list-style: none; padding-left: 10px; font-size: 0.9em;">
                                <li>P: ${result.protein || '不明'} g, F: ${result.fat || '不明'} g, C: ${result.carb || '不明'} g</li>
                            </ul>
                        </div>
                    `;
                    if (!isNaN(calories) && calories > 0) {
                        recordedCalorieInput.value = calories.toFixed(0);
                        mealNameInput.value = foodName;
                        mealMessageElement.textContent = '✅ カロリーがセットされました。記録ボタンを押してください。';
                        mealMessageElement.style.color = 'orange';
                    } else {
                        mealMessageElement.textContent = '❌ 有効なカロリー値が取得できませんでした。手動で入力してください。';
                        mealMessageElement.style.color = 'red';
                    }
                } else {
                    const message = data.error || '不明なエラーが発生しました。';
                    calorieResultDiv.innerHTML = `<p style="color:red;">❌ 検索失敗: ${message}</p>`;
                }
            } catch (error) {
                console.error('カロリー検索エラー:', error);
                calorieResultDiv.innerHTML = '<p style="color:red;">❌ ネットワーク接続またはサーバーエラーです。</p>';
            } finally {
                searchButton.disabled = false;
            }
        });
    }

    // ===============================================
    // 4. 食事記録のイベント処理 (変更なし)
    // ===============================================
    if (mealForm) {
        mealForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const recordedCalorie = recordedCalorieInput.value;
            const mealName = mealNameInput.value.trim();
            if (!recordedCalorie || isNaN(parseFloat(recordedCalorie)) || !mealName) {
                mealMessageElement.textContent = '❌ カロリーと食事名が正しく入力されていません。';
                return;
            }
            const postData = {
                type: 'meal', 
                date: mealDateInput.value,
                calorie: parseFloat(recordedCalorie),
                mealName: mealName
            };
            recordMealButton.disabled = true;
            mealMessageElement.textContent = '記録を送信中...';

            try {
                const response = await fetch(API_ENDPOINT, { // /api/sheet への POST
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                });
                const data = await response.json();
                if (response.ok && data.status === 'success') {
                    mealMessageElement.textContent = `✅ 「${mealName}」 (${recordedCalorie} kcal) を記録しました！`;
                    mealMessageElement.style.color = 'green';
                    foodInput.value = '';
                    recordedCalorieInput.value = '';
                    mealNameInput.value = '';
                    
                    // ★ 追加: 記録成功したら、履歴テーブルも再読み込みする
                    await loadAndRenderMealHistory(); 

                } else {
                    throw new Error(data.message || '記録に失敗しました');
                }
            } catch (error) {
                console.error('API送信エラー:', error);
                mealMessageElement.textContent = `❌ 送信失敗: ${error.message}`;
                mealMessageElement.style.color = 'red';
            } finally {
                recordMealButton.disabled = false;
            }
        });
    }

    // ===============================================
    // ★ 実行: ページ読み込み時に履歴を取得
    // ===============================================
    await loadAndRenderMealHistory();

})();