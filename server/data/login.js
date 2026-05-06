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
    const habitsResult = await pool.query(
        `SELECT habit_id, frequency, days_of_week FROM habits WHERE user_id = $1`,
        [userId]
    );
    const habits = habitsResult.rows;

    if (habits.length === 0) {
        await updateStreak(userId, 0);
        return 0;
    }

    const completionsResult = await pool.query(
        `SELECT habit_id, TO_CHAR(completed_date, 'YYYY-MM-DD') as date
         FROM habit_completions
         WHERE user_id = $1`,
        [userId]
    );
    const completions = completionsResult.rows;

    // Get today's date as a simple YYYY-MM-DD string using local time
    const todayStr = new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD

    // Get Monday of a week given any date string YYYY-MM-DD
    const getMondayStr = (dateStr) => {
        const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST issues
        const day = d.getDay(); // 0=Sun, 1=Mon...
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return d.toLocaleDateString('en-CA');
    };

    // Get all dates in a week given its Monday date string
    const getWeekDates = (mondayStr) => {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(mondayStr + 'T12:00:00');
            d.setDate(d.getDate() + i);
            dates.push(d.toLocaleDateString('en-CA'));
        }
        return dates;
    };

    // Check if a habit was fully completed for a given week
    const wasHabitCompletedForWeek = (habit, mondayStr) => {
        const weekDates = getWeekDates(mondayStr);
        const habitCompletions = completions
            .filter(c => c.habit_id === habit.habit_id && weekDates.includes(c.date))
            .map(c => c.date);

        if (habit.frequency === 'daily') {
            // Every day up to and including today must be completed
            for (const date of weekDates) {
                if (date > todayStr) break; // don't require future days
                if (!habitCompletions.includes(date)) return false;
            }
            return true;
        }

        if (habit.frequency === 'weekly') {
            return habitCompletions.length > 0;
        }

        if (habit.frequency === 'specific') {
            for (const date of weekDates) {
                if (date > todayStr) break;
                const dayNum = new Date(date + 'T12:00:00').getDay();
                if (habit.days_of_week.includes(dayNum)) {
                    if (!habitCompletions.includes(date)) return false;
                }
            }
            return true;
        }

        return false;
    };

    // Walk back week by week
    let streak = 0;
    let mondayStr = getMondayStr(todayStr);

    for (let i = 0; i < 52; i++) {
        const weekDates = getWeekDates(mondayStr);
        const sundayStr = weekDates[6];
        const isCurrentWeek = todayStr >= mondayStr && todayStr <= sundayStr;


        const allDone = habits.every(habit => {
            const result = wasHabitCompletedForWeek(habit, mondayStr);
            return result;
        });


        if (allDone) {
            streak++;
        } else if (isCurrentWeek) {
            // Current week not done yet — don't break, just skip it and check last week
        } else {
            break; // Past week was missed — streak is broken
        }

        // Go back one week
        const prevMonday = new Date(mondayStr + 'T12:00:00');
        prevMonday.setDate(prevMonday.getDate() - 7);
        mondayStr = prevMonday.toLocaleDateString('en-CA');
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




// Badge definitions
export const BADGE_MILESTONES = [
    { key: 'first_step', label: 'First Step', description: 'Complete a 1 week streak', weeks: 1, icon: '🥉' },
    { key: 'consistent', label: 'Consistent', description: 'Complete a 4 week streak', weeks: 4, icon: '🥈' },
    { key: 'dedicated', label: 'Dedicated', description: 'Complete an 8 week streak', weeks: 8, icon: '🥇' },
    { key: 'elite', label: 'Elite', description: 'Complete a 12 week streak', weeks: 12, icon: '💎' },
    { key: 'unstoppable', label: 'Unstoppable', description: 'Complete a 24 week streak', weeks: 24, icon: '🔥' },
];

// Get all badges for a user
export const getBadgesByUserId = async (userId) => {
    const result = await pool.query(
        `SELECT badge_key, earned_at
         FROM badges
         WHERE user_id = $1
         ORDER BY earned_at ASC`,
        [userId]
    );
    return result.rows;
};

// Check streak against milestones and award any new badges
export const checkAndAwardBadges = async (userId, streak) => {
    // Get badges the user already has
    const existing = await getBadgesByUserId(userId);
    const existingKeys = existing.map(b => b.badge_key);

    // Find milestones the user has reached but hasn't been awarded yet
    const newBadges = BADGE_MILESTONES.filter(
        badge => streak >= badge.weeks && !existingKeys.includes(badge.key)
    );

    // Award each new badge
    for (const badge of newBadges) {
        await pool.query(
            `INSERT INTO badges (user_id, badge_key)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [userId, badge.key]
        );
        console.log(`Awarded badge: ${badge.label} to user ${userId}`);
    }

    return newBadges;
};