(function () {
  function extractData() {
    return { hello: "world" };
  }

  chrome.runtime.onMessage.addListener(
    (
      msg: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void,
    ) => {
      if (msg && (msg as any).type === "RUN_EXTRACTION") {
        const data = extractData();
        sendResponse({ ok: true, data });
      }
    },
  );
})();
