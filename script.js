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
    embedButton: document.getElementById('embedButton'),
    saveButton: document.getElementById('saveButton'),
    embedTitle: document.getElementById('embedTitle'),
    ddgSearchForm: document.getElementById('ddgSearchForm'),
    ddgSearchInput: document.getElementById('ddgSearchInput'),
    proxyHelp: document.getElementById('proxyHelp')
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
    elements.adblockToggle.classList.toggle('active', config.adBlock.enabled);
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
    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
        elements.embedUrl.value = url;
    }

try {
        if (isBlocked(url)) return alert('Content blocked by AdBlock');
        
        // === Add proxy code here ===
        const proxyUrl = `https://nicks-embeds.vercel.app/?=${encodeURIComponent(url)}`;
        const iframe = document.createElement('iframe');
        iframe.src = proxyUrl;
        iframe.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation";
        iframe.allow = "fullscreen";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'fullscreen-btn';
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.onclick = toggleFullscreen;

        elements.embedContainer.innerHTML = '';
        elements.embedContainer.appendChild(iframe);
        elements.embedContainer.appendChild(fullscreenBtn);

        const resizeObserver = new ResizeObserver(() => {
            iframe.style.margin = 'auto';
        });
        resizeObserver.observe(elements.embedContainer);

        document.addEventListener('fullscreenchange', updateFullscreenButton);

        // Error handling
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

    } catch {
        alert('Invalid URL');
    }
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
    btn.innerHTML = document.fullscreenElement ? '⛶' : '⛶';
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
            const link = result.querySelector('.result__a');
            const snippet = result.querySelector('.result__snippet');

            if (link && link.href) {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'search-result';

                const url = new URL(link.href);
                const realUrl = decodeURIComponent(url.searchParams.get('uddg') || link.href);

                const titleLink = document.createElement('a');
                titleLink.href = '#';
                titleLink.textContent = link.textContent;
                
                titleLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (isBlocked(realUrl)) return alert('Content blocked by AdBlock');
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
    let url = elements.embedUrl.value.trim();
    if (!url) return alert('No embed to save');

    // Auto-add https:// if missing
    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
        elements.embedUrl.value = url;
    }
    
    const title = elements.embedTitle.value || new URL(url).hostname;
    
    if (savedEmbeds.some(e => e.url === url)) return alert('Already saved');

    savedEmbeds.push({ title, url, date: new Date().toISOString() });
    localStorage.setItem('savedEmbeds', JSON.stringify(savedEmbeds));
    updateSavedList();
}

function updateSavedList() {
    elements.savedList.innerHTML = savedEmbeds.map((embed, index) => `
        <div class="saved-embed-item">
            <span>${embed.title}</span>
            <div>
                <button onclick="loadEmbed(${index})">Load</button>
                <button class="delete-btn" onclick="deleteEmbed(${index})">Delete</button>
            </div>
        </div>
    `).join('');
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

initApp();
