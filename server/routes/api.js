import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getUserByEmail, createUser, emailExists } from '../data/login.js';

const router = express.Router();

// --- Helper: sign a JWT for a user ---
const signToken = (user) => {
    return jwt.sign(
        { user_id: user.user_id, username: user.username, email: user.email },
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
router.get('/me', (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Not logged in.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({
            user_id: decoded.user_id,
            username: decoded.username,
            email: decoded.email
        });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session.' });
    }
});



export default router;