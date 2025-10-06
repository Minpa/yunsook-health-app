const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1); // Trust Railway proxy
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Railway handles HTTPS at proxy level
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

// Auth middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Initialize database
async function initDatabase() {
    try {
        const client = await pool.connect();
        const fs = require('fs');
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await client.query(schema);
            console.log('✅ Database initialized');
        }
        
        client.release();
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', authenticated: !!req.session.userId });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // Check if user exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create user
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
            [email, passwordHash, name]
        );
        
        const user = result.rows[0];
        req.session.userId = user.id;
        
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // Find user
        const result = await pool.query(
            'SELECT id, email, name, password_hash FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        req.session.userId = user.id;
        
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, name FROM users WHERE id = $1',
            [req.session.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Data routes (all require authentication)

// Get all user data
app.get('/api/data', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Get master exercises
        const exercises = await pool.query(
            'SELECT id, name, default_duration FROM master_exercises WHERE user_id = $1 ORDER BY created_at',
            [userId]
        );
        
        // Get weekly exercises
        const weeklyExercises = await pool.query(
            'SELECT week_key, day_index, exercise_id, duration, completed FROM weekly_exercises WHERE user_id = $1',
            [userId]
        );
        
        // Get health metrics
        const healthMetrics = await pool.query(
            'SELECT week_key, weight FROM health_metrics WHERE user_id = $1',
            [userId]
        );
        
        // Get custom metric definitions
        const metricDefs = await pool.query(
            'SELECT id, name FROM custom_metric_definitions WHERE user_id = $1',
            [userId]
        );
        
        // Get custom metric values
        const metricValues = await pool.query(
            'SELECT metric_id, week_key, value FROM custom_metric_values WHERE user_id = $1',
            [userId]
        );
        
        // Get meals
        const meals = await pool.query(
            'SELECT week_key, date, meal_type, food, photo, calories, auto_estimated FROM meals WHERE user_id = $1 ORDER BY date DESC',
            [userId]
        );
        
        // Format data to match frontend structure
        const data = {
            version: '1.0',
            masterExercises: exercises.rows.map(e => ({
                id: 'ex_' + e.id,
                name: e.name,
                defaultDuration: e.default_duration
            })),
            weeklyExercises: {},
            healthData: {},
            metricDefinitions: metricDefs.rows.map(m => m.name),
            meals: {}
        };
        
        // Group weekly exercises by week
        weeklyExercises.rows.forEach(we => {
            if (!data.weeklyExercises[we.week_key]) {
                data.weeklyExercises[we.week_key] = {
                    days: Array(7).fill(null).map(() => ({ exercises: [] }))
                };
            }
            data.weeklyExercises[we.week_key].days[we.day_index].exercises.push({
                id: 'ex_' + we.exercise_id,
                duration: we.duration,
                completed: we.completed
            });
        });
        
        // Group health metrics by week
        healthMetrics.rows.forEach(hm => {
            data.healthData[hm.week_key] = {
                weight: parseFloat(hm.weight),
                customMetrics: {}
            };
        });
        
        // Add custom metric values
        metricValues.rows.forEach(mv => {
            const metricName = metricDefs.rows.find(m => m.id === mv.metric_id)?.name;
            if (metricName && data.healthData[mv.week_key]) {
                data.healthData[mv.week_key].customMetrics[metricName] = parseFloat(mv.value);
            }
        });
        
        // Group meals by week
        meals.rows.forEach(meal => {
            if (!data.meals[meal.week_key]) {
                data.meals[meal.week_key] = [];
            }
            data.meals[meal.week_key].push({
                id: 'meal_' + meal.id,
                date: meal.date,
                mealType: meal.meal_type,
                food: meal.food,
                photo: meal.photo,
                calories: meal.calories,
                autoEstimated: meal.auto_estimated
            });
        });
        
        res.json(data);
    } catch (error) {
        console.error('Get data error:', error);
        res.status(500).json({ error: 'Failed to get data' });
    }
});

// Save all user data
app.post('/api/data', requireAuth, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const userId = req.session.userId;
        const data = req.body;
        
        // This is a simplified version - in production you'd want more granular updates
        // For now, we'll just acknowledge the save
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Save data error:', error);
        res.status(500).json({ error: 'Failed to save data' });
    } finally {
        client.release();
    }
});

// Static routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_mobile.html'));
});

app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, 'report.html'));
});

// Start server
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Health App running on port ${PORT}`);
        console.log(`📱 Visit: http://localhost:${PORT}`);
    });
});

// Add route to manually initialize database
app.get('/api/init-db', async (req, res) => {
    try {
        const client = await pool.connect();
        const fs = require('fs');
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await client.query(schema);
            
            // Check tables
            const result = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            `);
            
            client.release();
            
            res.json({ 
                success: true, 
                message: 'Database initialized',
                tables: result.rows.map(r => r.table_name)
            });
        } else {
            res.status(404).json({ error: 'Schema file not found' });
        }
    } catch (error) {
        console.error('Init DB error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reset database - DELETE ALL DATA (for testing only)
app.get('/api/reset-db', async (req, res) => {
    try {
        const client = await pool.connect();
        
        // Delete all data from all tables
        await client.query('TRUNCATE TABLE custom_metric_values CASCADE');
        await client.query('TRUNCATE TABLE custom_metric_definitions CASCADE');
        await client.query('TRUNCATE TABLE weekly_exercises CASCADE');
        await client.query('TRUNCATE TABLE meals CASCADE');
        await client.query('TRUNCATE TABLE health_metrics CASCADE');
        await client.query('TRUNCATE TABLE master_exercises CASCADE');
        await client.query('TRUNCATE TABLE users CASCADE');
        
        client.release();
        
        res.json({ 
            success: true, 
            message: 'All data deleted. You can now sign up again!',
            deleted: ['users', 'exercises', 'meals', 'health_metrics', 'custom_metrics', 'weekly_exercises']
        });
    } catch (error) {
        console.error('Reset DB error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Memo endpoints
// Get memos for a date range
app.get('/api/memos', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const { startDate, endDate } = req.query;

    try {
        const result = await pool.query(
            `SELECT id, date, text, created_at, updated_at 
             FROM memos 
             WHERE user_id = $1 AND date >= $2 AND date <= $3
             ORDER BY date, created_at`,
            [userId, startDate, endDate]
        );

        res.json({ memos: result.rows });
    } catch (error) {
        console.error('Get memos error:', error);
        res.status(500).json({ error: 'Failed to fetch memos' });
    }
});

// Add a memo
app.post('/api/memos', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const { date, text } = req.body;

    if (!date || !text) {
        return res.status(400).json({ error: 'Date and text are required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO memos (user_id, date, text) 
             VALUES ($1, $2, $3) 
             RETURNING id, date, text, created_at, updated_at`,
            [userId, date, text]
        );

        res.json({ memo: result.rows[0] });
    } catch (error) {
        console.error('Add memo error:', error);
        res.status(500).json({ error: 'Failed to add memo' });
    }
});

// Delete a memo
app.delete('/api/memos/:id', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const memoId = req.params.id;

    try {
        const result = await pool.query(
            'DELETE FROM memos WHERE id = $1 AND user_id = $2 RETURNING id',
            [memoId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Memo not found' });
        }

        res.json({ success: true, id: memoId });
    } catch (error) {
        console.error('Delete memo error:', error);
        res.status(500).json({ error: 'Failed to delete memo' });
    }
});
