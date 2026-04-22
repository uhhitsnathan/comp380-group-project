// --- On page load, verify the user is logged in ---
fetch('/api/me')
  .then(res => {
    if (!res.ok) {
      // No valid cookie/session — send them back to login
      window.location.href = 'index.html';
      return;
    }
    return res.json();
  })
  .then(data => {
    if (!data) return;

    // Fill in the username and email from the JWT
    document.getElementById('welcome-username').textContent = data.username;
    document.getElementById('welcome-email').textContent = data.email;
  })
  .catch(() => {
    window.location.href = 'index.html';
  });

// --- Avatar upload preview ---
const avatarInput = document.getElementById('avatarInput');
const profileAvatar = document.getElementById('profileAvatar');

avatarInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      profileAvatar.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});