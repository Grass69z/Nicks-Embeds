const config = {
    adBlock: {
        enabled: localStorage.getItem('adBlockEnabled') !== 'false',
        blockedDomains: [
            'doubleclick.net', 'googleads.com', 'googlesyndication.com',
            'adservice.google.com', 'ads.youtube.com', 'adserver.com',
            'tracking.com', 'advertising.com', 'taboola.com', 'outbrain.com'
        ],
        blockedPaths: ['/ad', '/ads', '/track', '/analytics']
    },
    darkMode: localStorage.getItem('darkModeEnabled') === 'true'
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
    ddgSearchInput: document.getElementById('ddgSearchInput')
};

function initApp() {
    initDarkMode();
    updateSavedList();
    updateAdBlockToggle();
    addEventListeners();
}

function addEventListeners() {
    elements.embedButton.addEventListener('click', embedGame);
    elements.saveButton.addEventListener('click', saveEmbed);
    elements.adblockToggle.addEventListener('click', toggleAdBlock);
    elements.darkModeToggle.addEventListener('click', toggleDarkMode);
    elements.gameUrl.addEventListener('keypress', e => e.key === 'Enter' && embedGame());
    elements.ddgSearchForm.addEventListener('submit', handleSearch);
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

function updateAdBlockToggle() {
    elements.adblockToggle.textContent = `AdBlock: ${config.adBlock.enabled ? 'ON' : 'OFF'}`;
    elements.adblockToggle.classList.toggle('active', config.adBlock.enabled);
}

function isBlocked(url) {
    if (!config.adBlock.enabled) return false;
    const { hostname, pathname } = new URL(url);
    return config.adBlock.blockedDomains.some(d => hostname.includes(d)) ||
           config.adBlock.blockedPaths.some(p => pathname.includes(p));
}

function embedGame() {
    showElement(elements.gameContainer);
    hideElement(elements.searchResults);
    
    const url = elements.gameUrl.value;
    if (!url) return alert('Please enter a URL');

    try {
        if (isBlocked(url)) return alert('Content blocked by AdBlock');
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.allow = "fullscreen";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'fullscreen-btn';
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.onclick = toggleFullscreen;

        elements.gameContainer.innerHTML = '';
        elements.gameContainer.appendChild(iframe);
        elements.gameContainer.appendChild(fullscreenBtn);

        // Add resize observer for centering
        const resizeObserver = new ResizeObserver(() => {
            iframe.style.margin = 'auto';
        });
        resizeObserver.observe(elements.gameContainer);

        document.addEventListener('fullscreenchange', updateFullscreenButton);

    } catch {
        alert('Invalid URL');
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        elements.gameContainer.requestFullscreen().catch(err => {
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
        hideElement(elements.gameContainer);
        
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://duckduckgo.com/html/?q=${query}`)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        elements.searchResults.innerHTML = `
            <style>
                .search-result { margin: 15px 0; padding: 10px; border-bottom: 1px solid #ddd; }
                .search-result a { color: #1a0dab; text-decoration: none; }
                .search-result .snippet { color: #545454; font-size: 14px; }
                .dark-mode .search-result { border-color: #444; }
                .dark-mode .search-result a { color: #8ab4f8; }
                .dark-mode .search-result .snippet { color: #bdc1c6; }
            </style>
            ${data.contents}
        `;
        
        elements.searchResults.querySelectorAll('a').forEach(link => {
            const originalHref = link.href;
            link.href = '#';
            link.onclick = () => {
                elements.ddgSearchInput.value = originalHref;
                handleSearch(e);
                return false;
            };
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
    const url = elements.embedUrl.value;
    const title = elements.embedTitle.value || new URL(url).hostname;
    
    if (!url) return alert('No embed to save');
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
