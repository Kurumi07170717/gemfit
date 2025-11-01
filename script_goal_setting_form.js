// script_l_1.js

// 1. DOM要素の取得
const form = document.getElementById('goal-form');
const currentWeightInput = document.getElementById('current_weight');
const targetWeightInput = document.getElementById('target_weight');

// ⭐ 目標期間（月数）の入力欄を取得
const targetPeriodInput = document.getElementById('target_period_months');

// ⭐ 必要な要素のみを取得（活動レベルは削除）
const genderSelect = document.getElementById('gender'); 
const heightInput = document.getElementById('height');
const ageInput = document.getElementById('age'); 
const resultArea = document.getElementById('result-area');
const messageElement = document.getElementById('goal-message');

// Vercelのサーバーレス関数からGAS_URLを取得するための変数と処理
let GAS_URL = '';
async function getGasUrl() {
    try {
        const response = await fetch('/api/secret');
        if (!response.ok) {
            throw new Error(`サーバーエラー: ${response.status}`);
        }
        const data = await response.json();
        GAS_URL = data.message;
    } catch (error) {
        console.error("GAS_URLの取得に失敗しました:", error);
    }
}

// ローカルストレージ または GASから最新の体重を取得し、初期値として設定
async function setInitialWeight() {
    await getGasUrl(); 

    let latestWeight = null;
    let records = JSON.parse(localStorage.getItem('weightRecords')) || [];

    // 1. GASから最新の体重データを取得 (最優先)
    if (GAS_URL) {
        try {
            const response = await fetch(`${GAS_URL}?action=getLatest`);
            
            if (response.ok) {
                const gasData = await response.json();
                if (gasData && gasData.latestWeight) {
                    latestWeight = parseFloat(gasData.latestWeight);
                    console.log("GASから最新体重を取得:", latestWeight);
                }
            } else {
                console.error("GASからの体重取得エラー: ステータス", response.status);
            }
        } catch (error) {
            console.error("GASからの体重取得に失敗しました:", error);
        }
    }

    // 2. GASからのデータがない、または失敗した場合、ローカルストレージの最新データを使用
    if (latestWeight === null && records.length > 0) {
        latestWeight = parseFloat(records[records.length - 1].weight);
        console.log("ローカルストレージから最新体重を取得:", latestWeight);
    }

    // 3. 初期値を設定
    if (latestWeight !== null) {
        currentWeightInput.value = latestWeight.toFixed(1);
    } else {
        console.log("最新体重のデータが見つからなかったため、HTMLの初期値を使用");
    }
}

// 2. カロリー計算ロジック
const KCAL_PER_KG = 7200; // 脂肪1kgに必要な消費カロリーの総量

/**
 * BMR (基礎代謝) の計算 - ハリス・ベネディクト方程式（改訂版）
 */
function calculateBMR(gender, weight, height, age) {
    let bmr = 0;
    if (gender === 'male') {
        // 男性: (13.397 x 体重kg) + (4.799 x 身長cm) - (5.677 x 年齢) + 88.362
        bmr = (13.397 * weight) + (4.799 * height) - (5.677 * age) + 88.362;
    } else {
        // 女性: (9.247 x 体重kg) + (3.098 x 身長cm) - (4.330 x 年齢) + 447.593
        bmr = (9.247 * weight) + (3.098 * height) - (4.330 * age) + 447.593;
    }
    return Math.round(bmr);
}

// ⭐ 最低摂取カロリーの制約を削除
function calculateTargetCalories(currentWeight, targetWeight, days, gender, height, age) { 
    const weightToLose = currentWeight - targetWeight;
    if (weightToLose <= 0) {
        return null; 
    }
    
    // 1. 基礎代謝 (BMR) を計算
    const bmr = calculateBMR(gender, currentWeight, height, age); 
    const tdee = bmr; // TDEEの項目にはBMRを表示するため、TDEE = BMRと定義

    // 2. 目標達成に必要な総カロリー赤字 (合計)
    const totalCalorieDeficit = weightToLose * KCAL_PER_KG;

    // 3. 1日あたりの平均カロリー赤字
    const dailyCalorieDeficit = totalCalorieDeficit / days;
    
    // 4. 推奨 1日摂取カロリー (BMR - 赤字)
    const recommendedIntake = Math.round(bmr - dailyCalorieDeficit);

    // ⚠ 安全性チェック（最低摂取カロリー）のロジックは削除しました。
    
    // ⚠ 計算結果が負の値になった場合のチェック
    if (recommendedIntake <= 0) {
        // ありえない計算結果の場合は、0または非常に低い値を返す（システム上の制約は行わない）
        messageElement.textContent = `⚠ 極端なカロリー設定です。計算結果は ${recommendedIntake} kcalとなりました。期間を見直しましょう。`;
        messageElement.style.color = 'orange';
    }


    return {
        tdee: tdee, // BMRを表示
        intake: recommendedIntake > 0 ? recommendedIntake : 1, // 負の値の場合は一応1kcalとする
        weightLoss: weightToLose.toFixed(1)
    };
}


// 3. フォーム送信時の処理
form.addEventListener('submit', function(event) {
    event.preventDefault();

    const currentWeight = parseFloat(currentWeightInput.value);
    const targetWeight = parseFloat(targetWeightInput.value);
    
    const targetPeriodMonths = parseFloat(targetPeriodInput.value); 
    
    const gender = genderSelect.value;
    const height = parseFloat(heightInput.value);
    const age = parseInt(ageInput.value, 10);

    // ----------------------------------------------------
    // 日数の計算ロジック
    // ----------------------------------------------------
    if (targetPeriodMonths <= 0 || isNaN(targetPeriodMonths)) {
        messageElement.textContent = '❌ 目標期間は1ヶ月以上の有効な値に設定してください。';
        messageElement.style.color = 'red';
        resultArea.style.display = 'none';
        return;
    }
    
    const days = Math.ceil(targetPeriodMonths * 30.4375);
    // ----------------------------------------------------
    
    if (targetWeight >= currentWeight) {
        messageElement.textContent = '❌ 目標体重は現在の体重より低く設定してください。';
        messageElement.style.color = 'red';
        resultArea.style.display = 'none';
        return;
    }

    // カロリー計算 
    const result = calculateTargetCalories(currentWeight, targetWeight, days, gender, height, age);

    if (result) {
        // 4. 結果表示
        document.getElementById('days-remaining').textContent = days;
        document.getElementById('weight-loss').textContent = result.weightLoss;
        // BMRの表示はHTMLから削除されているため、tdeeの表示は不要
        document.getElementById('intake-calorie').textContent = result.intake;
        
        resultArea.style.display = 'block';
        
        // ⭐ 結果メッセージ
        if (result.intake > 1) { // 1kcalより大きい場合のみ成功メッセージ
            messageElement.textContent = `✅ ${targetPeriodMonths}ヶ月で目標達成するためのカロリーが設定されました！`;
            messageElement.style.color = 'green';
        }
        
        // 5. ローカルストレージに目標データを保存
        localStorage.setItem('userGoal', JSON.stringify({
            currentWeight: currentWeight,
            targetWeight: targetWeight,
            targetPeriodMonths: targetPeriodMonths,
            gender: gender, 
            height: height, 
            age: age,
            dailyIntakeTarget: result.intake,
            dailyTDEE: result.tdee, // 値はBMR
        }));

        // ⭐ 6. GASへ推奨摂取カロリーを送信 (C列に記録するため)
        if (GAS_URL) {
            const today = new Date();
            const dateKey = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
            
            const goalPostData = {
                type: 'goal', 
                date: dateKey,
                intakeCalorie: result.intake 
            };

            fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(goalPostData) 
            })
            .then(() => {
                console.log('推奨摂取カロリーをGASに送信しました。');
            })
            .catch(error => {
                console.error('カロリーのGAS送信エラー:', error);
            });
        }

    } else {
        messageElement.textContent = '❌ 計算エラーが発生しました。入力値を確認してください。';
        messageElement.style.color = 'red';
        resultArea.style.display = 'none';
    }
});


// ⭐⭐⭐ スクリプト全体を非同期関数でラップし、await setInitialWeight() を実行 ⭐⭐⭐
(async () => {
    await setInitialWeight(); 
})();