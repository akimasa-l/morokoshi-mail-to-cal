// GmailのHTML構造の中から、現在開いているメールのスレッドIDを探して返す
// Gmailは複雑なHTMLなので、複数の可能性を試す
function findThreadId() {
    // 一般的なメール表示画面のセレクタ（data-thread-id属性を持つ要素を探す）
    const element = document.querySelector('[data-thread-id]');
    if (element) {
        return element.getAttribute('data-thread-id');
    }
    // もし見つからない場合、他の可能性を探す（将来の変更に対応するため）
    return null; 
}

// 実行結果を返す
findThreadId();