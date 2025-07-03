// content_script.js
// GmailのHTML構造の中から、現在開いているメールのスレッドIDを探して返す
// Gmailは複雑なHTMLなので、複数の可能性を試す
// この関数を定義して...
function findThreadId() {
    // 一般的なメール表示画面のセレクタ（data-thread-id属性を持つ要素を探す）
    // GmailのHTML構造の中から、現在開いているメールのスレッドIDを探して返す
    // data-thread-id属性を持つ要素を探すのが確実
    const element = document.querySelector('[data-thread-id]');
    if (element) {
        return element.getAttribute('data-thread-id');
    }
    // もし見つからない場合、他の可能性を探す（将来の変更に対応するため）
    return null; 
}

// ...最後に実行する。この関数の返り値がbackground.jsに渡される。
// 実行結果を返す
findThreadId();