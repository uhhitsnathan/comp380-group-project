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
