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

                // 2. content_script.js を実行してスレッドIDを取得
                const injectionResults = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: findThreadIdInPage, // content_script.jsの関数を実行
                });

                const threadId = injectionResults[0].result;
                if (!threadId) {
                    sendResponse({ error: "メールのスレッドIDを取得できませんでした。" });
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

// executeScript内で実行する関数。content_script.jsの内容と同じだが、このように書く必要がある
function findThreadIdInPage() {
    const element = document.querySelector('[data-thread-id]');
    if (element) {
        return element.getAttribute('data-thread-id');
    }
    return null;
}

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