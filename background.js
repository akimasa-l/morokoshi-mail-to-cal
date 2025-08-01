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
    // メッセージのtypeと、tokenが含まれているかを確認
    if (request.type === "FETCH_MAIL_DETAIL" && request.token) {
        (async () => {
            try {
                // 1. 現在アクティブなタブを取得 (変更なし)
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab.url || !tab.url.includes("mail.google.com")) {
                    sendResponse({ error: "Gmailのタブではありません。" });
                    return;
                }

                // URLの形式全体を検証し、末尾まで考慮してIDを抽出する正規表現
                const regex = /^https:\/\/mail\.google\.com\/mail\/u\/[0-9]+\/.*\/([a-zA-Z0-9\-_]{16,})(?:\?.*)?$/;
                const match = tab.url ? tab.url.match(regex) : null;
                const threadId = match ? match[1] : null;
                                    


                if (!threadId) {
                    sendResponse({ error: "Gmailのメール詳細ページのURLではないようです。" });
                    return;
                }
                
                // 3. 認証トークンはメッセージから受け取る (getAuthTokenを削除)
                const token = request.token;

                // 4. Gmail APIでスレッド詳細を取得 (変更なし)
                const threadDetails = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                }).then(res => res.json());

                // (以降の処理は変更なし)
                 // スレッドの一番最後の（最新の）メッセージを取得
                 sendResponse({ error: `${JSON.stringify(threadDetails)}` });
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
