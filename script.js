const SHEET_ID = '1WzQvprVxAsCBbXz0LNRTJAHDSvPRa1KdknBBJfpu9ek';
const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=0`;

let localBookData = []; 

document.addEventListener('DOMContentLoaded', () => {
    const selectEl = document.getElementById('order-select');
    if (selectEl) {
        selectEl.addEventListener('change', () => renderMap(localBookData));
    }
    fetchData();
});

async function fetchData() {
    try {
        const res = await fetch(base);
        const text = await res.text();
        const json = JSON.parse(text.substr(47).slice(0, -2));
        localBookData = json.table.rows;
        renderMap(localBookData);
    } catch (e) {
        console.error("Fetch failed. Ensure sheet is published.", e);
    }
}

function renderMap(rows) {
    const container = document.getElementById('book-list');
    const nextStopContainer = document.getElementById('next-stop-container');
    const orderSelect = document.getElementById('order-select');
    const orderType = orderSelect ? orderSelect.value : 'tier';
    
    if (!container) return;
    container.innerHTML = '';
    if (nextStopContainer) nextStopContainer.innerHTML = '';
    
    const savedProgress = JSON.parse(localStorage.getItem('cosmereProgress')) || {};
    const readTitles = Object.keys(savedProgress).filter(t => savedProgress[t]);

    // Track the "Next Stop" candidate
    let nextStopBook = null;

    if (orderType === 'publication') {
        const grid = document.createElement('div');
        grid.className = 'book-grid';
        rows.forEach(row => {
            if (row.c && row.c[1]) {
                const card = createBookCard(row, savedProgress, readTitles);
                grid.appendChild(card);
                
                // First unread book in publication order is the next stop
                if (!nextStopBook && !savedProgress[row.c[1].v]) {
                    nextStopBook = row;
                }
            }
        });
        container.appendChild(grid);
    } else {
        const tiers = {};
        rows.forEach(row => {
            if (!row.c || !row.c[1]) return;
            const tierNum = row.c[7] ? row.c[7].v : 1;
            if (!tiers[tierNum]) tiers[tierNum] = [];
            tiers[tierNum].push(row);
        });

        Object.keys(tiers).sort((a, b) => a - b).forEach(tier => {
            const tierDiv = document.createElement('div');
            tierDiv.className = 'tier-section';
            tierDiv.innerHTML = `<h2 class="tier-title">Tier ${tier}</h2>`;
            const grid = document.createElement('div');
            grid.className = 'book-grid';
            
            tiers[tier].forEach(row => {
                grid.appendChild(createBookCard(row, savedProgress, readTitles));
                
                // Find next stop: first unread in the current lowest uncompleted tier
                if (!nextStopBook && !savedProgress[row.c[1].v]) {
                    nextStopBook = row;
                }
            });
            tierDiv.appendChild(grid);
            container.appendChild(tierDiv);
        });
    }

    if (nextStopBook && nextStopContainer) {
        renderNextStop(nextStopBook, nextStopContainer, savedProgress, readTitles);
    }
    updateProgress();
}

function renderNextStop(row, container, savedProgress, readTitles) {
    container.innerHTML = `
        <div class="next-stop-card">
            <div class="next-stop-label">Recommended Next Stop</div>
            <div class="next-stop-content">
                ${createBookCard(row, savedProgress, readTitles).innerHTML}
            </div>
        </div>
    `;
}

function createBookCard(row, savedProgress, readTitles) {
    const title = row.c[1].v;
    const series = row.c[2]?.v || "Other"; 
    const imgUrl = row.c[6]?.v || "https://via.placeholder.com/150x220?text=No+Cover";
    
    const seriesLower = series.toLowerCase();
    let planetClass = 'default';

    if (seriesLower.includes('mistborn')) planetClass = 'scadrial';
    else if (seriesLower.includes('stormlight')) planetClass = 'roshar';
    else if (seriesLower.includes('elantris')) planetClass = 'sel';
    else if (seriesLower.includes('warbreaker')) planetClass = 'nalthis';
    else if (seriesLower.includes('white sand')) planetClass = 'taldain';
    else if (seriesLower.includes('tress')) planetClass = 'lumar';
    else if (seriesLower.includes('yumi')) planetClass = 'komashi';
    else if (seriesLower.includes('sunlit')) planetClass = 'canticle';

    const reqs = row.c[8]?.v ? row.c[8].v.split(',').map(s => s.trim()) : [];
    const suggs = row.c[9]?.v ? row.c[9].v.split(',').map(s => s.trim()) : [];
    
    const isRead = savedProgress[title] || false;
    const missingReqs = reqs.filter(r => !readTitles.includes(r));
    const missingSuggs = suggs.filter(s => !readTitles.includes(s));
    
    const isLocked = missingReqs.length > 0 && !isRead;
    const isWarned = !isLocked && missingSuggs.length > 0 && !isRead;

    const card = document.createElement('div');
    card.className = `book-card ${isRead ? 'read' : ''} ${isLocked ? 'locked' : ''} ${isWarned ? 'warning' : ''} planet-${planetClass}`;
    
    const safeTitle = title.replace(/'/g, "\\'");

    card.innerHTML = `
        <div class="planet-banner">${series}</div>
        <div class="card-content">
            <input type="checkbox" ${isRead ? 'checked' : ''} onchange="toggleRead('${safeTitle}', this)">
            <img src="${imgUrl}" alt="${title}" class="book-cover">
            <div class="book-title">${title}</div>
            ${isLocked ? `<div class="status-badge lock">🔒 Needs: ${missingReqs[0]}</div>` : ''}
            ${isWarned ? `<div class="status-badge suggest">⚠️ Tip: ${missingSuggs[0]}</div>` : ''}
        </div>
    `;
    return card;
}

window.toggleRead = function(title, checkbox) {
    const savedProgress = JSON.parse(localStorage.getItem('cosmereProgress')) || {};
    savedProgress[title] = checkbox.checked;
    localStorage.setItem('cosmereProgress', JSON.stringify(savedProgress));
    renderMap(localBookData); 
}

function updateProgress() {
    const checkboxes = document.querySelectorAll('#book-list input[type="checkbox"]');
    const checked = Array.from(checkboxes).filter(c => c.checked).length;
    const percent = checkboxes.length > 0 ? Math.round((checked / checkboxes.length) * 100) : 0;
    
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    
    if (bar) bar.style.width = percent + '%';
    if (text) text.innerText = `Cosmere Completion: ${percent}%`;
}
