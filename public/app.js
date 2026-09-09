/* =============================================
   Automotive & Transport Solutions
   Frontend logic — talks to the live API
   ============================================= */

const API_BASE = "/api";

function formatPrice(num) {
    return "KSh " + Number(num).toLocaleString("en-KE");
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
}

/* Generic car-outline SVG reused for every vehicle card */
function carSvgMarkup() {
    return `<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 75 L35 45 C42 37 55 33 68 33 L140 33 C155 33 165 39 173 48 L188 75 Z" fill="none" stroke="var(--steel)" stroke-width="3"/>
        <circle cx="55" cy="75" r="13" fill="var(--paper)" stroke="var(--steel)" stroke-width="3"/>
        <circle cx="153" cy="75" r="13" fill="var(--paper)" stroke="var(--steel)" stroke-width="3"/>
    </svg>`;
}

async function fetchVehicles() {
    try {
        const res = await fetch(`${API_BASE}/vehicles`);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Could not load vehicles:", e);
        return [];
    }
}

async function fetchParts() {
    try {
        const res = await fetch(`${API_BASE}/parts`);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Could not load parts:", e);
        return [];
    }
}

/* =============================================
   Public site rendering (index.html)
   ============================================= */
async function renderVehiclesOnSite() {
    const grid = document.getElementById("vehicle-grid");
    if (!grid) return;
    const vehicles = await fetchVehicles();
    if (vehicles.length === 0) {
        grid.innerHTML = `<p class="empty-msg">No vehicles listed right now &mdash; check back soon.</p>`;
        return;
    }
    grid.innerHTML = vehicles.map(v => `
        <article class="vehicle-card">
            <div class="vehicle-media" aria-hidden="true">${carSvgMarkup()}</div>
            <div class="vehicle-body">
                <h3>${escapeHtml(v.name)}</h3>
                <ul class="spec-row">
                    <li>${escapeHtml(String(v.year))}</li><li>${escapeHtml(v.mileage)}</li><li>${escapeHtml(v.fuel)}</li><li>${escapeHtml(v.transmission)}</li>
                </ul>
                <div class="plate-tag"><span class="plate-strip">KE</span><span class="plate-value">${formatPrice(v.price)}</span></div>
                <a href="#contact" class="btn btn-outline btn-sm">Enquire</a>
            </div>
        </article>
    `).join("");
}

async function renderPartsOnSite() {
    const list = document.getElementById("parts-list");
    if (!list) return;
    const parts = await fetchParts();
    const headerRow = `<li class="parts-row parts-head"><span>Part</span><span>Fits</span><span>SKU</span><span>Price</span></li>`;
    if (parts.length === 0) {
        list.innerHTML = headerRow + `<li class="parts-row"><span>No parts in stock right now.</span></li>`;
        return;
    }
    const rows = parts.map(p => `
        <li class="parts-row">
            <span>${escapeHtml(p.name)}</span><span>${escapeHtml(p.fits)}</span><span class="sku">${escapeHtml(p.sku)}</span><span class="price">${formatPrice(p.price)}</span>
        </li>
    `).join("");
    list.innerHTML = headerRow + rows;
}

document.addEventListener("DOMContentLoaded", function () {
    renderVehiclesOnSite();
    renderPartsOnSite();
});
