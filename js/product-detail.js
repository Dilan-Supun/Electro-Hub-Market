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
  
  // Update UI
  let displayPrice = "Contact for Price";
  if (product.price !== null && product.price !== undefined) {
    displayPrice = product.price.toString().startsWith('Rs.') ? product.price : `Rs. ${product.price.toLocaleString()}`;
  }
  
  document.getElementById('product-title').textContent = product.title;
  document.getElementById('product-condition').textContent = product.condition;
  document.getElementById('product-description').textContent = product.description;
  document.getElementById('meta-category').textContent = product.category;
  document.getElementById('meta-price').textContent = displayPrice;
  
  // Stock status
  const stockEl = document.getElementById('product-stock-status');
  const stockCount = parseInt(product.stock) || 0;
  if (stockCount > 0) {
    stockEl.innerHTML = `<span style="color: #059669;">● In Stock: ${stockCount} available</span>`;
  } else {
    stockEl.innerHTML = `<span style="color: #dc2626;">● Out of Stock</span>`;
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.disabled = true;
      addToCartBtn.innerHTML = 'Out of Stock';
      addToCartBtn.style.opacity = '0.5';
      addToCartBtn.style.cursor = 'not-allowed';
    }
  }

  // WhatsApp Button
  const waBtn = document.getElementById('whatsapp-btn');
  if (waBtn) {
    const shopPhone = (typeof shopSettings !== 'undefined' && shopSettings.shopPhone) ? formatPhoneForLink(shopSettings.shopPhone) : "94764413256";
    const waMessage = encodeURIComponent(`Hi, I'm interested in the ${product.title}`);
    waBtn.href = `https://wa.me/${shopPhone.startsWith('0') ? '94' + shopPhone.substring(1) : shopPhone}?text=${waMessage}`;
  }

  // Add to Cart Button
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      try {
        Cart.add(product);
        // Visual feedback
        const originalHtml = addToCartBtn.innerHTML;
        addToCartBtn.innerHTML = '✓ Added! <span style="margin-left:8px; text-decoration:underline;">View Cart</span>';
        addToCartBtn.classList.add('btn-success');
        
        // After 3 seconds, if they haven't clicked to view cart, reset but keep count updated
        setTimeout(() => {
          if (addToCartBtn.innerHTML.includes('View Cart')) {
            addToCartBtn.innerHTML = originalHtml;
            addToCartBtn.classList.remove('btn-success');
          }
        }, 4000);

        // If they click again while it says "View Cart", take them to cart
        addToCartBtn.onclick = (e) => {
          if (addToCartBtn.innerHTML.includes('View Cart')) {
            window.location.href = 'cart.html';
          }
        };
      } catch (err) {
        console.error("Cart Error:", err);
        alert("Could not add to cart. Please ensure cookies/local storage are enabled.");
      }
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
