const SHEET_ID = 'YOUR_SPREADSHEET_ID';
const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

document.addEventListener('DOMContentLoaded', () => {
    fetch(base)
        .then(res => res.text())
        .then(data => {
            const json = JSON.parse(data.substr(47).slice(0, -2));
            const rows = json.table.rows;
            renderBooks(rows);
        });
});

function renderBooks(rows) {
    const list = document.getElementById('book-list');
    const savedProgress = JSON.parse(localStorage.getItem('cosmereProgress')) || {};

    rows.forEach((row, index) => {
        const title = row.c[1].v;
        const series = row.c[2].v;
        const year = row.c[3].v;
        const planet = row.c[4].v;
        const isRead = savedProgress[title] || false;

        const card = document.createElement('div');
        card.className = `book-card ${isRead ? 'read' : ''}`;
        card.innerHTML = `
            <input type="checkbox" ${isRead ? 'checked' : ''} onchange="toggleRead('${title}', this)">
            <div>
                <strong>${title}</strong> (${year})<br>
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

    document.getElementById('progress-bar').style.width = percent + '%';
    document.getElementById('progress-text').innerText = `You have completed ${percent}% of the Cosmere.`;
}