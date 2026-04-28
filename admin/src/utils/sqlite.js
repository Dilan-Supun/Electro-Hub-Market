const initSqlJs = require('sql.js');
const fs = require('fs-extra');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../../data/electro_hub.db');

let _db = null;

async function getDb() {
    if (_db) return _db;
    const SQL = await initSqlJs();
    if (await fs.pathExists(DB_PATH)) {
        const fileBuffer = await fs.readFile(DB_PATH);
        _db = new SQL.Database(fileBuffer);
    } else {
        _db = new SQL.Database();
    }
    initTables(_db);
    return _db;
}

function initTables(db) {
    db.run(`
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            city TEXT,
            postalCode TEXT,
            notes TEXT,
            createdAt TEXT,
            updatedAt TEXT
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customerId TEXT NOT NULL,
            customerName TEXT,
            customerAddress TEXT,
            customerPhone TEXT,
            customerEmail TEXT,
            items TEXT NOT NULL,
            subtotal REAL DEFAULT 0,
            shippingFee REAL DEFAULT 0,
            total REAL DEFAULT 0,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            trackingNumber TEXT,
            shippingCarrier TEXT,
            shippedAt TEXT,
            deliveredAt TEXT,
            createdAt TEXT,
            updatedAt TEXT
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS shipping (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId TEXT NOT NULL UNIQUE,
            carrier TEXT,
            trackingNumber TEXT,
            estimatedDelivery TEXT,
            actualDelivery TEXT,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            createdAt TEXT,
            updatedAt TEXT
        );
    `);
}

async function saveDb() {
    const db = await getDb();
    const data = db.export();
    await fs.ensureDir(path.dirname(DB_PATH));
    await fs.writeFile(DB_PATH, Buffer.from(data));
}

function rowsToObjects(result) {
    if (!result || result.length === 0) return [];
    const { columns, values } = result[0];
    return values.map(row => {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
    });
}

// CUSTOMERS
async function getAllCustomers() {
    const db = await getDb();
    const result = db.exec('SELECT * FROM customers ORDER BY createdAt DESC');
    return rowsToObjects(result);
}

async function getCustomerById(id) {
    const db = await getDb();
    const result = db.exec('SELECT * FROM customers WHERE id = ?', [id]);
    const rows = rowsToObjects(result);
    return rows[0] || null;
}

async function upsertCustomer(data) {
    const db = await getDb();
    db.run(`
        INSERT INTO customers (id, name, email, phone, address, city, postalCode, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, email=excluded.email, phone=excluded.phone,
            address=excluded.address, city=excluded.city, postalCode=excluded.postalCode,
            notes=excluded.notes, updatedAt=excluded.updatedAt
    `, [
        data.id, data.name, data.email || '', data.phone || '',
        data.address || '', data.city || '', data.postalCode || '',
        data.notes || '',
        data.createdAt || new Date().toISOString(),
        new Date().toISOString()
    ]);
    await saveDb();
}

async function deleteCustomer(id) {
    const db = await getDb();
    db.run('DELETE FROM customers WHERE id = ?', [id]);
    await saveDb();
    return true;
}

// ORDERS
async function getAllOrders() {
    const db = await getDb();
    const result = db.exec('SELECT * FROM orders ORDER BY createdAt DESC');
    const rows = rowsToObjects(result);
    return rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]') }));
}

async function getOrderById(id) {
    const db = await getDb();
    const result = db.exec('SELECT * FROM orders WHERE id = ?', [id]);
    const rows = rowsToObjects(result);
    if (!rows[0]) return null;
    return { ...rows[0], items: JSON.parse(rows[0].items || '[]') };
}

async function createOrder(order) {
    const db = await getDb();
    db.run(`
        INSERT INTO orders (id, customerId, customerName, customerAddress, customerPhone, customerEmail,
            items, subtotal, shippingFee, total, status, notes, trackingNumber, shippingCarrier,
            shippedAt, deliveredAt, createdAt, updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
        order.id, order.customerId, order.customerName || '', order.customerAddress || '',
        order.customerPhone || '', order.customerEmail || '',
        JSON.stringify(order.items),
        order.subtotal || 0, order.shippingFee || 0, order.total || 0,
        order.status || 'pending', order.notes || '',
        order.trackingNumber || '', order.shippingCarrier || '',
        order.shippedAt || '', order.deliveredAt || '',
        order.createdAt || new Date().toISOString(),
        new Date().toISOString()
    ]);
    await saveDb();
}

async function updateOrderStatus(id, status, extra = {}) {
    const db = await getDb();
    const now = new Date().toISOString();
    db.run(`
        UPDATE orders SET status=?, trackingNumber=COALESCE(?,trackingNumber),
        shippingCarrier=COALESCE(?,shippingCarrier),
        shippedAt=COALESCE(?,shippedAt), deliveredAt=COALESCE(?,deliveredAt), updatedAt=?
        WHERE id=?
    `, [
        status,
        extra.trackingNumber || null, extra.shippingCarrier || null,
        extra.shippedAt || null, extra.deliveredAt || null,
        now, id
    ]);
    await saveDb();
}

async function deleteOrder(id) {
    const db = await getDb();
    db.run('DELETE FROM shipping WHERE orderId = ?', [id]);
    db.run('DELETE FROM orders WHERE id = ?', [id]);
    await saveDb();
    return true;
}

// SHIPPING
async function getShipping(orderId) {
    const db = await getDb();
    const result = db.exec('SELECT * FROM shipping WHERE orderId = ?', [orderId]);
    const rows = rowsToObjects(result);
    return rows[0] || null;
}

async function getAllShipping() {
    const db = await getDb();
    const result = db.exec('SELECT * FROM shipping ORDER BY createdAt DESC');
    return rowsToObjects(result);
}

async function upsertShipping(orderId, data) {
    const db = await getDb();
    const now = new Date().toISOString();
    db.run(`
        INSERT INTO shipping (orderId, carrier, trackingNumber, estimatedDelivery, actualDelivery, status, notes, createdAt, updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?)
        ON CONFLICT(orderId) DO UPDATE SET
            carrier=excluded.carrier, trackingNumber=excluded.trackingNumber,
            estimatedDelivery=excluded.estimatedDelivery, actualDelivery=excluded.actualDelivery,
            status=excluded.status, notes=excluded.notes, updatedAt=excluded.updatedAt
    `, [
        orderId, data.carrier || '', data.trackingNumber || '',
        data.estimatedDelivery || '', data.actualDelivery || '',
        data.status || 'pending', data.notes || '',
        now, now
    ]);
    await saveDb();
}

async function deleteShipping(orderId) {
    const db = await getDb();
    db.run('DELETE FROM shipping WHERE orderId = ?', [orderId]);
    await saveDb();
}

module.exports = {
    getAllCustomers, getCustomerById, upsertCustomer, deleteCustomer,
    getAllOrders, getOrderById, createOrder, updateOrderStatus, deleteOrder,
    getShipping, getAllShipping, upsertShipping, deleteShipping
};
