console.log("✅ Background.js service worker started!");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📩 Received message in background:", message);

  if (message.action === "getExplanation") {
    const codeSnippet = message.code;
    const BACKEND_URL = "http://127.0.0.1:5000/api/explain";

    (async () => {
      try {
        console.log("Sending request to backend...");
        const response = await fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeSnippet })
        });

        const data = await response.json();

        if (!response.ok) 
          throw new Error(data.error || `Server error ${response.status}`);

        if (data.error)
          throw new Error(data.error);

        console.log("Explanation received:", data.explanation);
        sendResponse({ explanation: data.explanation });

      } catch (error) {
        console.error("Error fetching explanation:", error);

        let msg = error.message;
        if (msg.includes("Failed to fetch")) {
          msg = "❌ Cannot connect to backend. Is Python server running?";
        }

        sendResponse({ explanation: msg });
      }
    })();

    return true; // keep async channel alive
  }
});
