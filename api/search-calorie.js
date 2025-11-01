// api/search-calorie.js
// Gemini API を使って料理名からおおよそのカロリーと簡易PFCを推定

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ status: 'error', error: 'GEMINI_API_KEY is not set' });
    }

    const body = req.body || {};
    const foodName = (body.foodName || '').toString().trim();
    if (!foodName) {
      return res.status(400).json({ status: 'error', error: 'foodName is required' });
    }

    // Gemini REST API (generateContent)
    const models = ['gemini-2.0-flash'];
    const base = 'https://generativelanguage.googleapis.com/v1beta/models';
    const prompt = `以下の料理名について、日本語でシンプルに数値のみ返してください。1人前の概算でお願いします。\n` +
      `料理名: ${foodName}\n` +
      `形式: JSONで {"calories": 数値(kcal), "protein": 数値(g), "fat": 数値(g), "carb": 数値(g)} のみ。説明文は不要。`;
    let result;
    let lastStatus = 0;
    let lastText = '';
    for (const m of models) {
      const endpoint = `${base}/${m}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      });
      if (upstream.ok) {
        result = await upstream.json();
        console.log(result);
        break;
      } else {
        lastStatus = upstream.status;
        lastText = await upstream.text();
      }
    }
    if (!result) {
      return res.status(200).json({ status: 'error', error: `Gemini upstream error: ${lastStatus}`, detail: lastText.slice(0, 300) });
    }
    // 応答のテキストを取り出し
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log("Gemini Raw Output:", rawText); // 例: ```json\n{...}\n```
    
    let parsed;
    try {
      // 1. マークダウン (```json) をクリーンアップ
      //    正規表現で最初に出てくる '{' と最後に出てくる '}' の間の文字列を抽出
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch || !jsonMatch[0]) {
        throw new Error('Response does not contain a valid JSON object.');
      }
      
      const jsonString = jsonMatch[0]; // -> {...} の部分だけになる
      parsed = JSON.parse(jsonString);
    
    } catch (error) {
      console.warn(`JSON.parse failed: ${error.message}. Falling back to regex.`);
      // 2. フォールバック: 簡易抽出 (正規表現を改善)
      //    JSON.parseが失敗した場合、キーと数値で直接検索
      const kcal = /"calories":\s*([0-9]+)/i.exec(rawText)?.[1];
      const p = /"protein":\s*([0-9]+\.?[0-9]*)/i.exec(rawText)?.[1];
      const f = /"fat":\s*([0-9]+\.?[0-9]*)/i.exec(rawText)?.[1];
      const c = /"carb":\s*([0-9]+\.?[0-9]*)/i.exec(rawText)?.[1];

      parsed = {
        calories: kcal ? Number(kcal) : undefined,
        protein: p ? Number(p) : undefined,
        fat: f ? Number(f) : undefined,
        carb: c ? Number(c) : undefined,
      };
    }

    const calories = Number(parsed?.calories);
    const protein = parsed?.protein != null ? Number(parsed.protein) : undefined;
    const fat = parsed?.fat != null ? Number(parsed.fat) : undefined;
    const carb = parsed?.carb != null ? Number(parsed.carb) : undefined;

    if (!Number.isFinite(calories)) {
      return res.status(200).json({ status: 'success', data: { calories: null, protein, fat, carb } });
    }

    return res.status(200).json({ status: 'success', data: { calories, protein, fat, carb } });
  } catch (error) {
    return res.status(200).json({ status: 'error', error: String(error) });
  }
}


