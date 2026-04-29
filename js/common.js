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
      hugeContainer.innerHTML = `<img src="${s.shopLogoPath}" alt="${s.shopName}" style="max-width: 480px; width: 100%; height: auto; border-radius: var(--radius-2xl); box-shadow: var(--shadow-xl); transform: perspective(1000px) rotateY(-5deg); transition: transform 0.5s ease;">`;
      hugeContainer.style.display = 'block';
    }
  }

  // Floating WhatsApp update
  const floatingWa = document.getElementById('floating-wa');
  if (floatingWa && s.shopPhone) {
    const cleanPhone = String(s.shopPhone).replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '94' + cleanPhone.substring(1) : cleanPhone;
    floatingWa.href = `https://wa.me/${waPhone}?text=Hello ${s.shopName}! I'm interested in your products.`;
  }
}

// Helper to format phone for tel: links
function formatPhoneForLink(phone) {
  if (!phone) return '';
  return String(phone).replace(/\s/g, '').replace(/[^0-9+]/g, '');
}

function addFloatingWhatsApp() {
  if (document.getElementById('floating-wa')) return;
  const waBtn = document.createElement('a');
  waBtn.id = 'floating-wa';
  waBtn.target = '_blank';
  waBtn.innerHTML = `
    <div style="display: grid; place-items: center; width: 100%; height: 100%;">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
    </div>
  `;
  
  Object.assign(waBtn.style, {
    position: 'fixed',
    bottom: '32px',
    right: '32px',
    width: '68px',
    height: '68px',
    backgroundColor: '#25D366',
    borderRadius: '50%',
    color: 'white',
    boxShadow: '0 8px 32px rgba(37, 211, 102, 0.4)',
    zIndex: '10000',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer'
  });
  
  waBtn.onmouseenter = () => {
    waBtn.style.transform = 'scale(1.1) rotate(5deg)';
    waBtn.style.boxShadow = '0 12px 40px rgba(37, 211, 102, 0.6)';
  };
  waBtn.onmouseleave = () => {
    waBtn.style.transform = 'scale(1) rotate(0deg)';
    waBtn.style.boxShadow = '0 8px 32px rgba(37, 211, 102, 0.4)';
  };
  
  document.body.appendChild(waBtn);
}

// Ensure settings are applied on every page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    addFloatingWhatsApp();
    applySettings();
  });
} else {
  addFloatingWhatsApp();
  applySettings();
}
