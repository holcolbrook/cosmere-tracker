const SHEET_ID = '1WzQvprVxAsCBbXz0LNRTJAHDSvPRa1KdknBBJfpu9ek';
const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=0`;

document.addEventListener('DOMContentLoaded', () => {
    fetch(base)
        .then(res => res.text())
        .then(data => {
            const json = JSON.parse(data.substr(47).slice(0, -2));
            const rows = json.table.rows;
            renderBooks(rows);
        })
        .catch(err => console.error("Error fetching sheet:", err));
});

function renderBooks(rows) {
    const list = document.getElementById('book-list');
    const savedProgress = JSON.parse(localStorage.getItem('cosmereProgress')) || {};
    list.innerHTML = ''; 

    rows.forEach((row) => {
        if (!row.c || !row.c[1]) return; 

        const title = row.c[1].v;
        const series = row.c[2] ? row.c[2].v : "Series";
        const year = row.c[3] ? row.c[3].v : "";
        const planet = row.c[4] ? row.c[4].v : "Unknown";
        // Pulling from Column G (index 6)
        const imgUrl = row.c[6] && row.c[6].v ? row.c[6].v : "https://via.placeholder.com/80x120?text=No+Cover";
        
        const isRead = savedProgress[title] || false;

        const card = document.createElement('div');
        card.className = `book-card ${isRead ? 'read' : ''}`;
        card.innerHTML = `
            <input type="checkbox" ${isRead ? 'checked' : ''} onchange="toggleRead('${title.replace(/'/g, "\\'")}', this)">
            <img src="${imgUrl}" alt="${title}" class="book-cover">
            <div class="book-info">
                <strong>${title}</strong> ${year ? `(${year})` : ''}<br>
                <span class="tag">${series}</span> <span class="tag">${planet}</span>
            </div>
        `;
        list.appendChild(card);
    });
    updateProgress();
}

function toggleRead(title, checkbox) {
    const savedProgress = JSON.parse(localStorage.getItem('cosmereProgress')) || {};
    savedProgress[title] = checkbox.checked;
    localStorage.setItem('cosmereProgress', JSON.stringify(savedProgress));
    
    checkbox.parentElement.classList.toggle('read');
    updateProgress();
}

function updateProgress() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const total = checkboxes.length;
    const checked = Array.from(checkboxes).filter(c => c.checked).length;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = percent + '%';
    
    const text = document.getElementById('progress-text');
    if (text) text.innerText = `You have completed ${percent}% of the Cosmere journey.`;
}
