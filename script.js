/**

 * 現在の時間帯に基づいてメッセージを設定する関数

 */

function displayTimeBasedMessage() {

    // 1. 現在の日時情報を取得

    let now = new Date();

    // 2. 現在の「時」を24時間形式で取得

    let hour = now.getHours();



    let message = ""; // 表示するメッセージを格納する変数



    // 3. 時間帯によってメッセージを決定

    if (hour >= 5 && hour < 11) {

        // 5:00 から 10:59 まで

        message = "おはようございます！<br>一日頑張りましょう！";

    } else if (hour >= 11 && hour < 18) {

        // 11:00 から 17:59 まで

        message = "こんにちは！<br>食事の入力を進めましょう！";

    } else {

        // 18:00 から 翌朝 4:59 まで

        message = "こんばんは！今日の<br>記録は終わりましたか？";

    }



    // 4. HTML要素にメッセージを反映

    // index.htmlの id="greeting-message" の要素を取得

    const messageElement = document.getElementById('greeting-message');



    // 要素が存在するか確認してからtextContentを設定

    if (messageElement) {

        messageElement.innerHTML = message;

    }

}



// 関数を実行し、ページ読み込み時にメッセージを表示

displayTimeBasedMessage();