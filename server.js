const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// إعداد الاتصال بقاعدة بيانات Neon/PostgreSQL السحابية
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false 
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// خدمة الملفات الثابتة من المجلد الرئيسي مباشرة
app.use(express.static(process.cwd()));

// المسار الرئيسي لعرض صفحة index.html من الجذر
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

// مسار لاختبار الاتصال بقاعدة البيانات
app.get('/api/test-db', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.send("Database connection is working successfully!");
    } catch (err) {
        res.status(500).send("Connection failed: " + err.message);
    }
});

// تصدير التطبيق ليعمل على Vercel
module.exports = app;