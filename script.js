// Configuration
const config = {
    adBlock: {
        enabled: localStorage.getItem('adBlockEnabled') !== 'false',
        blockedDomains: [
            'doubleclick.net', 'googleads.com', 'googlesyndication.com',
            'adservice.google.com', 'ads.youtube.com', 'adserver.com',
            'tracking.com', 'advertising.com', 'taboola.com', 'outbrain.com',
            'googletagmanager.com', 'facebook.net', 'analytics.google.com',
            'hotjar.com', 'adsrvr.org', 'adnxs.com'
        ],
        blockedPaths: ['/ad', '/ads', '/track', '/analytics'],
        whitelist: ['youtube.com', 'wikipedia.org', 'github.com', 'netlify.app']
    },
    darkMode: localStorage.getItem('darkModeEnabled') === 'true',
    useProxy: localStorage.getItem('useProxy') === 'true'
};

// DOM Elements
const elements = {
    embedUrl: document.getElementById('embedUrl'),
    embedContainer: document.getElementById('embedContainer'),
    searchResults: document.getElementById('searchResults'),
    savedList: document.getElementById('savedList'),
    adblockToggle: document.getElementById('adblockToggle'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    embedButton: document.getElementById('embedButton'),
    saveButton: document.getElementById('saveButton'),
    embedTitle: document.getElementById('embedTitle'),
    ddgSearchForm: document.getElementById('ddgSearchForm'),
    ddgSearchInput: document.getElementById('ddgSearchInput'),
    proxyHelp: document.getElementById('proxyHelp'),
    devConsole: document.querySelector('.dev-console'),
    consoleOutput: document.getElementById('consoleOutput'),
    devConsoleBtn: document.querySelector('.dev-console-btn')
};

// State
let savedEmbeds = JSON.parse(localStorage.getItem('savedEmbeds')) || [];
let errorLog = [];

// Initialization
function initApp() {
    initDarkMode();
    updateSavedList();
    updateAdBlockToggle();
    addEventListeners();
    initErrorLogging();
}

// Event Listeners
function addEventListeners() {
    elements.embedButton.addEventListener('click', embed);
    elements.saveButton.addEventListener('click', saveEmbed);
    elements.adblockToggle.addEventListener('click', toggleAdBlock);
    elements.darkModeToggle.addEventListener('click', toggleDarkMode);
    elements.embedUrl.addEventListener('keypress', e => e.key === 'Enter' && embed());
    elements.ddgSearchForm.addEventListener('submit', handleSearch);
    elements.proxyHelp.addEventListener('click', toggleProxy);
    elements.devConsoleBtn.addEventListener('click', toggleConsole);
}

// Dark Mode
function toggleDarkMode() {
    config.darkMode = !config.darkMode;
    localStorage.setItem('darkModeEnabled', config.darkMode);
    document.body.classList.toggle('dark-mode', config.darkMode);
    elements.darkModeToggle.textContent = config.darkMode ? '☀️' : '🌙';
}

function initDarkMode() {
    document.body.classList.toggle('dark-mode', config.darkMode);
    elements.darkModeToggle.textContent = config.darkMode ? '☀️' : '🌙';
}

// AdBlock
function toggleAdBlock() {
    config.adBlock.enabled = !config.adBlock.enabled;
    localStorage.setItem('adBlockEnabled', config.adBlock.enabled);
    updateAdBlockToggle();
}

function updateAdBlockToggle() {
    elements.adblockToggle.textContent = `AdBlock: ${config.adBlock.enabled ? 'ON' : 'OFF'}`;
    elements.adblockToggle.classList.toggle('active', config.adBlock.enabled);
}

function isBlocked(url) {
    if (!config.adBlock.enabled) return false;
    const { hostname, pathname } = new URL(url);
    
    if (config.adBlock.whitelist.some(d => hostname.endsWith(d))) return false;
    
    return config.adBlock.blockedDomains.some(d => hostname.includes(d)) ||
           config.adBlock.blockedPaths.some(p => pathname.includes(p));
}

// Proxy
function toggleProxy(e) {
    e.preventDefault();
    config.useProxy = !config.useProxy;
    localStorage.setItem('useProxy', config.useProxy);
    alert(`Proxy mode ${config.useProxy ? 'enabled' : 'disabled'}`);
}

// Saved Embeds
function updateSavedList() {
    elements.savedList.innerHTML = savedEmbeds
        .map((embed, index) => `
            <div class="saved-embed-item">
                <span>${embed.title}</span>
                <div>
                    <button onclick="loadEmbed(${index})">Load</button>
                    <button class="delete-btn" onclick="deleteEmbed(${index})">Delete</button>
                </div>
            </div>
        `)
        .join('');
}

function loadEmbed(index) {
    elements.embedUrl.value = savedEmbeds[index].url;
    embed();
}

function deleteEmbed(index) {
    if (confirm('Delete this saved embed?')) {
        savedEmbeds.splice(index, 1);
        localStorage.setItem('savedEmbeds', JSON.stringify(savedEmbeds));
        updateSavedList();
    }
}

// Embedding
function embed() {
    showElement(elements.embedContainer);
    hideElement(elements.searchResults);

    let url = elements.embedUrl.value.trim();
    if (!url) return alert('Please enter a URL');

    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
        elements.embedUrl.value = url;
    }

    try {
        if (isBlocked(url)) return alert('Content blocked by AdBlock');
        
        const finalUrl = config.useProxy 
            ? `https://nicks-embeds.vercel.app/?url=${encodeURIComponent(url)}`
            : url;

        const iframe = document.createElement('iframe');
        iframe.src = finalUrl;
        iframe.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation";
        iframe.allow = "fullscreen";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        
        elements.embedContainer.innerHTML = '';
        elements.embedContainer.appendChild(iframe);

        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'fullscreen-btn';
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.onclick = toggleFullscreen;
        elements.embedContainer.appendChild(fullscreenBtn);

        iframe.onload = () => {
            try {
                if (iframe.contentWindow.length === 0 || 
                    iframe.contentDocument.body.innerHTML.includes("blocked")) {
                    alert("Website refuses to be embedded");
                }
            } catch (e) {
                console.log("Embed check error:", e);
            }
        };

    } catch (error) {
        alert('Invalid URL');
        console.error('Embed error:', error);
    }
}

// Fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        elements.embedContainer.requestFullscreen().catch(err => {
            alert(`Fullscreen error: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
    updateFullscreenButton();
}

function updateFullscreenButton() {
    const btn = document.querySelector('.fullscreen-btn');
    btn.innerHTML = document.fullscreenElement ? '⛶ Exit' : '⛶ Fullscreen';
}

// Search
async function handleSearch(e) {
    e.preventDefault();
    const query = elements.ddgSearchInput.value.trim();
    if (!query) return;

    try {
        showElement(elements.searchResults);
        hideElement(elements.embedContainer);

        const apiKey = 'AIzaSyBD8ZXNUkO0OxeBEIBXO4J7Egg8gp1knhc';
        const cx = 'c7f0cb08d60d542f5';
        const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}`;

        const response = await fetch(url);
        const data = await response.json();

        elements.searchResults.innerHTML = '';

        if (data.items?.length > 0) {
            data.items.forEach(item => {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'search-result';

                const titleLink = document.createElement('a');
                titleLink.href = '#';
                titleLink.textContent = item.title;

                titleLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    elements.embedUrl.value = item.link;
                    embed();
                    hideElement(elements.searchResults);
                });

                const snippetDiv = document.createElement('div');
                snippetDiv.className = 'snippet';
                snippetDiv.textContent = item.snippet;

                resultDiv.appendChild(titleLink);
                resultDiv.appendChild(snippetDiv);
                elements.searchResults.appendChild(resultDiv);
            });
        } else {
            elements.searchResults.innerHTML = '<div class="no-results">No results found.</div>';
        }
    } catch (error) {
        console.error('Search failed:', error);
        alert('Search failed. Please try again.');
    }
}

// Error Handling
function initErrorLogging() {
    window.onerror = (message, source, lineno, colno, error) => {
        errorLog.push({
            timestamp: new Date().toISOString(),
            message,
            source,
            line: lineno,
            column: colno,
            error: error?.stack || ''
        });
        updateConsoleOutput();
        return false;
    };

    window.addEventListener('unhandledrejection', event => {
        errorLog.push({
            timestamp: new Date().toISOString(),
            message: `Unhandled rejection: ${event.reason}`,
            source: 'Promise',
            error: event.reason.stack || ''
        });
        updateConsoleOutput();
    });
}

function updateConsoleOutput() {
    elements.consoleOutput.textContent = errorLog
        .map(entry => `[${entry.timestamp}] ${entry.message}\n${entry.error || ''}`)
        .join('\n\n');
    elements.consoleOutput.scrollTop = elements.consoleOutput.scrollHeight;
}

// UI Utilities
function showElement(element) {
    element.style.display = 'block';
}

function hideElement(element) {
    element.style.display = 'none';
}

function toggleConsole() {
    elements.devConsole.classList.toggle('open');
}

// Save Embed
function saveEmbed() {
    let url = elements.embedUrl.value.trim().toLowerCase().replace(/\/+$/, '');
    if (!url) return alert('No embed to save');

    try {
        new URL(url);
    } catch {
        return alert('Invalid URL');
    }

    if (savedEmbeds.some(e => e.url.toLowerCase() === url)) {
        return alert('Already saved');
    }

    const title = elements.embedTitle.value || new URL(url).hostname;
    savedEmbeds.push({ title, url, date: new Date().toISOString() });
    
    try {
        localStorage.setItem('savedEmbeds', JSON.stringify(savedEmbeds));
        updateSavedList();
    } catch (e) {
        console.error('LocalStorage error:', e);
        alert('Failed to save embed. Storage may be full.');
    }
}

// Initialize
initApp();
window.loadEmbed = loadEmbed;
window.deleteEmbed = deleteEmbed;
