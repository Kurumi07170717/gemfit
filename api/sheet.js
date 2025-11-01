// api/sheet.js (GETリクエストを強化し、食事履歴にも対応)

const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

const SHEET_NAME_WEIGHT = '体重記録';
const SHEET_NAME_MEAL = '食事記録'; 

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });
  const client = await auth.getClient();
  return client;
}

export default async function handler(req, res) {
  try {
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // ===================================
    // GETリクエスト (★ 変更点)
    // ===================================
    if (req.method === 'GET') {
      // URLクエリから 'type' を取得 (例: /api/sheet?type=meal)
      const type = req.query.type;

      if (type === 'meal') {
        // ---- 食事履歴の取得 ----
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME_MEAL}!A2:C`, // A列(日付), B列(食事名), C列(カロリー)
        });
        const rows = response.data.values || [];
        // ★ 変更点: 列を3つに
        const data = rows.map(row => ({ date: row[0], mealName: row[1], calorie: row[2] }));
        res.status(200).json({ status: 'success', data });
        return;

      } else {
        // ---- 体重履歴の取得 (デフォルト) ----
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME_WEIGHT}!A2:B`, 
        });
        const rows = response.data.values || [];
        const data = rows.map(row => ({ date: row[0], weight: row[1] }));
        res.status(200).json({ status: 'success', data });
        return;
      }
    }

    // ===================================
    // POSTリクエスト (変更なし)
    // ===================================
    if (req.method === 'POST') {
      const body = req.body || {};
      
      if (body.type === 'meal') {
        if (!body.date || !body.mealName || body.calorie == null) {
          res.status(400).json({ status: 'error', message: '日付、食事名、またはカロリーがありません' });
          return;
        }
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME_MEAL}!A:C`, 
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: [[body.date, body.mealName, body.calorie]] },
        });
        res.status(200).json({ status: 'success', message: '食事を記録しました' });
        return;
      } 
      else if (body.weight != null) {
        if (!body.date) {
          res.status(400).json({ status: 'error', message: '日付または体重がありません' });
          return;
        }
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME_WEIGHT}!A:B`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: [[body.date, body.weight]] },
        });
        res.status(200).json({ status: 'success', message: '体重を記録しました' });
        return;
      }
      else {
        res.status(400).json({ status: 'error', message: '無効なリクエストタイプです' });
        return;
      }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    
  } catch (error) {
    console.error('Google Sheets API Error:', error && error.message ? error.message : String(error));
    res.status(500).json({ status: 'error', message: 'サーバー側でエラーが発生しました', error: String(error && error.message ? error.message : error) });
  }
}