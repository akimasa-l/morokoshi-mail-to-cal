// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. まず、このポップアップ内で認証トークンを取得する
    const token = await chrome.identity.getAuthToken({ interactive: true });
    
    // 2. 取得したトークンを添えて、バックグラウンドに処理を依頼する
    chrome.runtime.sendMessage({ type: "FETCH_MAIL_DETAIL", token: token }, function(response) {
      if (!response) {
        document.getElementById('message').textContent = 'エラー: バックグラウンドから応答がありません。';
        document.getElementById('subject').style.display = 'none';
        return;
      }

      if (response.error) {
        document.getElementById('message').textContent = 'エラー: ' + response.error;
        document.getElementById('subject').style.display = 'none';
      } else if (response.subject) {
        document.getElementById('subject').textContent = response.subject;
        document.getElementById('body').textContent = response.body;
        document.getElementById('message').style.display = 'none';
      } else {
        document.getElementById('message').textContent = "メール情報を取得できませんでした。";
        document.getElementById('subject').style.display = 'none';
      }
    });

  } catch (e) {
    // getAuthTokenでユーザーがキャンセルした場合などもここにくる
    console.error(e);
    document.getElementById('message').textContent = 'エラー: 認証に失敗しました。' + e.message;
    document.getElementById('subject').style.display = 'none';
  }
});