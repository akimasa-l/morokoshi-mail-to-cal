// popup.jsからのメッセージを受け取るリスナー
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "GET_MAIL_DETAIL") {
        // 非同期処理を行うので true を返す
        (async () => {
            try {
                // 1. 現在アクティブなタブを取得
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab.url.includes("mail.google.com")) {
                    sendResponse({ error: "Gmailのタブではありません。" });
                    return;
                }
                
                // ★★★★★ ここから修正 ★★★★★
                // 2. content_script.js を実行してスレッドIDを取得

                // content_script.js をファイルとして直接実行させる
                
                const injectionResults = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["content_script.js"], // func ではなく files を使う
                });
                // ★★★★★ ここまで修正 ★★★★★

                if (chrome.runtime.lastError) {
                    // 注入時にエラーが発生した場合
                    sendResponse({ error: chrome.runtime.lastError.message });
                    return;
                }
                
                const threadId = injectionResults[0].result;
                if (!threadId) {
                    sendResponse({ error: "メールのスレッドIDを取得できませんでした。メール本文をクリックして選択状態にしてみてください。" });
                    return;
                }
                

                // 3. 認証トークンを取得
                const token = await chrome.identity.getAuthToken({ interactive: true });

                // 4. Gmail APIでスレッド内の最新メッセージを取得
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

// APIレスポンス(payload)から本文(text/plain)を抽出・デコードする関数
function getBody(payload) {
    let body = '';
    if (payload.parts) {
        const part = payload.parts.find(p => p.mimeType === 'text/plain');
        if (part) {
            body = part.body.data;
        }
    } else if (payload.body.data) {
        body = payload.body.data;
    }
    // Base64デコード
    return body ? decodeURIComponent(escape(atob(body.replace(/-/g, '+').replace(/_/g, '/')))) : '(本文なし)';
}