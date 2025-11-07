// Listen for a message from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getExplanation') {
    const codeSnippet = message.code;

    // --- THIS IS OUR MOCK AI ---
    // In the future, we will replace this with a real API call
    console.log("Background script received code:", codeSnippet.substring(0, 50) + "...");
    
    const mockExplanation = `This is a mock AI explanation for the code snippet that starts with: "${codeSnippet.substring(0, 30)}..."`;

    // Simulate a network delay
    setTimeout(() => {
      sendResponse({ explanation: mockExplanation });
    }, 800);
    // ----------------------------

    // IMPORTANT: Return true to indicate you will send a response asynchronously
    return true; 
  }
});
