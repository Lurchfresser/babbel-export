"use strict";
(function () {
    function extractData() {
        return { hello: "world" };
    }
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg && msg.type === "RUN_EXTRACTION") {
            const data = extractData();
            sendResponse({ ok: true, data });
        }
    });
})();
