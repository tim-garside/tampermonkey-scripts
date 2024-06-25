// ==UserScript==
// @name         Selection to Block
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  To accommodate for the removal of the 'Selection to Block' functionality in CidiLabs Sidebar. This wraps the selected text in a div with class 'dp-content-block' when the button is clicked
// @author       Tim Garside
// @match        https://canvas.newcastle.edu.au/courses/*/pages/*/edit
// @match        https://canvas.newcastle.edu.au/courses/*/pages
// @updateURL    https://github.com/tim-garside/tampermonkey-scripts/raw/main/Selection%20to%20Block.user.js
// @downloadURL  https://github.com/tim-garside/tampermonkey-scripts/raw/main/Selection%20to%20Block.user.js
// @grant        none
// ==/UserScript==

(function() {
	'use strict';
	// Custom classes
	const classDPWrapper = "dp-wrapper"; // Customise as required.
	const classUONTheme = "kl_uon"; // Customise as required.
	const classDPContentBlock = "dp-content-block"; // Customise as required.
	const classDPHeader = "dp-header"; //Customise as required.
	const classDPHeading = "dp-heading" //Customise as required.
	const classDPHeaderPre = `${classDPHeader}-pre` //Customise as required.
	const classDPHeaderTitle = `${classDPHeader}-title` //Customise as required.

	// Function to create and style the button
	function createButton() {
		console.log('Button Created')
		const button = document.createElement('button');
		button.setAttribute('aria-label', 'Selection to Block');
		button.setAttribute('title', 'Selection to Block');
		button.setAttribute('type', 'button');
		button.setAttribute('tabindex', '-1');
		button.className = 'tox-tbtn';
		button.setAttribute('aria-disabled', 'false');
		// Insert SVG icon as inner HTML
		button.innerHTML = `
        <svg fill="#2D3B45" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
	 width="16px" height="16px" viewBox="0 0 385.419 385.419"
	 xml:space="preserve">
<g>
	<path d="M188.998,331.298l-0.231-107.449l-92.494-53.907L3.946,223.654l0.225,108.29l92.102,53.475L188.998,331.298z
		 M105.656,358.292l0.165-75.232l64.289-37.558l0.165,75.067L105.656,358.292z M96.26,191.586l64.603,37.658l-64.384,37.606
		L31.874,229.05L96.26,191.586z M22.703,245.356l64.411,37.691l-0.164,75.335l-64.092-37.217L22.703,245.356z"/>
	<path d="M288.748,169.948l-92.324,53.706l0.231,108.29l92.104,53.475l92.714-54.121l-0.231-107.449L288.748,169.948z
		 M288.735,191.586l64.605,37.658l-64.386,37.606l-64.606-37.801L288.735,191.586z M215.179,245.356l64.404,37.691l-0.164,75.335
		l-64.076-37.217L215.179,245.356z M298.137,358.292l0.159-75.232l64.289-37.558l0.164,75.067L298.137,358.292z"/>
	<path d="M285.216,53.892L192.719,0l-92.324,53.697l0.222,108.295l92.102,53.479l92.717-54.121L285.216,53.892z M192.707,21.635
		l64.609,37.649l-64.384,37.619l-64.609-37.811L192.707,21.635z M119.149,75.401l64.411,37.698l-0.161,75.335l-64.095-37.211
		L119.149,75.401z M202.099,188.343l0.162-75.234l64.292-37.564l0.164,75.073L202.099,188.343z"/>
</g>
</svg>
    `;

		return button;
	}


	// Function to check if an element is within a parent with a specific ID
	function isWithinElementWithId(element, id) {
		while (element) {
			if (element.id === id) {
				return true;
			}
			element = element.parentElement;
		}
		return false;
	}
	// Checks for HTML within selection
	function isHTML(str) {
		var doc = new DOMParser().parseFromString(str, "text/html");
		return Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
	}

	// Function to wrap the selected text in a div with class 'dp-content-block' and an additional div if necessary
	function wrapSelectedText() {
		const iframe = document.getElementById('wiki_page_body_ifr');
		if (!iframe) {
			console.error('Target iframe not found');
			return;
		}

		const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
		const selection = iframeDocument.getSelection();
		if (!selection.rangeCount) return;

		const range = selection.getRangeAt(0);
		const selectedText = range.extractContents();
		// Check if the selection is already contained within any HTML element
		let containsHtml = false;
		containsHtml = isHTML(selectedText);

		let dpWrapper = iframeDocument.getElementById(classDPWrapper);
		if (!dpWrapper) {
			dpWrapper = iframeDocument.createElement('div');
			dpWrapper.id = classDPWrapper;
			dpWrapper.className = `${classDPWrapper} ${classUONTheme}`;

			const pageTitle = document.getElementById('wikipage-title-input').value || 'Untitled';

			const header = iframeDocument.createElement('header');
			header.className = classDPHeader;

			const h2 = iframeDocument.createElement('h2');
			h2.className = classDPHeading;

			const spanPre = iframeDocument.createElement('span');
			spanPre.className = classDPHeaderPre;

			const spanPre1 = iframeDocument.createElement('span');
			spanPre1.className = `${classDPHeaderPre}-1`;
			spanPre1.textContent = 'Name ';

			const spanPre2 = iframeDocument.createElement('span');
			spanPre2.className = `${classDPHeaderPre}-2`;
			spanPre2.textContent = '## ';

			spanPre.appendChild(spanPre1);
			spanPre.appendChild(spanPre2);

			const spanTitle = iframeDocument.createElement('span');
			spanTitle.className = classDPHeaderTitle;
			spanTitle.textContent = pageTitle;

			h2.appendChild(spanPre);
			h2.appendChild(spanTitle);

			header.appendChild(h2);

			dpWrapper.appendChild(header);

			iframeDocument.body.appendChild(dpWrapper);
		}

		const dpContentBlock = iframeDocument.createElement('div');
		dpContentBlock.className = classDPContentBlock;
		// Wrap in paragraph if not already contained within HTML
		if (!containsHtml) {
			const paragraph = iframeDocument.createElement('p');
			paragraph.appendChild(selectedText);
			dpContentBlock.appendChild(paragraph);
		} else {
			// If already contained within HTML, simply insert back the selected contents
			dpContentBlock.appendChild(selectedText);
		}
		//dpContentBlock.appendChild(selectedText);

		dpWrapper.appendChild(dpContentBlock);

		// Clear the selection
		selection.removeAllRanges();
	}

	// Function to create the Quick Fixes toolbar
	function createQuickFixesToolbar() {
		const quickFixesToolbar = document.createElement('div');
		quickFixesToolbar.setAttribute('title', 'Quick Fixes');
		quickFixesToolbar.setAttribute('role', 'toolbar');
		quickFixesToolbar.setAttribute('data-alloy-tabstop', 'true');
		quickFixesToolbar.setAttribute('tabindex', '-1');
		quickFixesToolbar.className = 'tox-toolbar__group';
		return quickFixesToolbar;
	}

	// Inject the button into the Quick Fixes toolbar
	function injectButton(quickFixesToolbar) {
		if (quickFixesToolbar && !quickFixesToolbar.querySelector('.tox-tbtn[title="Selection to Block"]')) {
			const button = createButton();
			button.addEventListener('click', wrapSelectedText);
			quickFixesToolbar.appendChild(button);
		}
	}

	// Create a MutationObserver to observe changes in the document
	const observer = new MutationObserver((mutationsList, observer) => {
		for (let mutation of mutationsList) {
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach(node => {
					if (node.nodeType === 1 && node.matches('div.tox-toolbar__group[title="Miscellaneous"]')) {
						const quickFixesToolbar = createQuickFixesToolbar();
						node.parentNode.insertBefore(quickFixesToolbar, node.nextSibling);
						injectButton(quickFixesToolbar);
					}
				});
			}
		}
	});

	// Start observing the document for changes
	observer.observe(document.body, { childList: true, subtree: true });

	// Check if the target div is already present in the document
	const existingToolbarDiv = document.querySelector('div.tox-toolbar__group[title="Miscellaneous"]');
	if (existingToolbarDiv) {
		const quickFixesToolbar = createQuickFixesToolbar();
		existingToolbarDiv.parentNode.insertBefore(quickFixesToolbar, existingToolbarDiv.nextSibling);
		injectButton(quickFixesToolbar);
	}

})();
