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