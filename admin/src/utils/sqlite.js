const initSqlJs = require('sql.js');
const fs = require('fs-extra');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/electro_hub.db');
let dbInstance = null;

async function getDb() {
    if (dbInstance) return dbInstance;
    
    const SQL = await initSqlJs();
    fs.ensureDirSync(path.dirname(dbPath));
    
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        dbInstance = new SQL.Database(fileBuffer);
    } else {
        dbInstance = new SQL.Database();
        // Initialize tables
        dbInstance.run(`
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
                updatedAt TEXT,
                FOREIGN KEY (customerId) REFERENCES customers(id)
            );

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
                updatedAt TEXT,
                FOREIGN KEY (orderId) REFERENCES orders(id)
            );
        `);
        saveDb();
    }
    return dbInstance;
}

function saveDb() {
    if (!dbInstance) return;
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

// Helper to convert SQL results (array of objects)
function getRows(res) {
    if (!res || res.length === 0) return [];
    const columns = res[0].columns;
    return res[0].values.map(val => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = val[i]);
        return obj;
    });
}

module.exports = {
    // Customers
    async getAllCustomers() {
        const db = await getDb();
        const res = db.exec('SELECT * FROM customers ORDER BY createdAt DESC');
        return getRows(res);
    },
    async getCustomerById(id) {
        const db = await getDb();
        const res = db.exec('SELECT * FROM customers WHERE id = ?', [id]);
        const rows = getRows(res);
        return rows.length > 0 ? rows[0] : null;
    },
    async upsertCustomer(data) {
        const db = await getDb();
        const columns = Object.keys(data);
        const placeholders = columns.map(() => '?').join(', ');
        const updates = columns.map(col => `${col} = ?`).join(', ');
        
        // sql.js doesn't support EXCLUDED in ON CONFLICT as easily in older versions, 
        // so we'll do a check or use standard syntax
        const existing = await this.getCustomerById(data.id);
        if (existing) {
            const updateCols = Object.keys(data).filter(k => k !== 'id');
            const sets = updateCols.map(c => `${c} = ?`).join(', ');
            db.run(`UPDATE customers SET ${sets} WHERE id = ?`, [...updateCols.map(k => data[k]), data.id]);
        } else {
            db.run(`INSERT INTO customers (${columns.join(', ')}) VALUES (${placeholders})`, Object.values(data));
        }
        saveDb();
    },
    async deleteCustomer(id) {
        const db = await getDb();
        db.run('DELETE FROM customers WHERE id = ?', [id]);
        saveDb();
        return true; // Simple implementation
    },

    // Orders
    async getAllOrders() {
        const db = await getDb();
        const res = db.exec('SELECT * FROM orders ORDER BY createdAt DESC');
        const orders = getRows(res);
        return orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
    },
    async getOrderById(id) {
        const db = await getDb();
        const res = db.exec('SELECT * FROM orders WHERE id = ?', [id]);
        const rows = getRows(res);
        if (rows.length === 0) return null;
        const order = rows[0];
        order.items = JSON.parse(order.items);
        return order;
    },
    async createOrder(orderData) {
        const db = await getDb();
        const data = { ...orderData, items: JSON.stringify(orderData.items) };
        const columns = Object.keys(data);
        const placeholders = columns.map(() => '?').join(', ');
        db.run(`INSERT INTO orders (${columns.join(', ')}) VALUES (${placeholders})`, Object.values(data));
        saveDb();
    },
    async updateOrderStatus(id, status, extraFields = {}) {
        const db = await getDb();
        const data = { status, updatedAt: new Date().toISOString(), ...extraFields };
        const columns = Object.keys(data);
        const sets = columns.map(col => `${col} = ?`).join(', ');
        db.run(`UPDATE orders SET ${sets} WHERE id = ?`, [...Object.values(data), id]);
        saveDb();
    },
    async deleteOrder(id) {
        const db = await getDb();
        db.run('DELETE FROM shipping WHERE orderId = ?', [id]);
        db.run('DELETE FROM orders WHERE id = ?', [id]);
        saveDb();
        return true;
    },

    // Shipping
    async getShipping(orderId) {
        const db = await getDb();
        const res = db.exec('SELECT * FROM shipping WHERE orderId = ?', [orderId]);
        const rows = getRows(res);
        return rows.length > 0 ? rows[0] : null;
    },
    async getAllShipping() {
        const db = await getDb();
        const res = db.exec(`
            SELECT s.*, o.customerName, o.total 
            FROM shipping s
            JOIN orders o ON s.orderId = o.id
            ORDER BY s.createdAt DESC
        `);
        return getRows(res);
    },
    async upsertShipping(orderId, data) {
        const db = await getDb();
        const now = new Date().toISOString();
        const existing = await this.getShipping(orderId);
        
        if (existing) {
            const updateData = { ...data, updatedAt: now };
            const columns = Object.keys(updateData);
            const sets = columns.map(col => `${col} = ?`).join(', ');
            db.run(`UPDATE shipping SET ${sets} WHERE orderId = ?`, [...Object.values(updateData), orderId]);
        } else {
            const insertData = { orderId, ...data, createdAt: now, updatedAt: now };
            const columns = Object.keys(insertData);
            const placeholders = columns.map(() => '?').join(', ');
            db.run(`INSERT INTO shipping (${columns.join(', ')}) VALUES (${placeholders})`, Object.values(insertData));
        }
        saveDb();
    },
    async deleteShipping(orderId) {
        const db = await getDb();
        db.run('DELETE FROM shipping WHERE orderId = ?', [orderId]);
        saveDb();
        return true;
    }
};
