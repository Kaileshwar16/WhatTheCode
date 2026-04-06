console.log("Code Explainer content script loaded.");

const tooltip = document.createElement("div");
tooltip.id = "code-explainer-tooltip";
tooltip.style.position = "absolute";
tooltip.style.background = "#111";
tooltip.style.color = "white";
tooltip.style.padding = "10px";
tooltip.style.borderRadius = "8px";
tooltip.style.whiteSpace = "pre-wrap";
tooltip.style.maxWidth = "400px";
tooltip.style.fontSize = "13px";
tooltip.style.zIndex = "999999";
tooltip.style.display = "none";
document.body.appendChild(tooltip);

// Cache: avoid calling API for the same code twice
const explanationCache = new Map();

// Debounce timer
let hoverTimer = null;

function findCodeBlocks() {
  return document.querySelectorAll(`
    pre,
    code,
    .blob-code,
    .blob-code-inner,
    .js-file-line,
    table.highlight td
  `);
}

function attachListeners() {
  const blocks = findCodeBlocks();
  blocks.forEach(block => {
    if (block.dataset.explainerAttached) return;
    block.dataset.explainerAttached = "true";
    block.style.cursor = "help";

    block.addEventListener("mouseover", (e) => {
      const code = block.innerText.trim();
      if (!code) return;

      // Clear any existing pending request
      clearTimeout(hoverTimer);

      // Wait 500ms before firing — prevents spamming on fast mouse movement
      hoverTimer = setTimeout(() => {
        // Serve from cache if available
        if (explanationCache.has(code)) {
          tooltip.innerText = `CODE:\n${code}\n\nEXPLANATION:\n${explanationCache.get(code)}`;
          positionTooltip(e);
          return;
        }

        tooltip.innerText = "Loading AI explanation...";
        positionTooltip(e);

        chrome.runtime.sendMessage(
          { action: "getExplanation", code },
          (response) => {
            if (response?.explanation) {
              explanationCache.set(code, response.explanation);
              tooltip.innerText = `CODE:\n${code}\n\nEXPLANATION:\n${response.explanation}`;
              positionTooltip(e);
            }
          }
        );
      }, 500);
    });

    block.addEventListener("mouseout", () => {
      clearTimeout(hoverTimer); // cancel pending request if mouse left early
      tooltip.style.display = "none";
    });
  });
}

attachListeners();

const observer = new MutationObserver(() => attachListeners());
observer.observe(document.body, { childList: true, subtree: true });

function positionTooltip(e) {
  tooltip.style.left = `${e.pageX + 15}px`;
  tooltip.style.top = `${e.pageY + 15}px`;
  tooltip.style.display = "block";
}
