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

let savedEmbeds = JSON.parse(localStorage.getItem('savedEmbeds')) || [];

const elements = {
    embedUrl: document.getElementById('embedUrl'),
    embedContainer: document.getElementById('embedContainer'),
    searchResults: document.getElementById('searchResults'),
    savedList: document.getElementById('savedList'),
    adblockToggle: document.getElementById('adblockToggle'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    embedButton: document.getElementById('embedButton'), // Must match HTML
    saveButton: document.getElementById('saveButton'), // Must match HTML
    embedTitle: document.getElementById('embedTitle'),
    ddgSearchForm: document.getElementById('ddgSearchForm'),
    ddgSearchInput: document.getElementById('ddgSearchInput')
    proxyHelp: document.getElementById('proxyHelp')  // Add this line
};

function initApp() {
    initDarkMode();
    updateSavedList();
    updateAdBlockToggle();
    addEventListeners();
}

function addEventListeners() {
    elements.embedButton.addEventListener('click', embed);
    elements.saveButton.addEventListener('click', saveEmbed);
    elements.adblockToggle.addEventListener('click', toggleAdBlock);
    elements.darkModeToggle.addEventListener('click', toggleDarkMode);
    elements.embedUrl.addEventListener('keypress', e => e.key === 'Enter' && embed());
    elements.ddgSearchForm.addEventListener('submit', handleSearch);
    elements.proxyHelp.addEventListener('click', toggleProxy);
}

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

function toggleAdBlock() {
    config.adBlock.enabled = !config.adBlock.enabled;
    localStorage.setItem('adBlockEnabled', config.adBlock.enabled);
    elements.adblockToggle.textContent = `AdBlock: ${config.adBlock.enabled ? 'ON' : 'OFF'}`;
    elements.adblockToggle.classList.toggle('active', config.adBlock.enabled); // Add this line
}

function toggleProxy(e) {
    e.preventDefault();
    config.useProxy = !config.useProxy;
    localStorage.setItem('useProxy', config.useProxy);
    alert(`Proxy mode ${config.useProxy ? 'enabled' : 'disabled'}`);
}

function updateAdBlockToggle() {
    elements.adblockToggle.textContent = `AdBlock: ${config.adBlock.enabled ? 'ON' : 'OFF'}`;
    elements.adblockToggle.classList.toggle('active', config.adBlock.enabled);
}

function isBlocked(url) {
    if (!config.adBlock.enabled) return false;
    const { hostname, pathname } = new URL(url);
    
    // Check whitelist first
    if (config.adBlock.whitelist.some(d => hostname.includes(d))) return false;
    
    return config.adBlock.blockedDomains.some(d => hostname.includes(d)) ||
           config.adBlock.blockedPaths.some(p => pathname.includes(p));
}

function embed() {
    showElement(elements.embedContainer);
    hideElement(elements.searchResults);

    let url = elements.embedUrl.value.trim();
    if (!url) return alert('Please enter a URL');

    // Auto-add https:// if missing
    try {
        new URL(url);
    } catch {
        if (!/^https?:\/\//i.test(url)) {
            url = `https://${url}`;
            elements.embedUrl.value = url;
        }
    }

    if (isBlocked(url)) return alert('Content blocked by AdBlock');

    // Create iframe and fullscreen button
    elements.embedContainer.innerHTML = '';
    const iframe = document.createElement('iframe');
    const fullscreenBtn = document.createElement('button');
    
    // Use proxy if enabled
    const finalUrl = config.useProxy 
        ? `https://nicks-embeds.vercel.app/?url=${encodeURIComponent(url)}`
        : url;

    iframe.src = finalUrl;
    iframe.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation";
    iframe.allow = "fullscreen";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    fullscreenBtn.className = 'fullscreen-btn';
    fullscreenBtn.innerHTML = '⛶';
    fullscreenBtn.onclick = toggleFullscreen;

    elements.embedContainer.appendChild(iframe);
    elements.embedContainer.appendChild(fullscreenBtn);

    // Error handling
    iframe.onerror = () => alert('Failed to load content');
    iframe.onload = () => {
        try {
            if (iframe.contentDocument?.body?.innerHTML.includes("blocked")) {
                alert("Website refuses to be embedded");
            }
        } catch (e) {
            console.log("Embed check error:", e);
        }
    };
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        elements.embedContainer.requestFullscreen().catch(err => {
            alert(`Fullscreen error: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

function updateFullscreenButton() {
    const btn = document.querySelector('.fullscreen-btn');
    btn.innerHTML = document.fullscreenElement ? '⛶ Exit' : '⛶ Fullscreen';
}

async function handleSearch(e) {
    e.preventDefault();
    const query = elements.ddgSearchInput.value.trim();
    if (!query) return;

    try {
        showElement(elements.searchResults);
        hideElement(elements.embedContainer);
        
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://duckduckgo.com/html/?q=${query}`)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        elements.searchResults.innerHTML = '';

        doc.querySelectorAll('.result').forEach(result => {
            const link = result.querySelector('.result__title a'); // Updated selector
            const snippet = result.querySelector('.result__snippet');

            if (!link || !link.href) return;

            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-result';

            const titleLink = document.createElement('a');
            titleLink.href = '#';
            titleLink.textContent = link.textContent;
            
            titleLink.addEventListener('click', (e) => {
                e.preventDefault();
                const realUrl = link.href;
                if (isBlocked(realUrl)) {
                    alert('Content blocked by AdBlock');
                    return;
                }
                elements.embedUrl.value = realUrl;
                embed();
                hideElement(elements.searchResults);
            });

                const copyButton = document.createElement('button');
                copyButton.className = 'copy-button';
                copyButton.textContent = 'Copy URL';
                copyButton.onclick = () => {
                    navigator.clipboard.writeText(realUrl)
                        .then(() => alert('URL copied to clipboard!'))
                        .catch(console.error);
                };

                const snippetDiv = document.createElement('div');
                snippetDiv.className = 'snippet';
                snippetDiv.textContent = snippet?.textContent || '';

                resultDiv.appendChild(titleLink);
                resultDiv.appendChild(copyButton);
                resultDiv.appendChild(snippetDiv);
                elements.searchResults.appendChild(resultDiv);
            }
        });

    } catch (error) {
        alert('Search failed. Please try again.');
    }
}

function showElement(element) {
    element.style.display = 'block';
}

function hideElement(element) {
    element.style.display = 'none';
}

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
    } catch (e) {
        console.error('LocalStorage error:', e);
    }
    
    updateSavedList();
}

initApp();
window.loadEmbed = loadEmbed;
window.deleteEmbed = deleteEmbed;
