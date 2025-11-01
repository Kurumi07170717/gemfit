// api/secret.js
// GASのウェブアプリURLをフロントエンドに渡すためのVercelサーバーレス関数

export default function handler(req, res) {
    // 環境変数の取得（存在しない場合でも200で返し、クライアントで分岐できるようにする）
    const gasUrl = process.env.MY_SECRET_MESSAGE || '';
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

    res.status(200).json({
        message: gasUrl,          // 旧: GASのURL（未設定なら空文字）
        gemini: hasGeminiKey      // Geminiキーの有無（キー本体は返さない）
    });
}