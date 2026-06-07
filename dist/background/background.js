"use strict";
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === "EXPORT_FROM_BABBEL") {
        console.log("Received export request from popup");
        sendResponse({ ok: true });
    }
    return true;
});
