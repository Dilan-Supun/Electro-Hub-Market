document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  
  const spinner = document.getElementById('loading-spinner');
  const content = document.getElementById('product-content');
  const details = document.getElementById('details');

  if (!productId || typeof productsData === 'undefined') {
    showError("Product not found or data missing.");
    return;
  }

  const product = productsData.find(p => p.id === productId);

  if (!product) {
    showError("Product not found.");
    return;
  }

  // Populate basic text fields
  document.title = `${product.title} — Electro Hub Market`;
  document.getElementById('meta-description').content = product.description;
  document.getElementById('product-title').textContent = product.title;
  document.getElementById('product-condition').textContent = product.condition;
  document.getElementById('product-description').textContent = product.description;
  
  // Populate meta grid
  document.getElementById('meta-category').textContent = product.category;
  document.getElementById('meta-price').textContent = product.price;

  // WhatsApp Button
  const waBtn = document.getElementById('whatsapp-btn');
  if (waBtn) {
    const waMessage = encodeURIComponent(`Hi, I'm interested in the ${product.title}`);
    waBtn.href = `https://wa.me/94764413256?text=${waMessage}`;
  }

  // Add to Cart Button
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      Cart.add(product);
      // Optional: Visual feedback
      const originalText = addToCartBtn.innerHTML;
      addToCartBtn.innerHTML = '✓ Added to Cart';
      addToCartBtn.style.background = '#065f46';
      setTimeout(() => {
        addToCartBtn.innerHTML = originalText;
        addToCartBtn.style.background = '';
      }, 2000);
    });
  }

  // Populate Features
  const featuresList = document.getElementById('features-list');
  if (product.features && product.features.length > 0) {
    featuresList.innerHTML = product.features.map(f => `<li><span class="dot"></span><span>${f}</span></li>`).join('');
  }

  // Populate Delivery Info
  const deliveryList = document.getElementById('delivery-list');
  if (product.buyingDelivery && product.buyingDelivery.length > 0) {
    deliveryList.innerHTML = product.buyingDelivery.map(d => `<li><span class="dot"></span><span>${d}</span></li>`).join('');
  }

  // Setup Gallery
  setupGallery(product);

  // Show content
  spinner.style.display = 'none';
  content.style.display = 'grid'; // .hero-grid is a grid
  details.style.display = 'block';
});

function setupGallery(product) {
  const galleryContainer = document.getElementById('gallery-container');
  let galleryHtml = '';

  // Main Image Area
  galleryHtml += `
    <img id="main-product-image" src="${product.image || ''}" alt="${product.title}" 
         onerror="this.style.display='none'; document.getElementById('main-svg-fallback').style.display='block';" />
    <svg id="main-svg-fallback" viewBox="0 0 420 315" width="420" height="315" role="img" 
         aria-label="${product.title} illustration" style="display: ${product.image ? 'none' : 'block'}; width: 100%; height: auto;">
      ${product.svg}
    </svg>
  `;

  // Thumbnails Area
  if (product.images && product.images.length > 0) {
    galleryHtml += `<div class="img-grid">`;
    product.images.forEach((imgSrc, index) => {
      galleryHtml += `
        <img class="gallery-thumb ${index === 0 ? 'active' : ''}" 
             src="${imgSrc}" alt="${product.title} view ${index + 1}" 
             onclick="updateMainImage('${imgSrc}', this)"
             onerror="this.style.display='none';" />
      `;
    });
    galleryHtml += `</div>`;
  }

  galleryContainer.innerHTML = galleryHtml;
}

// Global function for gallery clicks
window.updateMainImage = function(src, thumbElement) {
  const mainImg = document.getElementById('main-product-image');
  const mainSvg = document.getElementById('main-svg-fallback');
  
  if (mainImg) {
    mainImg.src = src;
    mainImg.style.display = 'block';
    if(mainSvg) mainSvg.style.display = 'none';
  }

  // Update active state
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  if (thumbElement) thumbElement.classList.add('active');
};

function showError(msg) {
  const spinner = document.getElementById('loading-spinner');
  spinner.innerHTML = `
    <p style="color: var(--color-accent); font-weight: bold;">${msg}</p>
    <a href="index.html" class="btn btn-primary" style="margin-top: var(--space-4);">Return to Home</a>
  `;
}
