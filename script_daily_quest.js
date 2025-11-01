// script_daily_quest.js

(async () => {
    // APIエンドポイント
    const API_ENDPOINT = '/api/sheet';

    // DOM要素を取得
    const weightCheck = document.getElementById('quest-weight-check');
    const mealCheck = document.getElementById('quest-meal-check');
    const messageDiv = document.getElementById('quest-message');
    
    // ★ 追加: 読み込み要素とリスト本体
    const loadingStatus = document.getElementById('quest-loading-status');
    const questList = document.querySelector('.quest-list');

    if (!weightCheck || !mealCheck || !messageDiv || !loadingStatus || !questList) {
        console.error('クエスト用のHTML要素が見つかりません。');
        if (loadingStatus) {
            loadingStatus.textContent = '❌ ページの読み込みに失敗しました。';
            loadingStatus.style.color = 'red';
        }
        return;
    }

    /**
     * "YYYY/M/D" 形式で今日の日付キーを取得する
     */
    function getTodayDateKey() {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth() + 1; // 月は0から始まる
        const d = today.getDate();
        return `${y}/${m}/${d}`;
    }

    const todayKey = getTodayDateKey();

    /**
     * APIからデータをフェッチする
     */
    async function fetchData(type) {
        try {
            const url = (type === 'meal') ? `${API_ENDPOINT}?type=meal` : API_ENDPOINT;
            const response = await fetch(url);
            
            if (!response.ok) {
                console.error(`APIエラー (${type}): ${response.status}`);
                return []; // エラー時は空の配列を返す
            }
            
            const data = await response.json();
            return (data.status === 'success' && data.data) ? data.data : [];

        } catch (error) {
            console.error(`フェッチエラー (${type}):`, error);
            return [];
        }
    }

    /**
     * 今日の日付の記録が存在するかチェックする
     */
    function hasRecordForToday(records, todayKey) {
        return records.some(record => record.date === todayKey);
    }

    // --- メイン処理 ---
    try {
        // 1. 体重データと食事データを並行して取得
        const [weightRecords, mealRecords] = await Promise.all([
            fetchData('weight'), // 体重
            fetchData('meal')    // 食事
        ]);

        // 2. 今日の記録があるかチェック
        const isWeightDone = hasRecordForToday(weightRecords, todayKey);
        const isMealDone = hasRecordForToday(mealRecords, todayKey);

        // 3. UI（チェックボックス）に反映
        if (isWeightDone) {
            weightCheck.checked = true;
        }
        if (isMealDone) {
            mealCheck.checked = true;
        }

        // 4. 両方完了していれば、お祝いメッセージを表示
        if (isWeightDone && isMealDone) {
            messageDiv.classList.add('congrats'); // これで display: block になる
        }

    } catch (error) {
        console.error('クエストのチェック処理中にエラー:', error);
        if(loadingStatus) {
            // finally で隠されるが、万が一の場合に備えてエラー表示
            loadingStatus.textContent = '❌ 達成状況の確認に失敗しました。';
            loadingStatus.style.color = 'red';
        }
    } finally {
        // ★ 追加: 読み込みが完了したら（成功・失敗問わず）
        if (loadingStatus) {
            loadingStatus.style.display = 'none'; // 読み込み中メッセージを隠す
        }
        if (questList) {
            questList.style.display = 'block'; // クエストリストを表示する
        }
    }

})();