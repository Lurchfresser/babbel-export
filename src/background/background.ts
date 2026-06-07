chrome.runtime.onMessage.addListener(
  (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ) => {
    if (message && (message as any).type === "EXPORT_FROM_BABBEL") {
      console.log("Received export request from popup");
      sendResponse({ ok: true });
    }
    return true;
  },
);
