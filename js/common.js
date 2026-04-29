function applySettings() {
  if (typeof shopSettings === 'undefined') return;
  
  const s = shopSettings;
  
  // Header
  const headerName = document.getElementById('shop-name-header');
  if (headerName) headerName.textContent = s.shopName;
  
  const headerPhoneText = document.getElementById('header-phone-text');
  const headerPhoneLink = document.getElementById('header-phone-link');
  if (headerPhoneText) headerPhoneText.textContent = s.shopPhone;
  if (headerPhoneLink) headerPhoneLink.href = `tel:${formatPhoneForLink(s.shopPhone)}`;

  // Hero (if exists)
  const heroMotto = document.getElementById('hero-motto');
  if (heroMotto) heroMotto.textContent = s.shopMotto;
  
  const heroSlogan = document.getElementById('hero-slogan');
  if (heroSlogan) heroSlogan.textContent = s.shopSlogan;

  // Contact Section (if exists)
  const contactPhone1 = document.getElementById('contact-phone-1');
  if (contactPhone1) {
    contactPhone1.textContent = s.shopPhone;
    contactPhone1.href = `tel:${formatPhoneForLink(s.shopPhone)}`;
  }
  
  const contactPhone2 = document.getElementById('contact-phone-2');
  if (contactPhone2) {
    if (s.shopPhone2) {
      contactPhone2.textContent = s.shopPhone2;
      contactPhone2.href = `tel:${formatPhoneForLink(s.shopPhone2)}`;
      contactPhone2.style.display = 'block';
    } else {
      contactPhone2.style.display = 'none';
    }
  }

  // Footer
  const footerCopy = document.getElementById('footer-copy');
  if (footerCopy) footerCopy.innerHTML = `&copy; ${new Date().getFullYear()} ${s.shopName} &mdash; Quality Electronics`;

  const footerPhone = document.getElementById('footer-phone');
  if (footerPhone) footerPhone.textContent = s.shopPhone;

  // Logo (Dynamic favicon / brand mark)
  if (s.shopLogoPath) {
    const brandMark = document.querySelector('.brand-mark');
    if (brandMark) {
      brandMark.innerHTML = `<img src="${s.shopLogoPath}" alt="Logo" style="width:100%; height:100%; object-fit:contain; border-radius:4px;">`;
    }

    const hugeContainer = document.getElementById('shop-image-huge-container');
    if (hugeContainer) {
      hugeContainer.innerHTML = `<img src="${s.shopLogoPath}" alt="${s.shopName}" style="max-width: 320px; height: auto; border-radius: var(--radius-xl); box-shadow: var(--shadow-lg);">`;
      hugeContainer.style.display = 'block';
    }
  }
}

// Helper to format phone for tel: links
function formatPhoneForLink(phone) {
  if (!phone) return '';
  return String(phone).replace(/\s/g, '').replace(/[^0-9+]/g, '');
}

// Ensure settings are applied on every page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applySettings);
} else {
  applySettings();
}
