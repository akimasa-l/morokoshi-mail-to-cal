// バックグラウンドにメール情報取得の依頼メッセージを送る
chrome.runtime.sendMessage({ type: "GET_MAIL_DETAIL" }, function(response) {
  if (response.error) {
    document.getElementById('message').textContent = 'エラー: ' + response.error;
    document.getElementById('subject').style.display = 'none';
  } else if (response.subject) {
    document.getElementById('subject').textContent = response.subject;
    document.getElementById('body').textContent = response.body;
    document.getElementById('message').style.display = 'none';
  } else {
    document.getElementById('message').textContent = "メール情報を取得できませんでした。メールを開いている状態で試してください。";
    document.getElementById('subject').style.display = 'none';
  }
});