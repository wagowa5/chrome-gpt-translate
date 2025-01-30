document.addEventListener("DOMContentLoaded", () => {
  const toggleExtension = document.getElementById("toggleExtension");
  const gridColumnsInput = document.getElementById("gridColumns");

  // 初期表示: storage から設定を読み込んでUIに反映
  chrome.storage.sync.get(["extensionEnabled", "gridAutoColumns"], (data) => {
    toggleExtension.checked = data.extensionEnabled ?? true;
    gridColumnsInput.value = data.gridAutoColumns || "100%";
  });

  // 拡張機能のON/OFFを切り替えたら、storageに保存しつつコンテンツスクリプトにも通知
  toggleExtension.addEventListener("change", () => {
    const newValue = toggleExtension.checked;
    chrome.storage.sync.set({ extensionEnabled: newValue }, () => {
      // 保存完了後、現在のタブへメッセージ送信
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "UPDATE_SETTINGS",
          extensionEnabled: newValue,
          gridAutoColumns: gridColumnsInput.value
        });
      });
    });
  });

  // grid-auto-columns 値変更時にも同様に保存＆通知
  gridColumnsInput.addEventListener("change", () => {
    const newGridValue = gridColumnsInput.value;
    chrome.storage.sync.set({ gridAutoColumns: newGridValue }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "UPDATE_SETTINGS",
          extensionEnabled: toggleExtension.checked,
          gridAutoColumns: newGridValue
        });
      });
    });
  });
});

