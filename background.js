// background.js


// getBody関数は変更なしなので、そのまま残してください
// APIレスポンス(payload)から本文(text/plain)を抽出・デコードする関数
function getBody(payload) {
    let body = '';
    // ... (前回のコードと同じ)
    if (payload.parts) {
        const part = payload.parts.find(p => p.mimeType === 'text/plain');
        if (part) {
            body = part.body.data;
        } else { // text/plainがない場合、htmlを探す（簡易的）
             const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
             if(htmlPart) body = htmlPart.body.data;
        }
    } else if (payload.body.data) {
        body = payload.body.data;
    }
    // Base64デコード
    return body ? decodeURIComponent(escape(atob(body.replace(/-/g, '+').replace(/_/g, '/')))) : '(本文なし)';
}

// popup.jsからのメッセージを受け取るリスナー
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "GET_MAIL_DETAIL") {
        // 非同期処理を行うので true を返す
        (async () => {
            try {
                // 1. 現在アクティブなタブを取得
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab.url || !tab.url.includes("mail.google.com")) {
                    sendResponse({ error: "Gmailのタブではありません。" });
                    return;
                }
                console.log(tab.url)

                // ★★★★★ ここが新しい処理 ★★★★★
                // 2. URLからメール(スレッド)IDを抽出
                const urlParts = tab.url.split('/');
                console.log(urlParts)
                const threadId = urlParts[urlParts.length - 1]; // URLの最後の部分を取得

                // IDが有効な形式か軽くチェック (GmailのIDは16文字以上の英数字)
                if (threadId.length < 16) {
                    sendResponse({ error: "URLからメールIDを取得できませんでした。メールを開いた状態ですか？" });
                    return;
                }
                // ★★★★★ ここまで ★★★★★

                // 3. 認証トークンを取得 (変更なし)
                const token = await chrome.identity.getAuthToken({ interactive: true });

                // 4. Gmail APIでスレッド詳細を取得 (変更なし)
                const threadDetails = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                }).then(res => res.json());

                // スレッドの一番最後の（最新の）メッセージを取得
                const latestMessage = threadDetails.messages[threadDetails.messages.length - 1];

                // 5. ヘッダーから件名を取得
                const subjectHeader = latestMessage.payload.headers.find(h => h.name === 'Subject');
                const subject = subjectHeader ? subjectHeader.value : '(件名なし)';

                // 6. 本文をデコードして取得
                const body = getBody(latestMessage.payload);
                
                // 7. popup.jsに結果を返す
                sendResponse({ subject: subject, body: body });

            } catch (e) {
                console.error(e);
                sendResponse({ error: e.message });
            }
        })();
        return true; // 非同期レスポンスのためにtrueを返す
    }
});
