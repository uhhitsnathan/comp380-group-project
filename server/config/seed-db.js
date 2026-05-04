import { pool } from './database.js';
import bcrypt from 'bcrypt';

const dropTables = async () => {
    try {
        console.log('dropping tables...');
        await pool.query(`DROP TABLE IF EXISTS habit_completions;`);
        await pool.query(`DROP TABLE IF EXISTS habits;`);
        await pool.query(`DROP TABLE IF EXISTS tasks;`);
        await pool.query(`DROP TABLE IF EXISTS users;`);
        console.log('tables dropped.');
    } catch (error) {
        console.error('Error dropping tables:', error);
    }
};


const createTables = async () => {
    try {
        console.log('creating users table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id    SERIAL PRIMARY KEY,
                username   TEXT NOT NULL UNIQUE,
                email      TEXT NOT NULL UNIQUE,
                password   TEXT NOT NULL,
                avatar_url TEXT DEFAULT NULL,
                streak INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('successfully created users table');
    } catch (error) {
        console.error('Error creating users table:', error);
    }

    try {
        console.log('creating tasks table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                task_id     SERIAL PRIMARY KEY,
                user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                name        TEXT NOT NULL,
                description TEXT,
                completed   BOOLEAN DEFAULT FALSE,
                created_at  TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('successfully created tasks table');
    } catch (error) {
        console.error('Error creating tasks table:', error);
    }

       try {
        console.log('creating habits table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS habits (
                habit_id     SERIAL PRIMARY KEY,
                user_id      INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                name         TEXT NOT NULL,
                description  TEXT,
                frequency    TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'specific')),
                days_of_week INTEGER[] DEFAULT NULL,
                created_at   TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('successfully created habits table');
    } catch (error) {
        console.error('Error creating habits table:', error);
    }

        try {
        console.log('creating habit_completions table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS habit_completions (
                completion_id  SERIAL PRIMARY KEY,
                habit_id       INTEGER NOT NULL REFERENCES habits(habit_id) ON DELETE CASCADE,
                user_id        INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
                UNIQUE(habit_id, completed_date)
            );
        `);
        console.log('successfully created habit_completions table');
    } catch (error) {
        console.error('Error creating habit_completions table:', error);
    }
};

const insertData = async () => {
    try {
        console.log('adding test data...');
        const hashedPassword = await bcrypt.hash('password123', 10);
        const userResult = await pool.query(
            `INSERT INTO users (username, email, password)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING
             RETURNING user_id;`,
            ['Nathan Odle', 'nathanodle@gmail.com', hashedPassword]
        );

        if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].user_id;
            await pool.query(
                `INSERT INTO tasks (user_id, name, description) VALUES
                ($1, 'Review Code', 'Go through the latest pull requests and leave comments.'),
                ($1, 'Design Prototype', 'Create wireframes for the new dashboard layout.'),
                ($1, 'Team Sync', 'Weekly standup with the engineering team.'),
                ($1, 'Update Docs', 'Update the API documentation with new endpoints.'),
                ($1, 'Fix Bugs', 'Resolve the open issues from the bug tracker.');`,
                [userId]
            );
            console.log('successfully added test tasks');
             // Sample habits
            await pool.query(
                `INSERT INTO habits (user_id, name, description, frequency, days_of_week) VALUES
                ($1, 'Morning Run', 'Run at least 2 miles every morning.', 'daily', NULL),
                ($1, 'Read', 'Read at least 20 pages of a book.', 'daily', NULL),
                ($1, 'Gym', 'Strength training session.', 'specific', '{1,3,5}'),
                ($1, 'Weekly Review', 'Review goals and plan for the week ahead.', 'weekly', NULL);`,
                [userId]
            );
            console.log('successfully added test habits');
        }

        console.log('successfully added test data to users table');
    } catch (error) {
        console.error('Error inserting data:', error);
    }
};


const setup = async () => {
    await dropTables();
    await createTables();
    await insertData();
    await pool.end();
}

setup();
