const db = require('../utils/db');
const sqlite = require('../utils/sqlite');

function fmt(n) {
    return `Rs. ${parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_COLORS = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#ef4444'
};

const documentController = {
    async invoice(req, res) {
        try {
            const { id } = req.params;
            const order = await sqlite.getOrderById(id);
            if (!order) return res.status(404).json({ error: 'Order not found' });

            const settings = await db.getSettings();
            const shop = {
                name: settings.shopName || 'Electro Hub',
                address: settings.shopAddress || '',
                phone: settings.shopPhone || '',
                email: settings.shopEmail || '',
                website: settings.shopWebsite || 'www.electrohub.lk',
                logoPath: settings.watermarkLogoPath || null
            };

            const statusColor = STATUS_COLORS[order.status] || '#64748b';

            const rows = order.items.map(item => `
                <tr>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0;">${item.title}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:center;">${item.qty}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:right;">${fmt(item.unitPrice)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:600;">${fmt(item.qty * item.unitPrice)}</td>
                </tr>
            `).join('');

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice – ${order.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #0f172a; background: #f8fafc; }
  .page { max-width: 780px; margin: 30px auto; background: white; padding: 48px; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
  @media print {
    body { background: white; }
    .page { margin: 0; padding: 32px; box-shadow: none; border-radius: 0; max-width: 100%; }
    .no-print { display: none !important; }
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
  .shop-logo { max-height: 80px; max-width: 280px; object-fit: contain; margin-bottom: 6px; }
  .shop-name { font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
  .shop-meta { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.7; }
  .invoice-meta { text-align: right; }
  .invoice-id { font-size: 20px; font-weight: 700; color: #0f172a; }
  .invoice-date { font-size: 12px; color: #64748b; margin-top: 4px; }
  .status-pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 8px; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
  .party-box { background: #f8fafc; padding: 16px 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
  .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 8px; }
  .party-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .party-detail { font-size: 12px; color: #64748b; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  thead th:last-child, thead th:nth-child(3) { text-align: right; }
  thead th:nth-child(2) { text-align: center; }
  .totals { width: 280px; margin-left: auto; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #64748b; }
  .total-row.grand { font-size: 16px; font-weight: 700; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 10px; margin-top: 4px; }
  .notes { margin-top: 32px; padding: 14px 18px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 12px; color: #78350f; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  .btn-print { display: block; margin: 24px auto 0; padding: 10px 32px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .btn-print:hover { background: #1d4ed8; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      ${shop.logoPath ? `<img src="/${shop.logoPath}" class="shop-logo" alt="logo">` : `<div class="shop-name">${shop.name}</div>`}
      <div class="shop-meta">${[shop.address, shop.phone, shop.email, shop.website].filter(Boolean).join(' &nbsp;|&nbsp; ')}</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-id">INVOICE</div>
      <div class="invoice-date"># ${order.id}</div>
      <div class="invoice-date">Date: ${fmtDate(order.createdAt)}</div>
      <span class="status-pill">${order.status}</span>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="party-label">From (Seller)</div>
      <div class="party-name">${shop.name}</div>
      <div class="party-detail">${shop.address ? shop.address.replace(/,/g, ',<br>') : ''}</div>
      ${shop.phone ? `<div class="party-detail">📞 ${shop.phone}</div>` : ''}
      ${shop.website ? `<div class="party-detail">🌐 ${shop.website}</div>` : ''}
      ${shop.email ? `<div class="party-detail">✉ ${shop.email}</div>` : ''}
    </div>
    <div class="party-box">
      <div class="party-label">Bill To (Customer)</div>
      <div class="party-name">${order.customerName} ${order.customerId ? `<span style="font-size:11px; font-weight:400; color:#94a3b8;">(${order.customerId})</span>` : ''}</div>
      <div class="party-detail">${order.customerAddress ? order.customerAddress.replace(/,/g, ',<br>') : ''}</div>
      ${order.customerPhone ? `<div class="party-detail">📞 Primary: ${order.customerPhone}</div>` : ''}
      ${order.customerPhone2 ? `<div class="party-detail">📞 Secondary: ${order.customerPhone2}</div>` : ''}
      ${order.customerEmail ? `<div class="party-detail">✉ ${order.customerEmail}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${fmt(order.subtotal)}</span></div>
    <div class="total-row"><span>Shipping</span><span>${fmt(order.shippingFee)}</span></div>
    <div class="total-row grand"><span>Total</span><span>${fmt(order.total)}</span></div>
  </div>

  ${order.notes ? `<div class="notes"><strong>Notes:</strong> ${order.notes}</div>` : ''}

  <div class="footer">Thank you for shopping with ${shop.name} &bull; ${shop.website} &bull; Generated on ${new Date().toLocaleString()}</div>
  <button class="btn-print no-print" onclick="window.print()">🖨️ Print Invoice</button>
</div>
</body>
</html>`;

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async packingLabel(req, res) {
        try {
            const { id } = req.params;
            const order = await sqlite.getOrderById(id);
            if (!order) return res.status(404).json({ error: 'Order not found' });

            const settings = await db.getSettings();
            const shop = {
                name: settings.shopName || 'Electro Hub',
                address: settings.shopAddress || '',
                phone: settings.shopPhone || '',
                email: settings.shopEmail || '',
                website: settings.shopWebsite || 'www.electrohub.lk',
                logoPath: settings.watermarkLogoPath || null
            };

            const isFragile = order.items.some(i => i.fragile === true);
            const totalQty = order.items.reduce((s, i) => s + i.qty, 0);
            
            // Simplified item summary: Category + Title
            const itemSummary = order.items.map(i => `${i.category || 'Item'} - ${i.title} × ${i.qty}`).join(', ');
            
            const trackingNumber = order.trackingNumber || 'PENDING';
            const carrier = order.shippingCarrier || 'N/A';
            const codValue = order.status === 'pending' || order.status === 'processing' ? order.total : 0;

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Packing Label – ${order.id}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; display: flex; flex-direction: column; align-items: center; padding: 40px; }
  @media print {
    body { background: white; padding: 0; }
    .no-print { display: none !important; }
  }
  .label-container { width: 148mm; background: white; border: 2px solid #000; overflow: hidden; margin-bottom: 20px; }
  .section { border-bottom: 2px solid #000; display: flex; }
  .section:last-child { border-bottom: none; }
  .cell { padding: 12px; flex: 1; }
  .border-right { border-right: 2px solid #000; }
  
  .label-small { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
  .text-bold { font-weight: 700; color: #000; }
  .text-large { font-size: 18px; }
  .text-xlarge { font-size: 24px; font-weight: 900; }
  .text-medium { font-size: 14px; }
  .text-small { font-size: 11px; line-height: 1.4; }

  .logo-img { max-height: 70px; max-width: 250px; object-fit: contain; }
  .fragile-box { border: 4px solid #000; color: #000; padding: 10px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; }
  .fragile-icon { font-size: 32px; margin-bottom: 4px; }
  .fragile-text { font-weight: 900; font-size: 20px; }

  .barcode-svg { width: 100%; height: 60px; }
  .qr-container { width: 100px; height: 100px; background: #eee; }
  
  .instruction-box { background: #f8fafc; padding: 10px; font-style: italic; border: 1px dashed #000; }
  .highlight-box { border: 3px solid #000; padding: 10px; text-align: center; }
  .btn-print { margin-top: 20px; padding: 12px 30px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 700; }
</style>
</head>
<body>

<div class="label-container" id="printable-label">
  <!-- Section 1: Header -->
  <div class="section">
    <div class="cell border-right" style="flex: 0 0 50%; display: flex; align-items: center; justify-content: center;">
      ${shop.logoPath ? `<img src="/${shop.logoPath}" class="logo-img">` : `<div class="text-bold text-large">${shop.name}</div>`}
    </div>
    <div class="cell">
      <div class="label-small">From:</div>
      <div class="text-bold text-medium">${shop.name}</div>
      <div class="text-small">${shop.address}</div>
      <div class="text-small">Phone: ${shop.phone} | Website: ${shop.website}</div>
    </div>
  </div>

  <!-- Section 2: TO & Fragile -->
  <div class="section">
    <div class="cell border-right" style="flex: 0 0 35%;">
      ${isFragile ? `
        <div class="fragile-box">
          <div class="fragile-icon">🥃</div>
          <div class="fragile-text">FRAGILE</div>
        </div>
      ` : `
        <div class="label-small">Order Details:</div>
        <div class="text-bold">Qty: ${totalQty}</div>
        <div class="text-small">${fmtDate(order.createdAt)}</div>
      `}
    </div>
    <div class="cell">
      <div class="label-small">Ship To:</div>
      <div class="text-bold text-large">${order.customerName}</div>
      <div class="text-small">${order.customerAddress}</div>
      <div class="text-bold text-medium">Phone: ${order.customerPhone} ${order.customerPhone2 ? ` / ${order.customerPhone2}` : ''}</div>
    </div>
  </div>

  <!-- Section 3: COD & Delivery Fee -->
  <div class="section">
    <div class="cell border-right">
      <div class="label-small">COD / Package Value:</div>
      <div class="text-xlarge text-bold">${fmt(codValue)}</div>
      <div class="text-small">Please collect this amount</div>
    </div>
    <div class="cell">
      <div class="label-small">Delivery Charge:</div>
      <div class="text-large text-bold">${fmt(order.shippingFee)}</div>
    </div>
  </div>

  <!-- Section 4: Tracking Info -->
  <div class="section">
    <div class="cell" style="display: flex; justify-content: space-between; align-items: center;">
      <div style="flex: 1;">
        <div class="label-small">Tracking Number (${carrier}):</div>
        <div class="text-bold text-large" style="letter-spacing: 2px;">${trackingNumber}</div>
        <svg id="barcode-tracking"></svg>
      </div>
      <div style="flex: 0 0 100px; text-align: center;">
        <div id="qr-tracking"></div>
      </div>
    </div>
  </div>

  <!-- Section 5: Order Ref -->
  <div class="section">
    <div class="cell border-right">
      <div class="label-small">Order ID:</div>
      <div class="text-bold">${order.id}</div>
      <svg id="barcode-order"></svg>
    </div>
    <div class="cell">
      <div class="label-small">Customer ID:</div>
      <div class="text-bold">${order.customerId}</div>
    </div>
  </div>

  <!-- Section 6: Item Summary -->
  <div class="section">
    <div class="cell">
      <div class="label-small">Package Contents (Simplified):</div>
      <div class="text-bold text-medium" style="margin-bottom: 5px;">${itemSummary}</div>
      <div class="text-small" style="color: #64748b;">Total Items: ${totalQty}</div>
    </div>
  </div>

  <!-- Section 7: Delivery Instruction -->
  <div class="section">
    <div class="cell">
      <div class="label-small">Delivery instruction:</div>
      <div class="instruction-box">
        <div class="text-small">${order.notes || 'Handle with care. Contact customer if not reached.'}</div>
      </div>
    </div>
  </div>
</div>

<button class="btn-print no-print" onclick="window.print()">🖨️ Print Shipping Label</button>

<script>
  window.onload = function() {
    // Render Order Barcode
    JsBarcode("#barcode-order", "${order.id}", {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0
    });

    // Render Item Barcode (same as order id for now)
    JsBarcode("#barcode-item", "${order.id}", {
      format: "CODE128",
      width: 2,
      height: 30,
      displayValue: false,
      margin: 0
    });

    // Render Tracking Barcode if exists
    if ("${trackingNumber}") {
      JsBarcode("#barcode-tracking", "${trackingNumber}", {
        format: "CODE128",
        width: 1.5,
        height: 50,
        displayValue: false,
        margin: 0
      });

      // Render QR Code
      new QRCode(document.getElementById("qr-tracking"), {
        text: "${trackingNumber}",
        width: 100,
        height: 100,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
    }
  };
</script>

</body>
</html>`;

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = documentController;
