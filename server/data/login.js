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