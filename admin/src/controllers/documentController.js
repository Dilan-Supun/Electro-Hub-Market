const db = require('../utils/db');

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
            const orders = await db.read('orders');
            const order = orders.find(o => o.id === id);
            if (!order) return res.status(404).json({ error: 'Order not found' });

            const settings = await db.getSettings();
            const shop = {
                name: settings.shopName || 'Electro Hub',
                address: settings.shopAddress || '',
                phone: settings.shopPhone || '',
                email: settings.shopEmail || ''
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
      <div class="shop-name">${shop.name}</div>
      <div class="shop-meta">${[shop.address, shop.phone, shop.email].filter(Boolean).join(' &nbsp;|&nbsp; ')}</div>
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
      ${shop.email ? `<div class="party-detail">✉ ${shop.email}</div>` : ''}
    </div>
    <div class="party-box">
      <div class="party-label">Bill To (Customer)</div>
      <div class="party-name">${order.customerName}</div>
      <div class="party-detail">${order.customerAddress ? order.customerAddress.replace(/,/g, ',<br>') : ''}</div>
      ${order.customerPhone ? `<div class="party-detail">📞 ${order.customerPhone}</div>` : ''}
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

  <div class="footer">Thank you for shopping with ${shop.name} &bull; Generated on ${new Date().toLocaleString()}</div>
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
            const orders = await db.read('orders');
            const order = orders.find(o => o.id === id);
            if (!order) return res.status(404).json({ error: 'Order not found' });

            const settings = await db.getSettings();
            const shop = {
                name: settings.shopName || 'Electro Hub',
                address: settings.shopAddress || '',
                phone: settings.shopPhone || '',
                email: settings.shopEmail || ''
            };

            const itemSummary = order.items
                .map(i => `${i.title} × ${i.qty}`)
                .join(', ');

            const totalQty = order.items.reduce((s, i) => s + i.qty, 0);

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Packing Label – ${order.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; display: flex; flex-direction: column; align-items: center; padding: 24px; }
  @media print {
    body { background: white; padding: 0; }
    .label-wrap { page-break-after: always; }
    .no-print { display: none !important; }
  }
  .label-wrap { width: 148mm; background: white; border: 2.5px solid #0f172a; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.10); margin-bottom: 20px; }
  .label-top { background: #0f172a; color: white; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; }
  .label-brand { font-size: 14px; font-weight: 800; letter-spacing: 0.5px; }
  .label-order-id { font-size: 11px; font-family: monospace; background: rgba(255,255,255,0.12); padding: 3px 8px; border-radius: 4px; }
  .addr-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 2px solid #0f172a; }
  .addr-box { padding: 14px 16px; }
  .addr-box:first-child { border-right: 2px solid #0f172a; }
  .addr-tag { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 6px; }
  .addr-name { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .addr-detail { font-size: 11px; color: #475569; line-height: 1.6; }
  .arrow-band { background: #2563eb; color: white; text-align: center; font-size: 18px; letter-spacing: 6px; padding: 4px; }
  .contents { padding: 12px 16px; border-bottom: 1.5px dashed #cbd5e1; }
  .contents-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px; }
  .contents-text { font-size: 11px; color: #334155; line-height: 1.5; }
  .label-footer { display: flex; justify-content: space-between; padding: 10px 16px; font-size: 10px; color: #64748b; }
  .barcode { font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 4px; display: block; margin-top: 2px; color: #0f172a; }
  .btn-print { display: block; margin: 8px auto 24px; padding: 10px 32px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .btn-print:hover { background: #1d4ed8; }
</style>
</head>
<body>
<div class="label-wrap">
  <div class="label-top">
    <span class="label-brand">${shop.name}</span>
    <span class="label-order-id">${order.id}</span>
  </div>

  <div class="addr-grid">
    <div class="addr-box">
      <div class="addr-tag">📤 From (Sender)</div>
      <div class="addr-name">${shop.name}</div>
      <div class="addr-detail">${shop.address || ''}</div>
      ${shop.phone ? `<div class="addr-detail">📞 ${shop.phone}</div>` : ''}
    </div>
    <div class="addr-box">
      <div class="addr-tag">📬 To (Recipient)</div>
      <div class="addr-name">${order.customerName}</div>
      <div class="addr-detail">${order.customerAddress || ''}</div>
      ${order.customerPhone ? `<div class="addr-detail">📞 ${order.customerPhone}</div>` : ''}
    </div>
  </div>

  <div class="arrow-band">→ → →</div>

  <div class="contents">
    <div class="contents-label">Package Contents</div>
    <div class="contents-text">${itemSummary}</div>
    <div class="addr-detail" style="margin-top:4px;">Total ${totalQty} item${totalQty !== 1 ? 's' : ''} &nbsp;|&nbsp; Order Value: ${fmt(order.total)}</div>
  </div>

  <div class="label-footer">
    <div>
      Date: ${fmtDate(order.createdAt)}
      <span class="barcode">${order.id.replace(/-/g, ' ')}</span>
    </div>
    <div style="text-align:right;">Status: <strong>${order.status.toUpperCase()}</strong></div>
  </div>
</div>

<button class="btn-print no-print" onclick="window.print()">🏷️ Print Label</button>
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
