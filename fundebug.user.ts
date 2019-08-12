// ==UserScript==
// @name         隐藏fundebug
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  隐藏过期弹窗
// @author       SPM
// @match        https://www.fundebug.com/*
// @grant        none
// ==/UserScript==

(function() {
  "use strict";
  setTimeout(() => {
    (<HTMLDivElement>(
      document.getElementsByClassName("Modal")[0]
    )).style.display = "none";
  }, 1000);
  // Your code here...
})();
