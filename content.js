console.log("Code Explainer content script loaded.");

// Create the tooltip UI element
const tooltip = document.createElement('div');
tooltip.id = 'code-explainer-tooltip';
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

// Find all <pre> code blocks
const codeBlocks = document.querySelectorAll('pre');

codeBlocks.forEach(block => {
  block.style.cursor = 'help';

  block.addEventListener('mouseover', (e) => {
    const code = block.innerText;
    console.log("Selected code:", code);

    tooltip.innerText = "Loading AI explanation...";
    positionTooltip(e);

    chrome.runtime.sendMessage(
      { action: 'getExplanation', code: code },
      (response) => {
        if (chrome.runtime.lastError) {
          tooltip.innerText = "Error: Could not get explanation.";
        } else {
          tooltip.innerText = 
            "CODE:\n" + code + 
            "\n\nEXPLANATION:\n" + response.explanation;
        }

        positionTooltip(e);
      }
    );
  });

  block.addEventListener('mouseout', () => {
    tooltip.style.display = "none";
  });
});

// Position tooltip near mouse
function positionTooltip(e) {
  tooltip.style.left = `${e.pageX + 15}px`;
  tooltip.style.top = `${e.pageY + 15}px`;
  tooltip.style.display = "block";
}
