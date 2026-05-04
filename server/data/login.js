import { pool } from '../config/database.js';


// Get a user by email (used for login)
export const getUserByEmail = async (email) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );
    return result.rows[0]; // returns undefined if not found
};

// Get a user by username
export const getUserByUsername = async (username) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
    );
    return result.rows[0];
};

// Create a new user (password should already be hashed before calling this)
export const createUser = async (username, email, hashedPassword) => {
    const result = await pool.query(
        `INSERT INTO users (username, email, password)
         VALUES ($1, $2, $3)
         RETURNING user_id, username, email, created_at`,
        [username, email, hashedPassword]
    );
    return result.rows[0];
};

// Check if an email is already registered
export const emailExists = async (email) => {
    const result = await pool.query(
        'SELECT 1 FROM users WHERE email = $1',
        [email]
    );
    return result.rows.length > 0;
};

//adding task stuff
// Get all tasks for a specific user
export const getTasksByUserId = async (userId) => {
    const result = await pool.query(
        `SELECT task_id, name, description, completed, created_at
         FROM tasks
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [userId]
    );
    return result.rows;
};

// Create a new task for a user
export const createTask = async (userId, name, description) => {
    const result = await pool.query(
        `INSERT INTO tasks (user_id, name, description)
         VALUES ($1, $2, $3)
         RETURNING task_id, name, description, completed, created_at`,
        [userId, name, description]
    );
    return result.rows[0];
};

// Toggle a task's completed status
export const toggleTask = async (taskId, userId) => {
    const result = await pool.query(
        `UPDATE tasks
         SET completed = NOT completed
         WHERE task_id = $1 AND user_id = $2
         RETURNING task_id, name, description, completed`,
        [taskId, userId]
    );
    return result.rows[0];
};


// Update a user's avatar URL
export const updateAvatar = async (userId, avatarUrl) => {
    const result = await pool.query(
        `UPDATE users
         SET avatar_url = $1
         WHERE user_id = $2
         RETURNING avatar_url`,
        [avatarUrl, userId]
    );
    return result.rows[0];
};



// --- Habit Functions ---

// Get all habits for a specific user
export const getHabitsByUserId = async (userId) => {
    const result = await pool.query(
        `SELECT habit_id, name, description, frequency, days_of_week, created_at
         FROM habits
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [userId]
    );
    return result.rows;
};

// Create a new habit for a user
export const createHabit = async (userId, name, description, frequency, daysOfWeek) => {
    const result = await pool.query(
        `INSERT INTO habits (user_id, name, description, frequency, days_of_week)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING habit_id, name, description, frequency, days_of_week, created_at`,
        [userId, name, description, frequency, daysOfWeek || null]
    );
    return result.rows[0];
};

// Log a habit completion for a specific date
export const logHabitCompletion = async (habitId, userId, date) => {
    const result = await pool.query(
        `INSERT INTO habit_completions (habit_id, user_id, completed_date)
         VALUES ($1, $2, $3)
         ON CONFLICT (habit_id, completed_date) DO NOTHING
         RETURNING completion_id, habit_id, completed_date`,
        [habitId, userId, date]
    );
    return result.rows[0];
};

// Remove a habit completion for a specific date (undo)
export const removeHabitCompletion = async (habitId, userId, date) => {
    const result = await pool.query(
        `DELETE FROM habit_completions
         WHERE habit_id = $1 AND user_id = $2 AND completed_date = $3
         RETURNING completion_id`,
        [habitId, userId, date]
    );
    return result.rows[0];
};

// Get all completions for a user on a specific date
export const getHabitCompletionsByDate = async (userId, date) => {
    const result = await pool.query(
        `SELECT habit_id, completed_date
         FROM habit_completions
         WHERE user_id = $1 AND completed_date = $2`,
        [userId, date]
    );
    return result.rows;
};

// Get all completions for a specific habit (for calendar view)
export const getHabitCompletionsById = async (habitId, userId) => {
    const result = await pool.query(
        `SELECT completed_date
         FROM habit_completions
         WHERE habit_id = $1 AND user_id = $2
         ORDER BY completed_date ASC`,
        [habitId, userId]
    );
    return result.rows;
};

// Get all habit completions for a user within a date range (for weekly strip)
export const getHabitCompletionsForWeek = async (userId, startDate, endDate) => {
    const result = await pool.query(
        `SELECT habit_id, completed_date
         FROM habit_completions
         WHERE user_id = $1
         AND completed_date >= $2
         AND completed_date <= $3`,
        [userId, startDate, endDate]
    );
    return result.rows;
};



// Update a user's streak
export const updateStreak = async (userId, streak) => {
    const result = await pool.query(
        `UPDATE users
         SET streak = $1
         WHERE user_id = $2
         RETURNING streak`,
        [streak, userId]
    );
    return result.rows[0];
};

// Calculate a user's current streak
export const calculateStreak = async (userId) => {
    // Get all habits for the user
    const habitsResult = await pool.query(
        `SELECT habit_id, frequency, days_of_week, created_at
         FROM habits
         WHERE user_id = $1`,
        [userId]
    );
    const habits = habitsResult.rows;

    // No habits = no streak
    if (habits.length === 0) {
        await updateStreak(userId, 0);
        return 0;
    }

    // Get all completions for this user
    const completionsResult = await pool.query(
        `SELECT habit_id, completed_date
         FROM habit_completions
         WHERE user_id = $1
         ORDER BY completed_date DESC`,
        [userId]
    );
    const completions = completionsResult.rows.map(c => ({
        habit_id: c.habit_id,
        date: c.completed_date.toISOString().split('T')[0]
    }));

    // Helper: get Monday of a given date's week
    const getMonday = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        d.setHours(0, 0, 0, 0);
        return d;
    };

    // Helper: check if a habit was completed for a given week
    const wasHabitCompletedForWeek = (habit, weekMonday) => {
        const weekStart = new Date(weekMonday);
        const weekEnd = new Date(weekMonday);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        // Get completions for this habit in this week
        const habitCompletions = completions
            .filter(c => c.habit_id === habit.habit_id && c.date >= weekStartStr && c.date <= weekEndStr)
            .map(c => c.date);

        if (habit.frequency === 'daily') {
            // Must be completed every day Mon-Sun
            for (let i = 0; i < 7; i++) {
                const day = new Date(weekStart);
                day.setDate(weekStart.getDate() + i);
                const dayStr = day.toISOString().split('T')[0];
                // Don't require future days
                if (day > new Date()) break;
                if (!habitCompletions.includes(dayStr)) return false;
            }
            return true;
        }

        if (habit.frequency === 'weekly') {
            // Must be completed at least once during the week
            return habitCompletions.length > 0;
        }

        if (habit.frequency === 'specific') {
            // Must be completed on every selected day that has passed
            for (let i = 0; i < 7; i++) {
                const day = new Date(weekStart);
                day.setDate(weekStart.getDate() + i);
                if (day > new Date()) break;
                const dayNum = day.getDay();
                const dayStr = day.toISOString().split('T')[0];
                if (habit.days_of_week.includes(dayNum)) {
                    if (!habitCompletions.includes(dayStr)) return false;
                }
            }
            return true;
        }

        return false;
    };

    // Walk back week by week and count streak
    let streak = 0;
    const today = new Date();
    let weekMonday = getMonday(today);

    // Check up to 52 weeks back
    for (let i = 0; i < 52; i++) {
        // Skip the current week if it hasn't ended yet
        const weekSunday = new Date(weekMonday);
        weekSunday.setDate(weekMonday.getDate() + 6);
        const isCurrentWeek = today >= weekMonday && today <= weekSunday;

        if (isCurrentWeek && i === 0) {
            // For the current week, only count it if all habits are done so far
            const allDone = habits.every(habit => wasHabitCompletedForWeek(habit, weekMonday));
            if (allDone) streak++;
            else {
                // Current week incomplete — go back one more week to check past streak
                weekMonday.setDate(weekMonday.getDate() - 7);
                continue;
            }
        } else {
            // For past weeks, all habits must be fully completed
            const allDone = habits.every(habit => wasHabitCompletedForWeek(habit, weekMonday));
            if (allDone) streak++;
            else break; // Streak broken
        }

        // Go back one week
        weekMonday.setDate(weekMonday.getDate() - 7);
    }

    await updateStreak(userId, streak);
    return streak;
};

// Get a user's current streak
export const getStreak = async (userId) => {
    const result = await pool.query(
        `SELECT streak FROM users WHERE user_id = $1`,
        [userId]
    );
    return result.rows[0]?.streak || 0;
};

// Delete a habit and all its completions
export const deleteHabit = async (habitId, userId) => {
    const result = await pool.query(
        `DELETE FROM habits
         WHERE habit_id = $1 AND user_id = $2
         RETURNING habit_id`,
        [habitId, userId]
    );
    return result.rows[0];
};