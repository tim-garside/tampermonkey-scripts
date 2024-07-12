// ==UserScript==
// @name         Canvas Iframe Creator
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Searches Canvas files area to create an iframe embed for HTML files.
// @author       You
// @match        https://canvas.newcastle.edu.au/courses/*/pages/*/edit
// @match        https://canvas.newcastle.edu.au/courses/*/pages
// @match        https://canvas.newcastle.edu.au/courses/*/discussion_topics/*/edit
// @match        https://canvas.newcastle.edu.au/courses/*/discussion_topics/new
// @match        https://canvas.newcastle.edu.au/courses/*/assignments/*/edit
// @match        https://canvas.newcastle.edu.au/courses/*/assignments/new
// @match        https://canvas.newcastle.edu.au/courses/*/quizzes/*/edit
// @updateURL    https://github.com/tim-garside/tampermonkey-scripts/raw/main/Canvas%20Iframe%20Creator.user.js
// @downloadURL  https://github.com/tim-garside/tampermonkey-scripts/raw/main/Canvas%20Iframe%20Creator.user.js
// @grant        none
// ==/UserScript==

(function() {
	'use strict';
	const apiVersion = "v1";
	const STYLING = {locked: "dp-locked", embed: "dp-embed-wrapper", actionItemNote: "dp-action-item dp-action-item-block dp-action-item-note"};
	const supportLink = "https://support.panopto.com/s/article/How-to-Enable-Third-Party-Cookies-in-Supported-Browsers";
	const unitName = "LDTI";
	const unitEmail = "ldti@newcastle.edu.au";

	/**
     * Searches for HTML files in the Canvas course files.
     * @param {string} courseId - The ID of the current course.
     * @returns {Promise<Array>} A promise that resolves to an array of HTML file objects.
     */
	async function searchFile(courseId) {
		const options = {
			method: "GET",
			credentials: "include",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		};

		const responseCourseFiles = await fetch(`${window.location.origin}/api/${apiVersion}/courses/${courseId}/files?content_types[]=text/html`, options);
		if (!responseCourseFiles.ok) return;
		return await responseCourseFiles.json();
	}

	/**
     * Generates the embed code for the iframe.
     * @param {string} fileUrl - The URL of the file to embed.
     * @param {string} fileTitle - The title of the file.
     * @param {string} minHeight - The minimum height of the iframe.
     * @param {string} unit - The unit for the minimum height (px, em, rem).
     * @returns {HTMLElement} The generated embed code as an HTML element.
     */
	function generateEmbedCode(fileUrl, fileTitle, minHeight, unit) {
		const sanitizedFileTitle = fileTitle.replace(/\.[^/.]+$/, "");
		const iframe = document.createElement('iframe');
		iframe.src = fileUrl;
		iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            max-width: 100%;
            min-height: ${minHeight}${unit};
        `;
		iframe.setAttribute('aria-label', sanitizedFileTitle);
		iframe.setAttribute('title', sanitizedFileTitle);
		iframe.setAttribute('allowfullscreen', 'true');

		/*const wrapper = document.createElement('div');
		wrapper.style.cssText = `
            position: relative;
            padding-bottom: 56.25%;
            height: 0;
            overflow: hidden;
            max-width: 100%;
        `;
		wrapper.appendChild(iframe);
*/
		const locked = document.createElement('div');
		locked.classList.add(STYLING.locked);
		locked.innerHTML = `
            <div class="${STYLING.actionItemNote}" style="display: none;" aria-hidden="true">
                <p>The following activity was created by ${unitName} on behalf of the Course Coordinator.</p>
                <p>To make changes to this activity, please reach out to ${unitName} via the following email: <a class="inline_disabled" href="mailto:${unitEmail}" target="_blank" rel="noopener">${unitEmail}</a></p>
            </div>
            <div class="${STYLING.embed}">${iframe.outerHTML}</div>
            <p style="padding-top: 1rem;"><strong>Note:</strong> If you are unable to see the activity above (access denied), please follow these <a href="${supportLink}" target="_blank" rel="noopener">instructions for enabling third-party cookies</a>.</p>
        `;
		return locked;
	}

	const courseId = "COURSE_ID" in ENV ? ENV.COURSE_ID : window.location.pathname.includes("/courses/") ? window.location.pathname.match(/courses\/(\d+)/)[1] : null;

	/**
     * Creates and displays the file selection tray.
     */
	function createTray() {
		const tray = document.createElement('div');
		tray.id = 'fileEmbedTray';
		tray.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            width: 30em;
            height: 100%;
            background-color: #fff;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            padding: 20px;
            transition: transform 0.3s ease-in-out;
            transform: translateX(100%);
        `;

		const results = document.createElement('div');
		results.innerHTML = `
            <h2>Select a File</h2>
            <div style="overflow-y: auto; max-height: calc(100vh - 300px);">
                <table id="optionsTable" style="width: 100%; border-collapse: separate; border-spacing: 0 10px;">
                    <thead>
                        <tr>
                            <th scope="col" style="padding: 10px; text-align: left;">File Name</th>
                            <th scope="col" style="padding: 10px; text-align: left;">Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Rows will be generated here -->
                    </tbody>
                </table>
            </div>
        `;

		let selectedOptionURL, selectedOptionName, selectedRow;
		let minHeight = '900';
		let unit = 'px';
		const tableBody = results.querySelector('#optionsTable tbody');
		tableBody.innerHTML = '';

		searchFile(courseId)
			.then(htmlFiles => {
			htmlFiles.forEach((htmlFile) => {
				const htmlFileDisplayName = htmlFile.display_name;
				const htmlFileURL = htmlFile.url.split(/[?#]/)[0];
				const row = document.createElement('tr');
				row.setAttribute('data-file-embed-url', htmlFileURL);
				row.setAttribute('data-file-embed-display-name', htmlFileDisplayName);
				row.style.cssText = `
                        cursor: pointer;
                        transition: background-color 0.3s;
                    `;

					const nameCell = document.createElement('td');
					nameCell.textContent = htmlFileDisplayName;
					nameCell.style.padding = '10px';

					const dateCell = document.createElement('td');
					dateCell.textContent = new Date(htmlFile.updated_at).toLocaleString();
					dateCell.style.padding = '10px';

					row.appendChild(nameCell);
					row.appendChild(dateCell);
					tableBody.appendChild(row);
					row.addEventListener('click', () => {
						selectedOptionURL = row.getAttribute('data-file-embed-url');
						selectedOptionName = row.getAttribute('data-file-embed-display-name');
						selectedRow = row;
						updateSelectedClass(row);
					});
					row.addEventListener('mouseover', () => {
						row.style.backgroundColor = '#f0f8ff';
					});
					row.addEventListener('mouseout', () => {
						if (row !== selectedRow) {
							row.style.backgroundColor = '';
						}
					});
				});
		})
			.catch(error => {
			console.error('Error searching for HTML files:', error);
		});

		const header = document.createElement('div');
		header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        `;

		const title = document.createElement('h2');
		title.innerText = 'Embed Canvas File';
		title.style.margin = '0';

		const closeButton = document.createElement('button');
		closeButton.innerHTML = '<i class="icon-x"></i>';
		closeButton.style.cssText = `
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
            color: #007bff;
            width: 1em;
            height: 1em;
        `;

		closeButton.addEventListener('click', () => {
			tray.style.transform = 'translateX(100%)';
			setTimeout(() => {
				document.body.removeChild(tray);
			}, 300);
		});

		const instructions = document.createElement('div');
		instructions.innerHTML = '<p>This tool displays all available HTML files for this course.</p> <p>Select an option from the table below then set a minimum height for the iframe.</p> <p>It is recommended to set the minimum height to a value that allows the content to be displayed on multiple screen sizes. This may require some experimenting to suit your file.</p>'

		// Create min-height input
		const heightInput = document.createElement('div');
		heightInput.style.cssText = `
            margin-bottom: 20px;
        `;
		heightInput.innerHTML = `
            <label for="iframeMinHeight" style="display: block; margin-bottom: 5px;">
                Minimum iframe height:
                <span class="info-icon" style="cursor: pointer; margin-left: 5px;">ⓘ</span>
            </label>
            <div style="display: flex; align-items: center;">
                <input type="number" id="iframeMinHeight" value="${minHeight}" min="0" style="width: 70%; padding: 5px; border: 1px solid #ccc; border-radius: 4px 0 0 4px;">
                <select id="iframeMinHeightUnit" style="width: 30%; padding: 5px; border: 1px solid #ccc; border-radius: 0 4px 4px 0; border-left: none;">
                    <option value="px">px</option>
                    <option value="em">em</option>
                    <option value="rem">rem</option>
                </select>
            </div>
        `;

		const button = document.createElement('button');
		button.innerText = 'Create Embed Code';
		button.style.cssText = `
            width: 100%;
            padding: 10px;
            background-color: #007bff;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 20px;
            font-size: 1rem;
        `;

		button.addEventListener('click', async () => {
			if (selectedOptionURL && selectedOptionName) {
				minHeight = document.getElementById('iframeMinHeight').value;
				unit = document.getElementById('iframeMinHeightUnit').value;
				const embed = generateEmbedCode(selectedOptionURL, selectedOptionName, minHeight, unit);
				const textArea = document.querySelector('span[class^="css"][class$="-modal"][aria-label="Embed"] textarea');
				textArea.focus();
				document.execCommand('insertText', false, embed.outerHTML);
				textArea.dispatchEvent(new Event('change', { bubbles: true }));
				tray.style.transform = 'translateX(100%)';
				setTimeout(() => {
					document.body.removeChild(tray);
				}, 300);
			} else {
				alert('Please select a file first.');
			}
		});

		header.appendChild(title);
		header.appendChild(closeButton);
		tray.appendChild(header);
		tray.appendChild(instructions);
		tray.appendChild(results);
		tray.appendChild(heightInput);
		tray.appendChild(button);
		document.body.appendChild(tray);

		// Add tooltip functionality
		const infoIcon = tray.querySelector('.info-icon');
		const tooltip = document.createElement('div');
		tooltip.style.cssText = `
            position: absolute;
            background-color: #333;
            color: #fff;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            max-width: 200px;
            display: none;
            z-index: 1000;
        `;
		tooltip.textContent = 'Sets the minimum height of the iframe. The content will expand beyond this height if needed.';
		infoIcon.appendChild(tooltip);

		infoIcon.addEventListener('mouseover', () => {
			tooltip.style.display = 'block';
		});

		infoIcon.addEventListener('mouseout', () => {
			tooltip.style.display = 'none';
		});

		setTimeout(() => {
			tray.style.transform = 'translateX(0)';
		}, 100);
	}

	    /**
     * Updates the visual selection of a row in the file table.
     * @param {HTMLElement} selectedRow - The row that was selected.
     */
    function updateSelectedClass(selectedRow) {
        const embedTray = document.getElementById('fileEmbedTray');
        const rows = embedTray.querySelectorAll('#optionsTable tr');
        rows.forEach(row => {
            if (row === selectedRow) {
                row.style.backgroundColor = '#e6f2ff';
            } else {
                row.style.backgroundColor = '';
            }
        });
    }

	    /**
     * Adds the "Embed Canvas File" button to the modal.
     */
    function addButtonToModal() {
        const embedModal = document.querySelector('span[class^="css"][class$="-modal"][aria-label="Embed"]');
        if (embedModal) {
            const existingButton = embedModal.querySelector('#embedCanvasFileButton');
            if (existingButton) {
                return; // Button already exists, no need to add it again
            }

            const button = document.createElement('button');
            button.id = 'embedCanvasFileButton';
            button.innerHTML = 'Embed Canvas File';
            button.classList.add('btn');
            button.style.marginRight = '10px';
            button.addEventListener('click', createTray);

            // Try to find the footer or a suitable place to insert the button
            let insertionPoint = embedModal.querySelector('div[class^="css"][class$="-modalFooter"]');
            if (!insertionPoint) {
                // If we can't find the footer, look for any button in the modal and insert before it
                const anyButton = embedModal.querySelector('button');
                if (anyButton) {
                    anyButton.parentNode.insertBefore(button, anyButton);
                } else {
                    // If we can't find any button, append to the modal itself
                    embedModal.appendChild(button);
                }
            } else {
                // Insert at the beginning of the footer
                insertionPoint.insertBefore(button, insertionPoint.firstChild);
            }
        }
    }

    // Set up a MutationObserver to watch for the embed modal
    const observer = new MutationObserver((mutations, obs) => {
        const embedModal = document.querySelector('span[class^="css"][class$="-modal"][aria-label="Embed"]');
        if (embedModal) {
            addButtonToModal();
            // Don't disconnect the observer, keep watching for changes
        }
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also try to add the button immediately in case the modal is already present
    addButtonToModal();

})();
