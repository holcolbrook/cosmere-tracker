const SHEET_ID = '1WzQvprVxAsCBbXz0LNRTJAHDSvPRa1KdknBBJfpu9ek';
const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=0`;

let localBookData = []; // Storage to avoid redundant fetching

document.addEventListener('DOMContentLoaded', () => fetchData());

async function fetchData() {
    try {
        const res = await fetch(base);
        const text = await res.text();
        const json = JSON.parse(text.substr(47).slice(0, -2));
        localBookData = json.table.rows;
        renderMap(localBookData);
    } catch (e) {
        console.error("Fetch failed. Check Sheet ID and Permissions.", e);
    }
}

function renderMap(rows) {
    const container = document.getElementById('book-list');
    const orderType = document.getElementById('order-select').value;
    container.innerHTML = '';
    
    const savedProgress = JSON.parse(localStorage.getItem('cosmereProgress')) || {};
    const readTitles = Object.keys(savedProgress).filter(t => savedProgress[t]);

    if (orderType === 'publication') {
        // Linear View
        const grid = document.createElement('div');
        grid.className = 'book-grid';
        rows.forEach(row => {
            if (row.c && row.c[1]) grid.appendChild(createBookCard(row, savedProgress, readTitles));
        });
        container.appendChild(grid);
    } else {
        // Tiered View
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
            });
            tierDiv.appendChild(grid);
            container.appendChild(tierDiv);
        });
    }
    updateProgress();
}

function createBookCard(row, savedProgress, readTitles) {
    const title = row.c[1].v;
    const imgUrl = row.c[6]?.v || "https://via.placeholder.com/150x220?text=No+Cover";
    const reqs = row.c[8]?.v ? row.c[8].v.split(',').map(s => s.trim()) : [];
    const suggs = row.c[9]?.v ? row.c[9].v.split(',').map(s => s.trim()) : [];
    
    const isRead = savedProgress[title] || false;
    const missingReqs = reqs.filter(r => !readTitles.includes(r));
    const missingSuggs = suggs.filter(s => !readTitles.includes(s));
    
    const isLocked = missingReqs.length > 0 && !isRead;
    const isWarned = !isLocked && missingSuggs.length > 0 && !isRead;

    const card = document.createElement('div');
    card.className = `book-card ${isRead ? 'read' : ''} ${isLocked ? 'locked' : ''} ${isWarned ? 'warning' : ''}`;
    
    card.innerHTML = `
        <div class="card-content">
            <input type="checkbox" ${isRead ? 'checked' : ''} onchange="toggleRead('${title.replace(/'/g, "\\'")}', this)">
            <img src="${imgUrl}" alt="${title}" class="book-cover">
            <div class="book-title">${title}</div>
            ${isLocked ? `<div class="status-badge lock">🔒 Needs: ${missingReqs[0]}</div>` : ''}
            ${isWarned ? `<div class="status-badge suggest">⚠️ Tip: ${missingSuggs[0]}</div>` : ''}
        </div>
    `;
    return card;
}

function toggleRead(title, checkbox) {
    const savedProgress = JSON.parse(localStorage.getItem('cosmereProgress')) || {};
    savedProgress[title] = checkbox.checked;
    localStorage.setItem('cosmereProgress', JSON.stringify(savedProgress));
    renderMap(localBookData); 
}

function updateProgress() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const checked = Array.from(checkboxes).filter(c => c.checked).length;
    const percent = checkboxes.length > 0 ? Math.round((checked / checkboxes.length) * 100) : 0;
    document.getElementById('progress-bar').style.width = percent + '%';
    document.getElementById('progress-text').innerText = `Cosmere Completion: ${percent}%`;
}
