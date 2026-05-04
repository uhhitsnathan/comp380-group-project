import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { getUserByEmail, createUser, emailExists,
    getTasksByUserId, createTask, toggleTask,
    updateAvatar,
    getHabitsByUserId, createHabit, logHabitCompletion, removeHabitCompletion, getHabitCompletionsByDate, getHabitCompletionsById, getHabitCompletionsForWeek,
    calculateStreak, updateStreak, getStreak,
    deleteHabit } from '../data/login.js';


const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const deleteHabitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});


//save avatar stuff to /public/uploads/avatars 
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/avatars'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const valid = allowed.test(path.extname(file.originalname).toLowerCase());
        if (valid) cb(null, true);
        else cb(new Error('Images only!'));
    }
});


// --- Helper: sign a JWT for a user ---
const signToken = (user) => {
    return jwt.sign(
        { user_id: user.user_id, username: user.username, email: user.email, avatar_url: user.avatar_url || null},
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// --- Helper: send the JWT as an HTTP-only cookie ---
const sendTokenCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,   // JS in the browser cannot read this cookie (security)
        sameSite: 'lax',  // protects against cross-site request forgery
        maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in milliseconds
    });
};

// --- Helper: verify the JWT from the cookie ---
const verifyToken = (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ error: 'Not logged in.' });
        return null;
    }
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired session.' });
        return null;
    }
};

// --- SIGNUP ---
router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const alreadyExists = await emailExists(email);
        if (alreadyExists) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await createUser(username, email, hashedPassword);

        const token = signToken(newUser);       //  create JWT
        sendTokenCookie(res, token);            //  attach it as a cookie

        res.status(201).json({
            message: 'Account created successfully!',
            user: newUser
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error during signup.' });
    }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const user = await getUserByEmail(email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = signToken(user);          // create JWT
        sendTokenCookie(res, token);            // attach it as a cookie

        res.status(200).json({
            message: 'Login successful!',
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// --- GET /api/me ---
router.get('/me', async (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Not logged in.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const streak = await calculateStreak(decoded.user_id);

        res.json({
            user_id: decoded.user_id,
            username: decoded.username,
            email: decoded.email,
            avatar_url: decoded.avatar_url || null,
            streak
        });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session.' });
    }
});

// --- POST /api/logout ---
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax'
    });
    res.json({ message: 'Logged out successfully.' });
});

// --- POST /api/avatar ---
router.post('/avatar', upload.single('avatar'), async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        // Build the public URL path to the saved file
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        await updateAvatar(decoded.user_id, avatarUrl);
        res.json({ avatar_url: avatarUrl });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Server error uploading avatar.' });
    }
});

// --- GET /api/tasks ---
router.get('/tasks', async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    try {
        const tasks = await getTasksByUserId(decoded.user_id);
        res.json(tasks);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Server error fetching tasks.' });
    }
});

// --- POST /api/tasks ---
router.post('/tasks', async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Task name is required.' });
    }

    try {
        const task = await createTask(decoded.user_id, name, description || '');
        res.status(201).json(task);
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Server error creating task.' });
    }
});

// --- PATCH /api/tasks/:id ---
router.patch('/tasks/:id', async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID.' });
    }

    try {
        const task = await toggleTask(taskId, decoded.user_id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found.' });
        }
        res.json(task);
    } catch (error) {
        console.error('Toggle task error:', error);
        res.status(500).json({ error: 'Server error updating task.' });
    }
});



//habit routers

// --- GET /api/habits ---
router.get('/habits', async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate start (Monday) and end (Sunday) of current week
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDate = monday.toISOString().split('T')[0];
    const endDate = sunday.toISOString().split('T')[0];

    try {
        const habits = await getHabitsByUserId(decoded.user_id);
        const weekCompletions = await getHabitCompletionsForWeek(decoded.user_id, startDate, endDate);
        const todayCompletions = await getHabitCompletionsByDate(decoded.user_id, todayStr);
        const todayCompletedIds = todayCompletions.map(c => c.habit_id);

        const result = habits.map(habit => {
            const habitWeekCompletions = weekCompletions
                .filter(c => c.habit_id === habit.habit_id)
                .map(c => c.completed_date.toISOString().split('T')[0]);

            // Build the 7-day strip
            const strip = [];
            for (let i = 0; i < 7; i++) {
                const day = new Date(monday);
                day.setDate(monday.getDate() + i);
                const dayStr = day.toISOString().split('T')[0];
                const dayNum = day.getDay();
                const isToday = dayStr === todayStr;
                const isPast = day < today && !isToday;
                const isFuture = day > today;
                const isCompleted = habitWeekCompletions.includes(dayStr);

                let isActive = false;
                if (habit.frequency === 'daily') isActive = !isFuture;
                if (habit.frequency === 'weekly') isActive = isToday && !isFuture;
                if (habit.frequency === 'specific') {
                    isActive = habit.days_of_week.includes(dayNum) && !isFuture;
                }

                strip.push({
                    date: dayStr,
                    dayNum,
                    isToday,
                    isPast,
                    isFuture,
                    isCompleted,
                    isActive
                });
            }

            return {
                ...habit,
                completed_today: todayCompletedIds.includes(habit.habit_id),
                week_strip: strip
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Get habits error:', error);
        res.status(500).json({ error: 'Server error fetching habits.' });
    }
});

// --- GET /api/habits/today ---
router.get('/habits/today', async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate start (Monday) and end (Sunday) of current week
    const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDate = monday.toISOString().split('T')[0];
    const endDate = sunday.toISOString().split('T')[0];

    try {
        const habits = await getHabitsByUserId(decoded.user_id);
        const todayCompletions = await getHabitCompletionsByDate(decoded.user_id, todayStr);
        const weekCompletions = await getHabitCompletionsForWeek(decoded.user_id, startDate, endDate);

        const todayCompletedIds = todayCompletions.map(c => c.habit_id);

        // Filter habits due today
        const todayDay = today.getDay();
        const todaysHabits = habits.filter(habit => {
            if (habit.frequency === 'daily') return true;
            if (habit.frequency === 'weekly') return true; // show all weekly habits
            if (habit.frequency === 'specific') {
                return habit.days_of_week && habit.days_of_week.includes(todayDay);
            }
            return false;
        });

        // Build week strip data for each habit
        const result = todaysHabits.map(habit => {
            // Get this habit's completions for the week
            const habitWeekCompletions = weekCompletions
                .filter(c => c.habit_id === habit.habit_id)
                .map(c => c.completed_date.toISOString().split('T')[0]);

            // Build the 7-day strip (Mon=1 to Sun=0, displayed as Mon-Sun)
            const strip = [];
            for (let i = 0; i < 7; i++) {
                const day = new Date(monday);
                day.setDate(monday.getDate() + i);
                const dayStr = day.toISOString().split('T')[0];
                const dayNum = day.getDay(); // 0=Sun, 1=Mon...
                const isToday = dayStr === todayStr;
                const isPast = day < today && !isToday;
                const isFuture = day > today;
                const isCompleted = habitWeekCompletions.includes(dayStr);

                // Determine if this day is active based on frequency
                let isActive = false;
                if (habit.frequency === 'daily') isActive = !isFuture;
                if (habit.frequency === 'weekly') isActive = isToday && !isFuture;
                if (habit.frequency === 'specific') {
                    isActive = habit.days_of_week.includes(dayNum) && !isFuture;
                }

                strip.push({
                    date: dayStr,
                    dayNum,
                    isToday,
                    isPast,
                    isFuture,
                    isCompleted,
                    isActive
                });
            }

            return {
                ...habit,
                completed_today: todayCompletedIds.includes(habit.habit_id),
                week_strip: strip
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Get today habits error:', error);
        res.status(500).json({ error: 'Server error fetching today\'s habits.' });
    }
});


// --- GET /api/streak ---
router.get('/streak', async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    try {
        const streak = await calculateStreak(decoded.user_id);
        res.json({ streak });
    } catch (error) {
        console.error('Get streak error:', error);
        res.status(500).json({ error: 'Server error fetching streak.' });
    }
});

// --- POST /api/habits ---
router.post('/habits', async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    const { name, description, frequency, days_of_week } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Habit name is required.' });
    }
    if (!frequency) {
        return res.status(400).json({ error: 'Frequency is required.' });
    }
    if (frequency === 'specific' && (!days_of_week || days_of_week.length === 0)) {
        return res.status(400).json({ error: 'Please select at least one day.' });
    }

    try {
        const habit = await createHabit(
            decoded.user_id,
            name,
            description || '',
            frequency,
            days_of_week || null
        );
        res.status(201).json(habit);
    } catch (error) {
        console.error('Create habit error:', error);
        res.status(500).json({ error: 'Server error creating habit.' });
    }
});

// --- POST /api/habits/:id/complete ---
router.post('/habits/:id/complete', async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    const habitId = parseInt(req.params.id);
    if (isNaN(habitId)) {
        return res.status(400).json({ error: 'Invalid habit ID.' });
    }

    const date = req.body.date || new Date().toISOString().split('T')[0];

    try {
        const completion = await logHabitCompletion(habitId, decoded.user_id, date);
        res.status(201).json(completion || { message: 'Already completed for this date.' });
    } catch (error) {
        console.error('Log habit completion error:', error);
        res.status(500).json({ error: 'Server error logging completion.' });
    }
});

// --- DELETE /api/habits/:id/complete ---
router.delete('/habits/:id/complete', async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    const habitId = parseInt(req.params.id);
    if (isNaN(habitId)) {
        return res.status(400).json({ error: 'Invalid habit ID.' });
    }

    const date = req.body.date || new Date().toISOString().split('T')[0];

    try {
        const result = await removeHabitCompletion(habitId, decoded.user_id, date);
        if (!result) {
            return res.status(404).json({ error: 'Completion not found.' });
        }
        res.json({ message: 'Completion removed.' });
    } catch (error) {
        console.error('Remove habit completion error:', error);
        res.status(500).json({ error: 'Server error removing completion.' });
    }
});



// --- GET /api/habits/:id/completions ---
router.get('/habits/:id/completions', async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    const habitId = parseInt(req.params.id);
    if (isNaN(habitId)) {
        return res.status(400).json({ error: 'Invalid habit ID.' });
    }

    try {
        const completions = await getHabitCompletionsById(habitId, decoded.user_id);
        res.json(completions);
    } catch (error) {
        console.error('Get habit completions error:', error);
        res.status(500).json({ error: 'Server error fetching completions.' });
    }
});


// --- DELETE /api/habits/:id ---
router.delete('/habits/:id', deleteHabitLimiter, async (req, res) => {
    const decoded = verifyToken(req, res);
    if (!decoded) return;

    const habitId = parseInt(req.params.id);
    if (isNaN(habitId)) {
        return res.status(400).json({ error: 'Invalid habit ID.' });
    }

    try {
        const result = await deleteHabit(habitId, decoded.user_id);
        if (!result) {
            return res.status(404).json({ error: 'Habit not found.' });
        }
        res.json({ message: 'Habit deleted successfully.' });
    } catch (error) {
        console.error('Delete habit error:', error);
        res.status(500).json({ error: 'Server error deleting habit.' });
    }
});

export default router;