document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('content-area');
    const navLinks = document.querySelectorAll('nav a');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');

    // 1. File names corrected and Test2.txt made separate entry
    // 2. Test2.txt separated
    const routes = {
        'nav-story': 'Life.txt',
        'nav-profile': 'info.json',
        'nav-test1': 'Test.txt', // Separate entry for Test.txt
        'nav-test2': 'Test2.txt', // Separate entry for Test2.txt
        'nav-results': 'Test_Result.txt',
        'nav-welcome': 'welcome', // A pseudo-route for the welcome page
    };

    let lazyLoadObserver;
    let currentContentElements = []; // To keep track of currently loaded elements for clearing

    // --- Base64 Encoding/Decoding for safely storing HTML in data attributes ---
    function b64Encode(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
            return String.fromCharCode('0x' + p1);
        }));
    }

    function b64Decode(str) {
        return decodeURIComponent(atob(str).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    // --- Initial View & Welcome Page Refinements ---
    function showWelcomePage() {
        // 5. Content clear: Clear previous content before loading new
        clearCurrentContent();

        contentArea.innerHTML = `
            <div class="content-section welcome-container">
                <div class="welcome-text">
                    <h2>Arjun Sharma</h2>
                    <p>A logical, emotionally controlled problem-solver with a deep interest in technology, AI, and understanding the human condition. This profile, compiled by my AI assistant Fatima, provides a window into my life, my thoughts, and my capabilities.</p>
                    <p>Select a section from the navigation to explore further.</p>
                </div>
                <div class="welcome-image">
                    <img src="img.jpg" alt="Arjun Sharma Profile" id="profile-img">
                </div>
            </div>`;
        const profileImg = document.getElementById('profile-img');
        if (profileImg) {
            profileImg.addEventListener('click', () => openLightbox('img.jpg'));
        }
        // Store welcome page elements for potential future clearing if needed
        currentContentElements.push(contentArea.querySelector('.content-section'));
    }
    showWelcomePage();

    // --- Navigation ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (link.classList.contains('active')) return;

            // 5. & 6. Clear content before loading new page content
            clearCurrentContent();

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            loadContent(link.id);
        });
    });

    // Helper to clear content - part of points 5 & 6
    function clearCurrentContent() {
        // Disconnect existing observer to prevent errors on removed elements
        if (lazyLoadObserver) {
            lazyLoadObserver.disconnect();
        }
        contentArea.innerHTML = ''; // Clear all content inside contentArea
        currentContentElements = []; // Reset the list of current elements
    }


    // --- Lightbox Logic ---
    function openLightbox(src) {
        lightbox.classList.add('active');
        lightboxImg.src = src;
    }
    lightboxClose.addEventListener('click', () => lightbox.classList.remove('active'));
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
        }
    });

    // --- Lazy Loading ---
    function setupLazyLoader() {
        if (lazyLoadObserver) lazyLoadObserver.disconnect();
        // 6. Root Margin adjusted to load only what's needed for current view
        //    (e.g., 0px means only visible elements, adjust based on preference)
        //    '0px 0px 50px 0px' will load items 50px before they enter viewport
        lazyLoadObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const placeholder = entry.target;
                    const encodedContent = placeholder.dataset.content;
                    if (encodedContent) {
                        const decodedHtml = b64Decode(encodedContent);
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = decodedHtml;

                        // 6. Replace placeholder with content
                        //    Ensure the lazy loaded content is added as a single block
                        if (tempDiv.firstElementChild) {
                            placeholder.replaceWith(tempDiv.firstElementChild);
                        } else {
                            placeholder.remove();
                        }
                    } else {
                        placeholder.remove();
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px 50px 0px' }); // Adjusted rootMargin

        document.querySelectorAll('.lazy-load-placeholder').forEach(el => {
            lazyLoadObserver.observe(el);
        });
    }

    // --- Content Loading and Rendering ---
    // 8. Dynamic file data load only on tap
    // (This function already handles that as it's called on nav link click)
    async function loadContent(fileKey) {
        // 5. & 6. Clear content at the start of loading new content
        clearCurrentContent();

        // Show loading state immediately
        contentArea.innerHTML = `<div class="content-section"><p>Loading...</p></div>`;

        try {
            const fileInfo = routes[fileKey];
            let contentHtml = '';

            // Handle the welcome page special case
            if (fileInfo === 'welcome') {
                showWelcomePage();
                return; // Exit function after showing welcome page
            }

            // 7. AJAX (Fetch API) is already being used effectively.
            //    No need for traditional XMLHttpRequest (AJAX's older form).
            const response = await fetch(fileInfo);
            if (!response.ok) {
                // Better error handling for network/HTTP issues
                throw new Error(`Failed to load ${fileInfo}: ${response.status} ${response.statusText}`);
            }

            switch (fileKey) {
                case 'nav-story':
                    contentHtml = await parseStory(await response.text());
                    break;
                case 'nav-profile':
                    contentHtml = await parseProfile(await response.json());
                    break;
                case 'nav-test1': // Handle Test.txt separately
                    contentHtml = await parseTestFile(await response.text(), 'Test.txt');
                    break;
                case 'nav-test2': // Handle Test2.txt separately
                    contentHtml = await parseTestFile(await response.text(), 'Test2.txt');
                    break;
                case 'nav-results':
                    contentHtml = parseResults(await response.text());
                    break;
                default:
                    showWelcomePage(); return;
            }

            // 9. If needed, next page like code can be integrated here
            //    For now, full content is loaded. If pagination needed,
            //    parsers would return partial content and loadContent would manage pages.
            contentArea.innerHTML = `<div class="content-section">${contentHtml}</div>`;
            setupLazyLoader();

            if (fileKey === 'nav-profile') {
                attachJsonEventListeners();
            }

            // Store loaded content elements
            contentArea.querySelectorAll('.content-section > *').forEach(el => {
                currentContentElements.push(el);
            });

        } catch (error) {
            console.error("Error loading content:", error);
            contentArea.innerHTML = `<div class="content-section"><p>Error loading content: ${error.message}. Please try again.</p></div>`;
        }
    }

    // --- Parsers for each file type ---

    function parseStory(text) {
        let html = `<h2 class="section-title">My Story (Life.txt)</h2>`;
        const sections = text.split(/\*\*(.*?)\*\*/).filter(Boolean);
        for (let i = 0; i < sections.length; i += 2) {
            const title = sections[i].replace(/:/g, '').trim();
            const content = (sections[i + 1] || '').trim().replace(/\n/g, '<br>');
            // Wrap in a div to ensure a single parent element for lazy loading
            const blockHtml = `<div class="story-section"><h3>${title}</h3><p>${content}</p></div>`;
            html += `<div class="lazy-load-placeholder" data-content="${b64Encode(blockHtml)}">Loading Section...</div>`;
        }
        return html;
    }

    function parseProfile(data) {
        const jsonString = JSON.stringify(data, null, 2);

        function createNode(key, value) {
            const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
            let nodeHtml = '';
            const keyHtml = `<span class="key">"${key}": </span>`;

            if (type === 'object' || type === 'array') {
                nodeHtml += `<li class="collapsed"><span class="collapsible">${keyHtml}${type === 'array' ? '[' : '{'}</span><ul>`;
                for (const subKey in value) {
                    nodeHtml += createNode(subKey, value[subKey]);
                }
                nodeHtml += `</ul><span>${type === 'array' ? ']' : '}'}</span></li>`;
            } else {
                nodeHtml += `<li>${keyHtml}<span class="${type}">${JSON.stringify(value)}</span></li>`;
            }
            return nodeHtml;
        }

        let treeHtml = '<ul class="json-tree">';
        for (const key in data) { treeHtml += createNode(key, data[key]); }
        treeHtml += '</ul>';

        return `
            <h2 class="section-title">Full Profile (info.json)</h2>
            <div class="json-controls">
                <button class="json-btn" id="json-toggle-expand">Expand All</button>
                <button class="json-btn" id="json-copy">Copy JSON</button>
            </div>
            ${treeHtml}
            <div id="json-data-container" data-json='${jsonString}' style="display: none;"></div>
        `;
    }

    function attachJsonEventListeners() {
        document.querySelectorAll('.json-tree .collapsible').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                el.parentElement.classList.toggle('collapsed');
            });
        });

        const toggleBtn = document.getElementById('json-toggle-expand');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isCollapsed = toggleBtn.textContent === 'Expand All';
                document.querySelectorAll('.json-tree li').forEach(li => {
                    if (li.querySelector('ul')) {
                        if (isCollapsed) li.classList.remove('collapsed');
                        else li.classList.add('collapsed');
                    }
                });
                toggleBtn.textContent = isCollapsed ? 'Collapse All' : 'Expand All';
            });
        }

        const copyBtn = document.getElementById('json-copy');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const jsonString = document.getElementById('json-data-container').dataset.json;
                navigator.clipboard.writeText(jsonString).then(() => alert('JSON copied!'), () => alert('Failed to copy!'));
            });
        }
    }

    // 10, 11, 12: New parsing logic for Test.txt and Test2.txt
    // Unified parser for both Test files
    async function parseTestFile(text, fileName) {
        let html = `<h2 class="section-title">Psychological & Behavioral Tests (${fileName})</h2>`;
        // Split by blocks: { ... } or lines of '---'
        const rawBlocks = text.split(/\{(.*?)\}/s).filter(Boolean).map(block => block.trim()).filter(block => block.length > 0);

        for (const rawBlock of rawBlocks) {
            // Check if it's a content block or just a delimiter artifact
            if (rawBlock.startsWith('**') && rawBlock.includes('**')) { // Likely a block with content
                const titleMatch = rawBlock.match(/\*\*(.*?)\*\*/);
                const title = titleMatch ? titleMatch[1].trim() : "Behavioral Analysis";
                let content = rawBlock.replace(/\*\*.*?\*\*/, '').trim();

                let blockHtml = `<div class="test-block"><h3>${title}</h3>`;

                // Split into Q&A pairs. Regex looks for a number followed by '.' and space.
                // It's more robust now to handle different numbering styles and ensure questions are correctly identified.
                const qaPairs = content.split(/(\d+\.\s*)/).filter(Boolean); // Split by number + dot + space

                let currentQuestion = '';
                let currentAnswer = '';
                let questionNumber = 0;

                for (let i = 0; i < qaPairs.length; i++) {
                    const segment = qaPairs[i];
                    if (segment.match(/^\d+\.\s*$/)) { // If it's a number like "1." or "10."
                        if (currentQuestion) { // If a question was previously being built
                            // Add the previous Q&A block before starting a new one
                            blockHtml += `
                                <div class="question-block">
                                    <div class="question">${questionNumber}. ${currentQuestion}</div>
                                    <div class="answer">${currentAnswer || ""}</div>
                                </div>`;
                            currentQuestion = '';
                            currentAnswer = '';
                        }
                        questionNumber = parseInt(segment.trim());
                        currentQuestion = qaPairs[++i].trim(); // Get the actual question text
                    } else {
                        // This is part of an answer or a continuation of a question
                        // If it contains lines starting with '#', it's an answer part
                        if (segment.includes('#')) {
                            currentAnswer += segment.replace(/#/g, '').trim().replace(/\n/g, '<br>');
                        } else if (currentQuestion) {
                            // If it's not a numbered question start and we have a current question
                            // this must be part of the current answer
                            currentAnswer += segment.trim().replace(/\n/g, '<br>');
                        } else {
                            // Fallback for content that doesn't fit the pattern
                            console.warn("Unexpected content in test file block:", segment);
                        }
                    }
                }
                // Add the last Q&A block
                if (currentQuestion) {
                    blockHtml += `
                        <div class="question-block">
                            <div class="question">${questionNumber}. ${currentQuestion}</div>
                            <div class="answer">${currentAnswer || ""}</div>
                        </div>`;
                }

                blockHtml += '</div>'; // Close test-block
                html += `<div class="lazy-load-placeholder" data-content="${b64Encode(blockHtml)}">Loading Test Block...</div>`;
            }
        }
        return html;
    }


    function parseResults(text) {
        let html = '<h2 class="section-title">Test Analysis & Reports</h2>';
        const reports = text.split(/\n\s*\/\/ line\s*\n/);
        reports.forEach(reportText => {
            if (!reportText.trim()) return;
            const titleMatch = reportText.match(/\*\*(.*?)\*\*/);
            const title = titleMatch ? titleMatch[1] : "Analysis Report";
            const content = reportText.replace(/\*\*.*?\*\*/, '').replace(/---/g, '<hr>').replace(/\n/g, '<br>');
            // Wrap in a div to ensure a single parent element for lazy loading
            const blockHtml = `<div class="report-card"><h3>${title}</h3><div>${content}</div></div>`;
            html += `<div class="lazy-load-placeholder" data-content="${b64Encode(blockHtml)}">Loading Report...</div>`;
        });
        return html;
    }
});
