//
// content-script.js
//

/****************************************************
 * 1. APIキーの設定 (デモ用の直書き)
 ****************************************************/
const OPENAI_API_KEY = "YOUR API KEY HERE";
// 実際に試す場合は、ここにご自身のAPIキーを入力してください。
// 公開される拡張機能であれば、APIキーをソースに直書きしないよう注意。

/****************************************************
 * X. ON/OFFや列幅の変更をリアルタイムで反映するための処理
 ****************************************************/
// メッセージを受け取り、拡張機能のON/OFFやgridAutoColumnsの再設定を行う
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_SETTINGS") {
    const { extensionEnabled, gridAutoColumns } = message;

    if (extensionEnabled) {
      // ONになった → まだ分割していなければ分割＆翻訳する
      if (!document.getElementById("side_by_side_container")) {
        splitPage(gridAutoColumns);
        translatePageChunked();
      } else {
        // すでに分割済みの場合は、スタイルだけ更新し直すなど
        updateGridColumns(gridAutoColumns);
        // 必要に応じて再翻訳するなら、translatePageChunked() を呼ぶ
        // translatePageChunked();
      }
    } else {
      // OFFになった → 分割しているものを戻すなど（必要であれば）
      removeSideBySideContainer();
    }
  }
});

/****************************************************
 * X. 分割後の grid-auto-columns を更新する関数
 ****************************************************/
function updateGridColumns(newColumnsValue) {
  const container = document.getElementById("side_by_side_container");
  if (container) {
    // 既存スタイルを探す
    const styleTag = document.head.querySelector("#side_by_side_style_tag");
    if (styleTag) {
      // styleTag を書き換え
      styleTag.textContent = generateStyleText(newColumnsValue);
    }
  }
}

// 例: CSS文字列を生成する関数
function generateStyleText(columnsValue = "100%") {
  return `
    #side_by_side_container {
      display: grid;
      grid-auto-columns: ${columnsValue};
      grid-auto-flow: column;
      column-gap: 1%;
      margin: 0;
      padding: 0;
    }
    .pane {
      overflow: auto;
      height: 100vh;
    }
  `;
}

/****************************************************
 * 2. ページ左右分割 (splitPage)
 ****************************************************/
function splitPage(gridColumnsValue = "100%") {
  if (document.getElementById("side_by_side_container")) return;

  const bodyElement = document.body;
  const wrapperSrc = document.createElement("div");
  wrapperSrc.id = "side_by_side_src";
  wrapperSrc.className = "pane";

  while (bodyElement.firstChild) {
    wrapperSrc.appendChild(bodyElement.firstChild);
  }
  bodyElement.appendChild(wrapperSrc);

  const wrapperDst = document.createElement("div");
  wrapperDst.id = "side_by_side_dst";
  wrapperDst.className = "pane";
  bodyElement.appendChild(wrapperDst);

  // Clone
  const clone = wrapperSrc.cloneNode(true);
  wrapperDst.appendChild(clone);

  // Container
  const container = document.createElement("div");
  container.id = "side_by_side_container";
  container.appendChild(wrapperSrc);
  container.appendChild(wrapperDst);
  bodyElement.appendChild(container);

  // CSS 挿入（styleタグにIDを付けておく）
  const style = document.createElement("style");
  style.id = "side_by_side_style_tag";
  style.textContent = generateStyleText(gridColumnsValue);
  document.head.appendChild(style);
}

/****************************************************
 * 3. 分割を取り除く (removeSideBySideContainer)
 ****************************************************/
function removeSideBySideContainer() {
  const container = document.getElementById("side_by_side_container");
  if (!container) return;

  // 左右分割を解除して、元のDOMをbodyに戻す
  const wrapperSrc = document.getElementById("side_by_side_src");
  if (wrapperSrc) {
    while (wrapperSrc.firstChild) {
      document.body.appendChild(wrapperSrc.firstChild);
    }
  }
  // wrapperDst は削除するだけでOK
  container.remove();

  // 追加した styleタグも削除
  const styleTag = document.getElementById("side_by_side_style_tag");
  if (styleTag) {
    styleTag.remove();
  }
}

/****************************************************
 * 4. 初期実行: ストレージから設定を読み込み
 ****************************************************/
chrome.storage.sync.get(["extensionEnabled", "gridAutoColumns"], (data) => {
  const isEnabled = data.extensionEnabled ?? true;
  const gridValue = data.gridAutoColumns || "100%";

  if (isEnabled) {
    splitPage(gridValue);
    translatePageChunked();
  }
});

/****************************************************
 * 2. ページ左右分割
 ****************************************************/
// function splitPage(gridColumnsValue) {
//   if (document.getElementById("side_by_side_container")) {
//     // 既に分割されている場合は何もしない
//     return;
//   }

//   const bodyElement = document.body;
//   const wrapperSrc = document.createElement("div");
//   wrapperSrc.id = "side_by_side_src";
//   wrapperSrc.className = "pane";
//   wrapperSrc.setAttribute("translate", "no");

//   while (bodyElement.firstChild) {
//     wrapperSrc.appendChild(bodyElement.firstChild);
//   }
//   bodyElement.appendChild(wrapperSrc);

//   const wrapperDst = document.createElement("div");
//   wrapperDst.id = "side_by_side_dst";
//   wrapperDst.className = "pane";
//   wrapperDst.setAttribute("translate", "yes");
//   bodyElement.appendChild(wrapperDst);

//   // Clone
//   const clone = wrapperSrc.cloneNode(true);
//   clone.id = "";
//   wrapperDst.appendChild(clone);

//   // Container
//   const container = document.createElement("div");
//   container.id = "side_by_side_container";
//   container.appendChild(wrapperSrc);
//   container.appendChild(wrapperDst);
//   bodyElement.appendChild(container);

//   // CSS
//   const style = document.createElement("style");
//   style.textContent = `
//     #side_by_side_container {
//       display: grid;
//       /* ここで storage から受け取った gridColumnsValue を適用 */
//       grid-auto-columns: ${gridColumnsValue};
//       grid-auto-flow: column;
//       column-gap: 1%;
//       margin: 0;
//       padding: 0;
//     }
//     .pane {
//       overflow: auto;
//       height: 100vh;
//     }
//   `;
//   document.head.appendChild(style);
// }

/****************************************************
 * 5. 段落をチャンク化する関数
 *   (例: 5段落ずつ翻訳)
 ****************************************************/
function chunkParagraphs(paragraphs, chunkSize = 5) {
  const chunks = [];
  let currentChunk = [];
  for (let i = 0; i < paragraphs.length; i++) {
    currentChunk.push(paragraphs[i]);
    // チャンクサイズに達するか、最後の段落になったら確定
    if (currentChunk.length === chunkSize || i === paragraphs.length - 1) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  }
  return chunks;
}

/****************************************************
 * 6. 小分け翻訳のメイン処理
 *   - 左側の各<p>を集める
 *   - 5段落ずつ等チャンクに分割
 *   - それぞれAPIに投げる
 *   - 翻訳結果を右側に反映
 ****************************************************/
async function translatePageChunked() {
  const srcDiv = document.getElementById("side_by_side_src");
  const dstDiv = document.getElementById("side_by_side_dst");
  if (!srcDiv || !dstDiv) {
    console.warn("サイドバイサイド領域が見つかりません。");
    return;
  }

  // 左側の段落リスト
  const srcParagraphs = Array.from(srcDiv.querySelectorAll("p"));
  if (srcParagraphs.length === 0) {
    console.log("翻訳対象の段落がありません。");
    return;
  }

  // 右側の段落リスト
  const dstParagraphs = Array.from(dstDiv.querySelectorAll("p"));
  // 右側の方が構造上、段落数は同数なはずですが、念のため一致チェック
  if (dstParagraphs.length !== srcParagraphs.length) {
    console.warn(
      "段落数が左右で一致しません。処理を続行しますが翻訳結果がズレる場合があります。"
    );
  }

  // 5段落ずつチャンクに分割
  const chunkSize = 5; // 必要に応じて調整
  const paragraphChunks = chunkParagraphs(srcParagraphs, chunkSize);

  // 各チャンクごとに翻訳
  for (let i = 0; i < paragraphChunks.length; i++) {
    const chunk = paragraphChunks[i];
    // チャンク全体のテキストを1つにまとめる
    const chunkText = chunk.map((p) => p.innerText).join("\n\n");

    // ChatGPT API呼び出し
    let translatedChunkText = "";
    try {
      translatedChunkText = await callChatGPTAPI(chunkText);
    } catch (err) {
      console.error("翻訳エラー:", err);
      // 失敗した場合のテキスト
      translatedChunkText = "翻訳に失敗しました";
    }

    // 翻訳結果を段落ごとに分割し、なるべく元の段落数に合わせて割り当て
    // まずは単純に「改行で区切る→不足分は最後の段落に詰める」などの実装例
    const splitted = translatedChunkText.split(/\n+/);
    // splitted.length と chunk.length が合わないこともあるので調整
    for (let j = 0; j < chunk.length; j++) {
      const originalIndex = srcParagraphs.indexOf(chunk[j]);
      // 右側の段落を同じindexで取得
      if (originalIndex >= 0 && originalIndex < dstParagraphs.length) {
        dstParagraphs[originalIndex].innerText =
          splitted[j] || splitted[splitted.length - 1] || "";
      }
    }
  }
}

/****************************************************
 * 7. ChatGPT API呼び出し
 ****************************************************/
async function callChatGPTAPI(text) {
  const apiUrl = "https://api.openai.com/v1/chat/completions";

  const systemPrompt =
    "You are a professional translator that translates text into Japanese.";
  // ※ 実際は言語自動判定など細かく指示したい場合はもっと詳しく書く

  const requestBody = {
    model: "gpt-3.5-turbo-1106",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.0,
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(
      `ChatGPT API Error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const translated = data?.choices?.[0]?.message?.content?.trim();
  return translated || "";
}

/****************************************************
 * 8. メイン処理
 *    拡張機能が有効かどうか確認してから動かす
 ****************************************************/
chrome.storage.sync.get(["extensionEnabled", "gridAutoColumns"], (data) => {
  const isEnabled = data.extensionEnabled ?? true; // デフォルトtrue
  const gridValue = data.gridAutoColumns || "100%"; // デフォルト"100%"

  if (!isEnabled) {
    // 無効なら何もせず終了
    console.log("[Side by Side] 拡張機能はOFFのため、処理を実行しません。");
    return;
  }

  // ここから有効の場合の処理
  console.log("[Side by Side] 拡張機能をONとして実行します。");

  // ページ分割 (gridValue を渡す)
  splitPage(gridValue);

  // チャンク翻訳
  translatePageChunked();
});
