function initProducts() {
  try {
    // Read from the global variable defined in products-data.js
    const products = typeof productsData !== 'undefined' ? productsData : [];
    
    const grid = document.getElementById('product-grid');
    const searchInput = document.getElementById('product-search');
    const filterButtons = document.querySelectorAll('[data-filter]');
    
    let currentFilter = 'all';
    let searchQuery = '';

    function renderProducts() {
      const filtered = products.filter(p => {
        const matchesFilter = currentFilter === 'all' || p.category === currentFilter;
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              p.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
      });

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: var(--space-12) 0;">
            <p style="color: var(--color-text-muted); font-size: var(--text-lg);">No products found matching your search.</p>
            <button class="btn btn-secondary" style="margin-top: var(--space-4);" onclick="document.getElementById('product-search').value=''; document.getElementById('product-search').dispatchEvent(new Event('input'));">Clear search</button>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(p => `
        <a class="product-card" href="${p.link}">
          <div class="product-card-thumb">
            ${p.image ? `<img src="${p.image}" alt="${p.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />` : ''}
            <svg viewBox="0 0 420 315" width="420" height="315" role="img" aria-label="${p.title} illustration" style="display: ${p.image ? 'none' : 'block'};">
              ${p.svg}
            </svg>
          </div>
          <div class="product-card-body">
            <div class="product-card-title">${p.title}</div>
            <div class="product-card-meta">
              <span class="badge badge-new">${p.condition}</span>
              <span>${p.meta}</span>
            </div>
            <p style="font-size:var(--text-sm); color:var(--color-text-muted); flex:1;">${p.description}</p>
            <div class="product-card-price">${p.price}</div>
          </div>
          <div class="product-card-footer">
            <span class="btn btn-primary" style="width:100%; justify-content:center;">View details &rarr;</span>
          </div>
        </a>
      `).join('');
    }

    // Search event
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderProducts();
    });

    // Filter events
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        renderProducts();
      });
    });

    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initProducts();
});
