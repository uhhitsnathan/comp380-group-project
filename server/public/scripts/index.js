function openModal(name) {
    document.getElementById(name + '-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeModal(name) {
    document.getElementById(name + '-overlay').classList.remove('open');
    document.body.style.overflow = '';
}
function handleOverlayClick(e, name) {
    if (e.target === document.getElementById(name + '-overlay')) closeModal(name);
}
function switchModal(from, to) {
    closeModal(from);
    setTimeout(() => openModal(to), 180);
}
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeModal('login');
        closeModal('signup');
        document.body.style.overflow = '';
    }
});

// --- Signup ---
const createAccSubmit = document.getElementById('create-account-submit');
createAccSubmit.addEventListener('click', async () => {
    const username = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!username || !email || !password) {
        showError('signup', 'Please fill in all fields.');
        return;
    }

    try {
        const res  = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            showError('signup', data.error);
            return;
        }

        window.location.href = 'home.html';
    } catch (err) {
        showError('signup', 'Something went wrong. Please try again.');
    }
});

// --- Login ---
const loginAccSubmit = document.getElementById('login-account-submit');
loginAccSubmit.addEventListener('click', async () => {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showError('login', 'Please enter your email and password.');
        return;
    }

    try {
        const res  = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            showError('login', data.error);
            return;
        }

        window.location.href = 'home.html';
    } catch (err) {
        showError('login', 'Something went wrong. Please try again.');
    }
});

// --- Helper: show error message inside modal ---
function showError(modalName, message) {
    // Remove any existing error first
    const existing = document.querySelector(`#${modalName}-overlay .error-msg`);
    if (existing) existing.remove();

    const err = document.createElement('p');
    err.className = 'error-msg';
    err.textContent = message;
    err.style.cssText = 'color: #e74c3c; font-size: 0.85rem; margin: -8px 0 10px 0;';

    // Insert above the submit button
    const btn = document.getElementById(
        modalName === 'login' ? 'login-account-submit' : 'create-account-submit'
    );
    btn.parentElement.insertBefore(err, btn);
}