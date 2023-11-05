"use strict";
(() => {
  // firefox/popup/popup.ts
  console.log("Hello, I'm popup script!");
  var API_KEY = "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";
  function makePrompt(text) {
    return `I am a B1 level English reader,
please help me analyze the words or phrases in the following paragraph that I may not understand and translate these phrases into Chinese.
The result should include: source content, origin language, target language, translate result.
\`\`\`
${text}
\`\`\``;
  }
  async function findDifficultWords(text, cb) {
    const match = text.match(/(.{1,3200})/g);
    if (!match) {
      return;
    }
    let arr = Array.from(match);
    arr = arr.length > 5 ? arr.slice(0, 5) : arr;
    console.log(`Array length is ${arr.length}`);
    for (const text2 of arr) {
      const result = await doFindDifficultWords(text2).catch((e) => {
        dispatchToActiveTab({
          type: "error",
          data: e
        });
        return String(e);
      });
      cb({ result });
    }
    return;
  }
  async function doFindDifficultWords(text) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      }),
      body: JSON.stringify({
        "model": "gpt-3.5-turbo",
        "messages": [
          {
            "role": "user",
            "content": `${makePrompt(text)}`
          }
        ]
      })
    });
    const json = await res.json();
    return json.choices[0]?.message.content ?? "";
  }
  function setTitle(status) {
    const title = document.getElementById("title");
    if (!title) {
      return;
    }
    title.innerText = status;
  }
  function setContent(text) {
    const content = document.getElementById("content");
    if (!content) {
      return;
    }
    for (const sentence of text.split("\n")) {
      const p = document.createElement("p");
      p.innerText = sentence;
      content.appendChild(p);
    }
  }
  async function dispatchToActiveTab(message) {
    const activeTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
    const id = activeTab?.id;
    if (!id) {
      return;
    }
    browser.tabs.sendMessage(id, message);
  }
  async function main() {
    browser.runtime.onMessage.addListener(async (message) => {
      console.log("popup receive message:");
      console.log(message);
      if (message.type === "page-innerText") {
        setTitle("Loading" /* Loading */);
        await findDifficultWords(message.data, ({ result }) => {
          setContent(result);
          dispatchToActiveTab({
            type: "get-copilot-result",
            data: result
          });
        });
        setTitle("Finish" /* Finish */);
      }
    });
    dispatchToActiveTab({
      type: "from-background",
      data: "Hello from background!"
    });
    dispatchToActiveTab({
      type: "get-page-innerText",
      data: "Hello from background!"
    });
  }
  main();
})();
