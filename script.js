const SHEET_ID = '1WzQvprVxAsCBbXz0LNRTJAHDSvPRa1KdknBBJfpu9ek';
const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=0`;

document.addEventListener('DOMContentLoaded', () => fetchData());

async function fetchData() {
    try {
        const res = await fetch(base);
        const text = await res.text();
        const json = JSON.parse(text.substr(47).slice(0, -2));
        renderMap(json.table.rows);
    } catch (e) {
        console.error("Fetch failed. Make sure your sheet is Published to Web.", e);
    }
}

function renderMap(rows) {
    const container = document.getElementById('book-list');
    container.innerHTML = '';
    
    const savedProgress = JSON.parse(localStorage.getItem('cosmereProgress')) || {};
    const readTitles = Object.keys(savedProgress).filter(t => savedProgress[t]);

    // Grouping by Tier (Col H / Index 7)
    const tiers = {};
    rows.forEach(row => {
        if (!row.c || !row.c[1]) return;
        const tierNum = row.c[7] ? row.c[7].v : 1;
        if (!tiers[tierNum]) tiers[tierNum] = [];
        tiers[tierNum].push(row);
    });

    const sortedTiers = Object.keys(tiers).sort((a, b) => a - b);

    sortedTiers.forEach(tier => {
        const tierDiv = document.createElement('div');
        tierDiv.className = 'tier-section';
        tierDiv.innerHTML = `<h2 class="tier-title">Tier ${tier}</h2>`;
        
        const grid = document.createElement('div');
        grid.className = 'book-grid';

        tiers[tier].forEach(row => {
            const title = row.c[1].v;
            const imgUrl = row.c[6] && row.c[6].v ? row.c[6].v : "https://via.placeholder.com/150x220?text=No+Cover";
            
            // Logic for requirements and suggestions
            const reqStr = row.c[8] ? row.c[8].v : "";
            const suggStr = row.c[9] ? row.c[9].v : "";
            
            const reqs = reqStr ? reqStr.split(',').map(s => s.trim()) : [];
            const suggs = suggStr ? suggStr.split(',').map(s => s.trim()) : [];
            
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
                    ${isLocked ? `<div class="status-badge lock">🔒 Needs: ${missingReqs.join(', ')}</div>` : ''}
                    ${isWarned ? `<div class="status-badge suggest">⚠️ Suggest: ${missingSuggs.join(', ')}</div>` : ''}
                </div>
            `;
            grid.appendChild(card);
        });
        
        tierDiv.appendChild(grid);
        container.appendChild(tierDiv);
    });
    updateProgress();
}

function toggleRead(title, checkbox) {
    const savedProgress = JSON.parse(localStorage.getItem('cosmereProgress')) || {};
    savedProgress[title] = checkbox.checked;
    localStorage.setItem('cosmereProgress', JSON.stringify(savedProgress));
    fetchData(); // Refresh the map to unlock new books
}

function updateProgress() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const checked = Array.from(checkboxes).filter(c => c.checked).length;
    const percent = checkboxes.length > 0 ? Math.round((checked / checkboxes.length) * 100) : 0;
    
    document.getElementById('progress-bar').style.width = percent + '%';
    document.getElementById('progress-text').innerText = `Cosmere Completion: ${percent}%`;
}
