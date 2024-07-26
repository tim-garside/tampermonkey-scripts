// ==UserScript==
// @name         Strawpoll Canvas Embed
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Modifies the embed code on Strawpoll, adds a custom button, and copies to clipboard
// @match        https://strawpoll.com/*
// @grant        none
// @updateURL    https://github.com/tim-garside/tampermonkey-scripts/raw/main/Strawpoll%20Canvas%20Embed.user.js
// @downloadURL  https://github.com/tim-garside/tampermonkey-scripts/raw/main/Strawpoll%20Canvas%20Embed.user.js
// ==/UserScript==

(function() {
    'use strict';

    function modifyEmbedCode() {
        const embedDiv = document.querySelector('div[x-data="pollEmbed()"]');
        if (!embedDiv) return;

        const textarea = embedDiv.querySelector('textarea[x-model="embedCode"]');
        if (!textarea) return;

        const existingButton = embedDiv.querySelector('button');
        if (!existingButton) return;

        // Check if we've already added our custom button
        if (embedDiv.querySelector('#customEmbedButton')) return;

        // Create and inject the custom button
        const customButton = document.createElement('button');
        customButton.textContent = 'Create Canvas Embed';
        customButton.className = 'button is-primary';
        customButton.id = 'customEmbedButton';  // Add an id for easy checking
        customButton.style.marginLeft = '10px';
        existingButton.parentNode.insertBefore(customButton, existingButton.nextSibling);

        customButton.addEventListener('click', function() {
            let embedCode = textarea.value;

            // Remove script tags
            embedCode = embedCode.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

            // Wrap the remaining code in a div with class "dp-embed-wraper"
            embedCode = `<div class="dp-embed-wrapper">${embedCode}</div>`;

            // Copy the new embed code to clipboard
            navigator.clipboard.writeText(embedCode).then(function() {
                // Show alert that the code has been copied
                alert('Canvas embed code has been copied to clipboard! \nYou may need to adjust the height to suit your poll.');
            }).catch(function(err) {
                console.error('Failed to copy text: ', err);
                alert('Failed to copy embed code. Please try again.');
            });
        });
    }

    // Create a MutationObserver instance
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                const embedDiv = document.querySelector('div[x-data="pollEmbed()"]');
                if (embedDiv) {
                    modifyEmbedCode();
                }
            }
        });
    });

    // Configuration of the observer
    const config = { childList: true, subtree: true };

    // Start observing the document body for DOM changes
    observer.observe(document.body, config);
})();
