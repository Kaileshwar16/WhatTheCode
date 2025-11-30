console.log("Code Explainer content script loaded.");

// Create tooltip
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

// 👇👇 THIS IS WHERE YOUR NEW SELECTOR GOES 👇👇
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

// Attach listeners to all GitHub code blocks
function attachListeners() {
  const blocks = findCodeBlocks();

  blocks.forEach(block => {
    if (block.dataset.explainerAttached) return;
    block.dataset.explainerAttached = "true";

    block.style.cursor = "help";

    block.addEventListener("mouseover", (e) => {
      const code = block.innerText.trim();
      if (!code) return;

      tooltip.innerText = "Loading AI explanation...";
      positionTooltip(e);

      chrome.runtime.sendMessage(
        { action: "getExplanation", code },
        (response) => {
          tooltip.innerText = `CODE:\n${code}\n\nEXPLANATION:\n${response.explanation}`;
          positionTooltip(e);
        }
      );
    });

    block.addEventListener("mouseout", () => {
      tooltip.style.display = "none";
    });
  });
}

// Run immediately
attachListeners();

// GitHub loads pages dynamically → MUST watch DOM updates
const observer = new MutationObserver(() => attachListeners());
observer.observe(document.body, { childList: true, subtree: true });

// Position tooltip
function positionTooltip(e) {
  tooltip.style.left = `${e.pageX + 15}px`;
  tooltip.style.top = `${e.pageY + 15}px`;
  tooltip.style.display = "block";
}
