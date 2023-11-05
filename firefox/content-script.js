"use strict";
(() => {
  // firefox/content-script.ts
  console.log("Hello, I'm content script!");
  function getAllTextInPage() {
    return document.body.innerText;
  }
  browser.runtime.onMessage.addListener((message) => {
    console.log(message);
    browser.runtime.sendMessage({
      type: "from-content",
      data: "Hello from content.js!"
    });
    if (message.type === "get-page-innerText") {
      browser.runtime.sendMessage({
        type: "page-innerText",
        data: getAllTextInPage()
      });
    }
  });
})();
