const express = require('express');
const app = express();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());

// أي API سيبدأ بـ /api/
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT 1');
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// هذا التصدير هو "المكنسة" التي تحتاجها Vercel لفهم السيرفر
module.exports = app;