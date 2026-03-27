import { pool } from './database.js';
import bcrypt from 'bcrypt';

const dropTables = async () => {
    try {
        console.log('dropping tables...');
        await pool.query(`DROP TABLE IF EXISTS users;`);
        console.log('tables dropped.');
    } catch (error) {
        console.error('Error dropping tables:', error);
    }
};


const createTables = async () => {
    try {
        console.log('creating tables...');
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
        console.error('Error creating tables:', error);
    }
};

const insertData = async () => {
    try {
        console.log('adding test data...');
        const hashedPassword = await bcrypt.hash('password123', 10);
        await pool.query(
            `INSERT INTO users (username, email, password)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING;`,
            ['Nathan Odle', 'nathanodle@gmail.com', hashedPassword]
        );
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
