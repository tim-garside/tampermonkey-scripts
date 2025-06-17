// ==UserScript==
// @name         Copilot Message Exporter - RCP
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Exports Copilot messages formatted for Rapid Course Prototypes
// @author       You
// @match        https://m365.cloud.microsoft/chat/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cloud.microsoft
// @updateURL    https://github.com/tim-garside/tampermonkey-scripts/raw/main/Copilot%20Message%20Exporter%20-%20RCP.user.js
// @downloadURL  https://github.com/tim-garside/tampermonkey-scripts/raw/main/Copilot%20Message%20Exporter%20-%20RCP.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Inject button into first navBarPolishedContainerNewHeader
    function injectExportButton() {
        if (document.querySelector("#export-copilot-to-word")) return;

        const nav = document.querySelector('div[class^="navBarPolishedContainerNewHeader"]');
        if (!nav) return;

        const button = document.createElement('button');

        button.id = "export-copilot-to-word";
        button.style.background = "#3E45C9";
        button.style.color = "#ffffff";
        button.style.border = "none";
        button.style.cursor = "pointer";
        button.style.borderRadius = "5px";

        // Create SVG icon
        const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgIcon.setAttribute("width", "24");
        svgIcon.setAttribute("height", "24");
        svgIcon.setAttribute("viewBox", "0 0 24 24");
        svgIcon.setAttribute("fill", "none");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill-rule", "evenodd");
        path.setAttribute("clip-rule", "evenodd");
        path.setAttribute("d", "M12 3C12.5523 3 13 3.44772 13 4V13.5858L15.2929 11.2929C15.6834 10.9024 16.3166 10.9024 16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L7.29289 12.7071C6.90237 12.3166 6.90237 11.6834 7.29289 11.2929C7.68342 10.9024 8.31658 10.9024 8.70711 11.2929L11 13.5858V4C11 3.44772 11.4477 3 12 3ZM5 17C5.55228 17 6 17.4477 6 18V19C6 19.5523 6.44772 20 7 20H17C17.5523 20 18 19.5523 18 19V18C18 17.4477 18.4477 17 19 17C19.5523 17 20 17.4477 20 18V19C20 20.6569 18.6569 22 17 22H7C5.34315 22 4 20.6569 4 19V18C4 17.4477 4.44772 17 5 17Z");
        path.setAttribute("fill", "currentColor");

        svgIcon.appendChild(path);

        // Add icon and text to button
        button.appendChild(svgIcon);
        //button.appendChild(document.createTextNode('Export to Word'));



        button.addEventListener('click', exportToWord);
        nav.prepend(button);
    }

    function extractMessages() {
        const messages = [];

        // First find the index of first message with H2
        const allMessages = Array.from(document.querySelectorAll('div[id^="chatMessageResponse"]'));

        let startIdx = allMessages.findIndex(el => el.querySelector('h2'));

        if (startIdx < 0) {
            // If no H2 at all, we ignore everything
            return messages;
        }

        for (let i = startIdx; i < allMessages.length; i++) {
            const el = allMessages[i];
            let content = el.querySelector('div > div')?.innerHTML?.trim();

            if (!content) continue;

            // Trim everything before first H2
            const firstH2 = el.querySelector('h2');
            if (firstH2) {
                // find H2's parent’s outerHTML or its index in content
                const h2Pos = content.indexOf(firstH2.outerHTML);
                if (h2Pos !== -1) {
                    content = content.slice(h2Pos);
                }
            }

            // Trim everything after last <hr>
            const lastHr = el.querySelectorAll('hr');
            if (lastHr.length > 0) {
                const lastHrPos = content.lastIndexOf('<hr');
                if (lastHrPos !== -1) {
                    content = content.slice(0, lastHrPos + 4);
                }
            }

            messages.push(content.trim());
        }

        // Combine messages with page break in-between
        return messages.reduce((acc, msg, idx) => {
            if (idx > 0) {
                acc +='<br style="page-break-before:always">';
            }
            return acc + "<div>" + msg + "</div>";
        }, '');
    }



    function Export2Word(texts, filename = 'Rapid Course Prototype.doc') {
        const head = "<head><meta charset='utf-8'></head>";
        const body = "<body>" + texts.map(t => "<div>" + t + "</div>").join("") + "</body>";
        const html = "<html>" + head + body + "</html>";

        const blob = new Blob(['\ufeff', html], { type:'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
    }


    function exportToWord() {
        const messages = extractMessages();

        if (messages) {
            Export2Word([messages]);
        } else {
            alert("No messages found.");
        }
    }


    // Run injection periodically
    setInterval(injectExportButton, 1000);
})();
