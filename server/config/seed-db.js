import { pool } from './database.js';
import bcrypt from 'bcrypt';

const dropTables = async () => {
    try {
        console.log('dropping tables...');
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
