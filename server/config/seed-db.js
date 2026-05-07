import { pool } from './database.js';
import bcrypt from 'bcrypt';

const dropTables = async () => {
    try {
        console.log('dropping tables...');
        await pool.query(`DROP TABLE IF EXISTS habit_completions;`);
        await pool.query(`DROP TABLE IF EXISTS habits;`);
        await pool.query(`DROP TABLE IF EXISTS tasks;`);
        await pool.query(`DROP TABLE IF EXISTS badges;`);
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
                streak     INTEGER DEFAULT 0,
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

    try {
        console.log('creating badges table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS badges (
                badge_id   SERIAL PRIMARY KEY,
                user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                badge_key  TEXT NOT NULL,
                earned_at  TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, badge_key)
            );
        `);
        console.log('successfully created badges table');
    } catch (error) {
        console.error('Error creating badges table:', error);
    }
};

const insertDailyCompletions = async (habitId, userId, dates) => {
    for (const date of dates) {
        await pool.query(
            `INSERT INTO habit_completions (habit_id, user_id, completed_date)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING;`,
            [habitId, userId, date]
        );
    }
};

const insertData = async () => {
    try {
        console.log('adding test data...');

        const hashedPassword = await bcrypt.hash('password123', 10);

        const userResult = await pool.query(
            `INSERT INTO users (username, email, password, streak)
             VALUES ($1, $2, $3, $4)
             RETURNING user_id;`,
            ['Nathan Odle', 'nathanodle@gmail.com', hashedPassword, 5] //change 5 to 8 for testing of 8 week streak
        );

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

        const habit1 = await pool.query(
            `INSERT INTO habits (user_id, name, description, frequency, days_of_week)
             VALUES ($1, 'Morning Run', 'Run at least 2 miles every morning.', 'daily', NULL)
             RETURNING habit_id;`,
            [userId]
        );

        const habit2 = await pool.query(
            `INSERT INTO habits (user_id, name, description, frequency, days_of_week)
             VALUES ($1, 'Read', 'Read at least 20 pages of a book.', 'daily', NULL)
             RETURNING habit_id;`,
            [userId]
        );

        const habit3 = await pool.query(
            `INSERT INTO habits (user_id, name, description, frequency, days_of_week)
             VALUES ($1, 'Gym', 'Strength training session.', 'specific', '{1,3,5}')
             RETURNING habit_id;`,
            [userId]
        );

        const habit4 = await pool.query(
            `INSERT INTO habits (user_id, name, description, frequency, days_of_week)
             VALUES ($1, 'Weekly Review', 'Review goals and plan for the week ahead.', 'weekly', NULL)
             RETURNING habit_id;`,
            [userId]
        );

        console.log('successfully added test habits');

        const morningRunId = habit1.rows[0].habit_id;
        const readId = habit2.rows[0].habit_id;
        const gymId = habit3.rows[0].habit_id;
        const weeklyReviewId = habit4.rows[0].habit_id;

        const dailyDates = [
            // Week 1: 2026-03-30 to 2026-04-05
            '2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05',

            // Week 2: 2026-04-06 to 2026-04-12
            '2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12',

            // Week 3: 2026-04-13 to 2026-04-19
            '2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17', '2026-04-18', '2026-04-19',

            // Week 4: 2026-04-20 to 2026-04-26
            '2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24', '2026-04-25', '2026-04-26',

            // Week 5: 2026-04-27 to 2026-05-03
            '2026-04-27', '2026-04-28', '2026-04-29', '2026-04-30', '2026-05-01', '2026-05-02', '2026-05-03'
        ];

        const gymDates = [
            // Week 1: Monday, Wednesday, Friday
            '2026-03-30', '2026-04-01', '2026-04-03',

            // Week 2: Monday, Wednesday, Friday
            '2026-04-06', '2026-04-08', '2026-04-10',

            // Week 3: Monday, Wednesday, Friday
            '2026-04-13', '2026-04-15', '2026-04-17',

            // Week 4: Monday, Wednesday, Friday
            '2026-04-20', '2026-04-22', '2026-04-24',

            // Week 5: Monday, Wednesday, Friday
            '2026-04-27', '2026-04-29', '2026-05-01'
        ];

        const weeklyReviewDates = [
            '2026-04-05',
            '2026-04-12',
            '2026-04-19',
            '2026-04-26',
            '2026-05-03'
        ];

    //test data for 8 week streak (uncomment and change dailyDates, gymDates, and weeklyReviewDates above to match the dates below)
    /* const dailyDates = [
    // Week 1
    '2026-03-09','2026-03-10','2026-03-11','2026-03-12','2026-03-13','2026-03-14','2026-03-15',

    // Week 2
    '2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-20','2026-03-21','2026-03-22',

    // Week 3
    '2026-03-23','2026-03-24','2026-03-25','2026-03-26','2026-03-27','2026-03-28','2026-03-29',

    // Week 4
    '2026-03-30','2026-03-31','2026-04-01','2026-04-02','2026-04-03','2026-04-04','2026-04-05',

    // Week 5
    '2026-04-06','2026-04-07','2026-04-08','2026-04-09','2026-04-10','2026-04-11','2026-04-12',

    // Week 6
    '2026-04-13','2026-04-14','2026-04-15','2026-04-16','2026-04-17','2026-04-18','2026-04-19',

    // Week 7
    '2026-04-20','2026-04-21','2026-04-22','2026-04-23','2026-04-24','2026-04-25','2026-04-26',

    // Week 8
    '2026-04-27','2026-04-28','2026-04-29','2026-04-30','2026-05-01','2026-05-02','2026-05-03'
];
const gymDates = [
    // Week 1
    '2026-03-09','2026-03-11','2026-03-13',

    // Week 2
    '2026-03-16','2026-03-18','2026-03-20',

    // Week 3
    '2026-03-23','2026-03-25','2026-03-27',

    // Week 4
    '2026-03-30','2026-04-01','2026-04-03',

    // Week 5
    '2026-04-06','2026-04-08','2026-04-10',

    // Week 6
    '2026-04-13','2026-04-15','2026-04-17',

    // Week 7
    '2026-04-20','2026-04-22','2026-04-24',

    // Week 8
    '2026-04-27','2026-04-29','2026-05-01'
];
const weeklyReviewDates = [
    '2026-03-15',
    '2026-03-22',
    '2026-03-29',
    '2026-04-05',
    '2026-04-12',
    '2026-04-19',
    '2026-04-26',
    '2026-05-03'
];

*/

        await insertDailyCompletions(morningRunId, userId, dailyDates);
        await insertDailyCompletions(readId, userId, dailyDates);
        await insertDailyCompletions(gymId, userId, gymDates);
        await insertDailyCompletions(weeklyReviewId, userId, weeklyReviewDates);

        console.log('successfully added 5 weeks of habit completions');
        console.log('successfully added all test data');
    } catch (error) {
        console.error('Error inserting data:', error);
    }
};

const setup = async () => {
    await dropTables();
    await createTables();
    await insertData();
    await pool.end();
};

setup();
