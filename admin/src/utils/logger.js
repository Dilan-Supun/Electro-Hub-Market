const db = require('./db');

const logger = {
    async log(action, details = {}, admin = 'admin') {
        const logs = await db.read('logs');
        const newLog = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action,
            details,
            admin
        };
        logs.unshift(newLog); // Newest first
        await db.write('logs', logs.slice(0, 1000)); // Keep last 1000 logs
        return newLog;
    }
};

module.exports = logger;
