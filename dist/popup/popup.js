"use strict";
const statusBox = document.getElementById("statusBox");
const statusIcon = document.getElementById("statusIcon");
const statusText = document.getElementById("statusText");
const exportBtn = document.getElementById("exportBtn");
const btnContent = document.getElementById("btnContent");
const startAtFirstPageCheckbox = document.getElementById("startAtFirstPage");
function setStatus(type, icon, title, detail) {
    statusBox.className = "status-box" + (type ? " " + type : "");
    statusIcon.textContent = icon;
    statusText.innerHTML = `<strong>${title}</strong>${detail || ""}`;
}
// Check current tab on load
(async function init() {
    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (!tab || !tab.url || !tab.url.includes("babbel.com")) {
            setStatus("error", "🚫", "Wrong page", "Please open your Babbel vocabulary list first.");
            return;
        }
        const tabId = typeof tab.id === "number" ? tab.id : undefined;
        if (typeof tabId !== "number") {
            setStatus("error", "⚠️", "Error", "Could not determine active tab id.");
            return;
        }
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: checkVocabPage,
            });
            const isVocabPage = results && results[0] && results[0].result;
            if (!isVocabPage) {
                setStatus("error", "📭", "No vocabulary found", "Make sure you're on a Babbel vocabulary list page.");
            }
            else {
                setStatus("success", "📚", "Vocabulary found", "Ready to extract all vocabulary to Anki CSV.");
                exportBtn.disabled = false;
            }
        }
        catch (e) {
            setStatus("error", "⚠️", "Error", "Could not read the page. Try refreshing.");
        }
    }
    catch (e) {
        setStatus("error", "⚠️", "Error", "Could not access tabs API.");
    }
})();
// Export button click
exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    btnContent.innerHTML = '<span class="loading"></span> Exporting…';
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab && typeof tab.id === "number" ? tab.id : undefined;
    if (typeof tabId !== "number") {
        setStatus("error", "⚠️", "Export failed", "Could not determine active tab id.");
        exportBtn.disabled = false;
        btnContent.textContent = "Export to CSV";
        return;
    }
    try {
        const goToFirst = !!(startAtFirstPageCheckbox && startAtFirstPageCheckbox.checked);
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: extractAllVocab,
            args: [goToFirst],
        });
        const rows = (results &&
            results[0] &&
            results[0].result);
        if (!rows || rows.length === 0) {
            setStatus("error", "📭", "No data extracted", "Try refreshing the page and trying again.");
            exportBtn.disabled = false;
            btnContent.textContent = "Export to CSV";
            return;
        }
        downloadCSV(rows, tab);
        setStatus("success", "✅", `Exported ${rows.length} word${rows.length !== 1 ? "s" : ""}!`, "CSV downloaded. Import it into Anki via File → Import.");
        btnContent.textContent = "Export to CSV";
        exportBtn.disabled = false;
    }
    catch (e) {
        setStatus("error", "⚠️", "Export failed", e && e.message ? e.message : "Unknown error.");
        btnContent.textContent = "Export to CSV";
        exportBtn.disabled = false;
    }
});
// ── Functions injected into the page ───────────────────────────────────────
function checkVocabPage() {
    return (document.querySelectorAll("tr[data-testid^='learned-item-row']").length > 0);
}
async function extractAllVocab(goToFirst) {
    const delay = (ms) => new Promise((res) => setTimeout(res, ms));
    const data = [];
    const seen = new Set();
    // Optional: go to first page if pagination exists and user requested it
    const firstPageBtn = document.querySelector('li[data-testid="all-items-list-footer-paginator-link-first"] button');
    if (goToFirst && firstPageBtn && !firstPageBtn.disabled) {
        firstPageBtn.click();
        await delay(1500); // Wait for page load
    }
    while (true) {
        const rows = document.querySelectorAll("tr[data-testid^='learned-item-row']");
        rows.forEach((row) => {
            const learnEl = row.querySelector("[data-testid^='learned-item-row-learn-text']");
            const displayEl = row.querySelector("[data-testid^='learned-item-row-display-text']");
            if (learnEl && displayEl) {
                const front = (learnEl.textContent || "").trim();
                const back = (displayEl.textContent || "").trim();
                if (front && back) {
                    const key = front + "|||" + back;
                    if (!seen.has(key)) {
                        seen.add(key);
                        data.push({ front, back });
                    }
                }
            }
        });
        const nextBtn = document.querySelector('li[data-testid="all-items-list-footer-paginator-link-next"] button');
        if (!nextBtn || nextBtn.disabled) {
            break;
        }
        nextBtn.click();
        await delay(1500); // Wait for next page to load
    }
    return data;
}
// ── CSV download helper ─────────────────────────────────────────────────────
function escapeCSV(str) {
    if (/[",\n\r]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}
function downloadCSV(rows, tab) {
    const lines = rows.map(({ front, back }) => escapeCSV(front) + ";" + escapeCSV(back));
    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const pageTitle = (tab.title || "babbel-vocab")
        .replace(/[^a-zA-Z0-9äöüÄÖÜß\- ]/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .substring(0, 50);
    const filename = `babbel_${pageTitle}_${rows.length}words.csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
