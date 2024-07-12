// ==UserScript==
// @name         Selection to Block
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  To accommodate for the removal of the 'Selection to Block' functionality in CidiLabs Sidebar. This wraps the selected text in a div with class 'dp-content-block' when the button is clicked
// @author       Tim Garside
// @match        https://canvas.newcastle.edu.au/courses/*/pages/*/edit
// @match        https://canvas.newcastle.edu.au/courses/*/pages
// @match        https://canvas.newcastle.edu.au/courses/*/discussion_topics/*/edit
// @match        https://canvas.newcastle.edu.au/courses/*/discussion_topics/new
// @match        https://canvas.newcastle.edu.au/courses/*/assignments/*/edit
// @match        https://canvas.newcastle.edu.au/courses/*/assignments/new
// @match        https://canvas.newcastle.edu.au/courses/*/quizzes/*/edit
// @updateURL    https://github.com/tim-garside/tampermonkey-scripts/raw/main/Selection%20to%20Block.user.js
// @downloadURL  https://github.com/tim-garside/tampermonkey-scripts/raw/main/Selection%20to%20Block.user.js
// @grant        none
// ==/UserScript==

(function() {
	'use strict';

	// Configuration for toolbar
	const TOOLBAR_CONFIG = {
		targetToolbar: 'div.tox-toolbar__group[title="Miscellaneous"]',
		newToolbarTitle: 'Quick Fixes',
		buttons: [
			{
				name: 'Selection to Block',
				icon: `<svg fill="#2D3B45" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 385.419 385.419">
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
                    </svg>`,
				action: wrapSelectedText
			}
			// Add more buttons here as needed
		]
	};

	// Custom classes. Customise as required.
	const CLASSES = {
		wrapper: "dp-wrapper",
		theme: "kl_uon",
		contentBlock: "dp-content-block",
		header: "dp-header",
		heading: "dp-heading",
		headerPre: "dp-header-pre",
		headerTitle: "dp-header-title"
	};

	// Canvas editor ids. Customise as required.
	const IFRAME_IDS = [
        'wiki_page_body_ifr',
        'assignment_description_ifr',
        'quiz_description_ifr',
        'discussion-topic-message2_ifr'
    ];

	// Canvas title ids. Customise as required.
	const TITLE_INPUT_IDS = [
        'wikipage-title-input',
        'quiz_title',
        'assignment_name',
        'discussion-title'
    ];

	// Function to create button with appropriate Canvas attributes
	function createButton(config) {
		const button = document.createElement('button');
		button.setAttribute('aria-label', config.name);
		button.setAttribute('title', config.name);
		button.setAttribute('type', 'button');
		button.setAttribute('tabindex', '-1');
		button.className = 'tox-tbtn';
		button.setAttribute('aria-disabled', 'false');
		button.innerHTML = config.icon;
		button.addEventListener('click', config.action);
		return button;
	}

	//Function to create toolbar with appropriate Canvas attributes
	function createToolbar(title) {
		const toolbar = document.createElement('div');
		toolbar.setAttribute('title', title);
		toolbar.setAttribute('role', 'toolbar');
		toolbar.setAttribute('data-alloy-tabstop', 'true');
		toolbar.setAttribute('tabindex', '-1');
		toolbar.className = 'tox-toolbar__group';
		return toolbar;
	}

	function injectButtons(toolbar) {
		TOOLBAR_CONFIG.buttons.forEach(buttonConfig => {
			if (!toolbar.querySelector(`.tox-tbtn[title="${buttonConfig.name}"]`)) {
				//console.log(`Adding button: ${buttonConfig.name}`);
				const button = createButton(buttonConfig);
				toolbar.appendChild(button);
			/*} else {
				console.log(`Button ${buttonConfig.name} already exists.`);*/
			}
		});
	}

	// Checks for HTML within selection
	function isHTML(str) {
        const doc = new DOMParser().parseFromString(str, "text/html");
        return Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
    }

    function startsWithH3(str) {
        const trimmedStr = str.trimStart();
        return /^<h3[^>]*>/i.test(trimmedStr);
    }

	// Finds editor iframe depending on the type of page
	function findEditorIframe() {
        for (let id of IFRAME_IDS) {
            const iframe = document.getElementById(id);
            if (iframe) {
                return iframe;
            }
        }
        return null;
    }

	// Finds page title depending on the type of page
	function findPageTitle() {
        for (let id of TITLE_INPUT_IDS) {
            const titleInput = document.getElementById(id);
            if (titleInput && titleInput.value) {
                return titleInput.value;
            }
        }
        return 'Untitled';
    }

	// Function to wrap the selected text into a content block and the apply the theme if necessary
	function wrapSelectedText() {
        const iframe = findEditorIframe();
        if (!iframe) {
            console.error('Target iframe not found');
            return;
        }

        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        const selection = iframeDocument.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const selectedContent = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(selectedContent);

        const selectedHtml = tempDiv.innerHTML;
        const containsHtml = isHTML(selectedHtml);
        const startsWithHeading = startsWithH3(selectedHtml);

        let dpWrapper = iframeDocument.getElementById(CLASSES.wrapper);
        if (!dpWrapper) {
            dpWrapper = createWrapper(iframeDocument);
            iframeDocument.body.appendChild(dpWrapper);
        }

        const dpContentBlock = iframeDocument.createElement('div');
        dpContentBlock.className = CLASSES.contentBlock;

        if (!containsHtml && !startsWithHeading) {
            const paragraph = iframeDocument.createElement('p');
            paragraph.innerHTML = selectedHtml;
            dpContentBlock.appendChild(paragraph);
        } else {
            dpContentBlock.innerHTML = selectedHtml;
        }

        dpWrapper.appendChild(dpContentBlock);
        range.deleteContents();
        selection.removeAllRanges();
    }

	// Creates wrapper for html
	function createWrapper(doc) {
		const wrapper = doc.createElement('div');
		wrapper.id = CLASSES.wrapper;
		wrapper.className = `${CLASSES.wrapper} ${CLASSES.theme}`;

		const pageTitle = findPageTitle();
		const header = createHeader(doc, pageTitle);
		wrapper.appendChild(header);

		return wrapper;
	}

	// Creates theme header
	function createHeader(doc, title) {
		const header = doc.createElement('header');
		header.className = CLASSES.header;

		const h2 = doc.createElement('h2');
		h2.className = CLASSES.heading;

		const spanPre = doc.createElement('span');
		spanPre.className = CLASSES.headerPre;
		spanPre.innerHTML = `<span class="${CLASSES.headerPre}-1">Name </span><span class="${CLASSES.headerPre}-2">## </span>`;

		const spanTitle = doc.createElement('span');
		spanTitle.className = CLASSES.headerTitle;
		spanTitle.textContent = title;

		h2.appendChild(spanPre);
		h2.appendChild(spanTitle);
		header.appendChild(h2);

		return header;
	}

	function initializeToolbar() {
        const existingToolbarDiv = document.querySelector(TOOLBAR_CONFIG.targetToolbar);
        if (existingToolbarDiv) {
            ensureQuickFixesToolbar(existingToolbarDiv);
        } else {
            //console.log('Target toolbar not found. Setting up observer...');
            setupObserver();
        }
    }

    function ensureQuickFixesToolbar(targetToolbar) {
        let quickFixesToolbar = document.querySelector(`div[title="${TOOLBAR_CONFIG.newToolbarTitle}"]`);
        if (!quickFixesToolbar) {
            //console.log('Creating new Quick Fixes toolbar...');
            quickFixesToolbar = createToolbar(TOOLBAR_CONFIG.newToolbarTitle);
            targetToolbar.parentNode.insertBefore(quickFixesToolbar, targetToolbar.nextSibling);
        }
        injectButtons(quickFixesToolbar);
    }

    function setupObserver() {
        const observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    const targetToolbar = document.querySelector(TOOLBAR_CONFIG.targetToolbar);
                    if (targetToolbar) {
                        ensureQuickFixesToolbar(targetToolbar);
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

	// Start the process
	initializeToolbar();

	// Set up a persistent observer to ensure the toolbar stays
    setupObserver();
})();