console.log("Code Explainer content script loaded.");

// 1. Create the tooltip UI element
const tooltip = document.createElement('div');
tooltip.id = 'code-explainer-tooltip';
document.body.appendChild(tooltip);

// 2. Find all code blocks to make them "explainable"
// On GitHub, code is often in <pre> tags
const codeBlocks = document.querySelectorAll('pre');

// 3. Add event listeners to each code block
codeBlocks.forEach(block => {
  block.style.cursor = 'help'; // Change cursor to '?'

  block.addEventListener('mouseover', (e) => {
    // Get the code text
    const code = block.innerText;

    // Show "Loading..." in the tooltip
    tooltip.innerText = 'Loading AI explanation...';
    positionAndShowTooltip(e);

    // 4. Send the code to the background script
    chrome.runtime.sendMessage(
      { action: 'getExplanation', code: code },
      (response) => {
        // 5. This is the callback function. It runs when the background script replies.
        if (chrome.runtime.lastError) {
          // Handle errors (e.g., if background script is broken)
          tooltip.innerText = 'Error: Could not get explanation.';
          console.error(chrome.runtime.lastError.message);
        } else {
          // Success! Show the explanation (or error) from the backend
          tooltip.innerText = response.explanation;
        }
        
        // Re-position in case content reflowed (e.g., long explanation)
        positionAndShowTooltip(e);
      }
    );
  });

  block.addEventListener('mouseout', () => {
    // Hide the tooltip
    tooltip.style.display = 'none';
  });
});

// Helper function to position the tooltip near the mouse
function positionAndShowTooltip(e) {
  // e.pageX and e.pageY give the mouse position relative to the document
  tooltip.style.left = `${e.pageX + 15}px`;
  tooltip.style.top = `${e.pageY + 15}px`;
  tooltip.style.display = 'block';
}
