// --- On page load, verify the user is logged in and load tasks ---
fetch('/api/me')
  .then(res => {
    if (!res.ok) {
      window.location.href = 'index.html';
      return;
    }
    return res.json();
  })
  .then(data => {
    if (!data) return;
    document.getElementById('welcome-username').textContent = data.username;
    document.getElementById('welcome-email').textContent = data.email;
     if (data.avatar_url) {
      document.getElementById('profileAvatar').src = data.avatar_url;
    }
    document.getElementById('streak-count').textContent = data.streak;
    loadTasks();
    loadHabits();
  })
  .catch(() => {
    window.location.href = 'index.html';
  });

// --- Load and render only active (incomplete) tasks ---
const loadTasks = async () => {
  try {
    const res = await fetch('/api/tasks');
    if (!res.ok) {
      window.location.href = 'index.html';
      return;
    }
    const tasks = await res.json();
    const active = tasks.filter(t => !t.completed);
    const completed = tasks.filter(t => t.completed);

    renderTasks(active);
    document.getElementById('stat-completed').textContent = completed.length;
  } catch (err) {
    console.error('Error loading tasks:', err);
  }
};


// --- Load and render today's habits ---
const loadHabits = async () => {
  try {


      const [habitsRes, todayRes] = await Promise.all([
      fetch('/api/habits'),
      fetch('/api/habits/today')
    ]);
    const habits = await habitsRes.json();
    const todayHabits = await todayRes.json();
    renderHabits(todayHabits);
    document.getElementById('stat-habits-formed').textContent = habits.length;

  } catch (err) {
    console.error('Error loading habits:', err);
  }
};

// --- Render today's habits ---
const renderHabits = (habits) => {
  const habitList = document.getElementById('habit-list');

  if (habits.length === 0) {
    habitList.innerHTML = `
      <p class="font-['Lexend'] text-on-surface-variant text-sm">No habits due today. Add some on the habits page!</p>
    `;
    return;
  }

  habitList.innerHTML = habits.map(habit => `
    <label class="flex items-center gap-4 bg-surface-container-low p-5 rounded-lg border border-outline-variant/10 ${habit.completed_today ? '' : 'hover:border-primary/30'} transition-all group ${habit.completed_today ? '' : 'cursor-pointer'}">
      <div class="relative flex items-center">
        <input
          class="peer appearance-none w-6 h-6 border-2 border-primary rounded-sm checked:bg-primary transition-all ${habit.completed_today ? 'cursor-default' : 'cursor-pointer'}"
          type="checkbox"
          ${habit.completed_today ? 'checked disabled' : ''}
          ${!habit.completed_today ? `onchange="handleHabitToggle(${habit.habit_id}, this)"` : ''}
        />
      </div>
      <div class="flex flex-col">
        <span id="habit-name-${habit.habit_id}" class="font-['Lexend'] text-on-surface text-lg transition-all ${habit.completed_today ? 'line-through text-on-surface-variant/50' : ''}">
          ${habit.name}
        </span>
        ${habit.description ? `<span class="font-['Manrope'] text-on-surface-variant text-xs mt-0.5">${habit.description}</span>` : ''}
      </div>
    </label>
  `).join('');
};

// --- Toggle a habit complete/incomplete for today ---
const handleHabitToggle = async (habitId, checkbox) => {
  const today = new Date().toISOString().split('T')[0];
  const method = checkbox.checked ? 'POST' : 'DELETE';

  try {
    const res = await fetch(`/api/habits/${habitId}/complete`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today })
    });

    if (!res.ok) {
      checkbox.checked = !checkbox.checked;
      return;
    }

    // Update the visual style without re-rendering
    const nameSpan = document.getElementById(`habit-name-${habitId}`);
    const label = checkbox.closest('label');
    if (checkbox.checked) {
      nameSpan.classList.add('line-through', 'text-on-surface-variant/50');
      label.classList.add('opacity-60');
    } else {
      nameSpan.classList.remove('line-through', 'text-on-surface-variant/50');
      label.classList.remove('opacity-60');
    }
  } catch (err) {
    console.error('Error toggling habit:', err);
    checkbox.checked = !checkbox.checked;
  }
};

// --- Render active tasks into the task list ---
const renderTasks = (tasks) => {
  const taskList = document.getElementById('task-list');

  if (tasks.length === 0) {
    taskList.innerHTML = `
      <p class="font-['Lexend'] text-on-surface-variant text-sm">No active tasks. Add one below!</p>
    `;
    return;
  }

  taskList.innerHTML = tasks.map(task => `
    <label class="flex items-center gap-4 bg-surface-container-low p-5 rounded-lg border border-outline-variant/10 hover:border-primary/30 transition-all group cursor-pointer">
      <div class="relative flex items-center">
        <input
          class="peer appearance-none w-6 h-6 border-2 border-primary rounded-sm checked:bg-primary transition-all cursor-pointer"
          type="checkbox"
          data-task-id="${task.task_id}"
          onchange="handleToggle(${task.task_id}, this)"
        />
      </div>
      <div class="flex flex-col">
        <span id="task-name-${task.task_id}" class="font-['Lexend'] text-on-surface text-lg transition-all">
          ${task.name}
        </span>
        ${task.description ? `<span class="font-['Manrope'] text-on-surface-variant text-xs mt-0.5">${task.description}</span>` : ''}
      </div>
    </label>
  `).join('');
};

// --- Toggle a task and remove it from the list on completion ---
const handleToggle = async (taskId, checkbox) => {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH' });
    if (!res.ok) {
      checkbox.checked = !checkbox.checked;
      return;
    }
    loadTasks(); 
  } catch (err) {
    console.error('Error toggling task:', err);
    checkbox.checked = !checkbox.checked;
  }
};

// --- Modal open/close ---
const modal = document.getElementById('addTaskModal');

document.getElementById('open-add-task').addEventListener('click', () => {
  modal.classList.remove('hidden');
});

document.getElementById('close-add-task').addEventListener('click', () => {
  closeModal();
});

document.getElementById('modal-backdrop').addEventListener('click', () => {
  closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

const closeModal = () => {
  modal.classList.add('hidden');
  document.getElementById('task-name-input').value = '';
  document.getElementById('task-desc-input').value = '';
  const err = document.getElementById('task-error');
  err.textContent = '';
  err.classList.add('hidden');
};

// --- Submit new task ---
document.getElementById('submit-add-task').addEventListener('click', async () => {
  const name = document.getElementById('task-name-input').value.trim();
  const description = document.getElementById('task-desc-input').value.trim();
  const err = document.getElementById('task-error');

  if (!name) {
    err.textContent = 'Task name is required.';
    err.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
    const data = await res.json();

    if (!res.ok) {
      err.textContent = data.error;
      err.classList.remove('hidden');
      return;
    }

    closeModal();
    loadTasks();
  } catch (e) {
    err.textContent = 'Something went wrong. Please try again.';
    err.classList.remove('hidden');
  }
});

// --- Navigate to completed tasks page ---
document.getElementById('tasks-completed-card').addEventListener('click', () => {
  window.location.href = 'tasks.html';
});

// --- Avatar upload ---
const avatarInput = document.getElementById('avatarInput');
const profileAvatar = document.getElementById('profileAvatar');

avatarInput.addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Preview immediately so it feels responsive
  const reader = new FileReader();
  reader.onload = function(event) {
    profileAvatar.src = event.target.result;
  };
  reader.readAsDataURL(file);

  // Upload to server and save permanently
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch('/api/avatar', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      console.error('Avatar upload failed');
      return;
    }

    const data = await res.json();
    // Set the real saved URL in case the preview differs
    profileAvatar.src = data.avatar_url;
  } catch (err) {
    console.error('Error uploading avatar:', err);
  }
});


// --- Logout ---
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    window.location.href = 'index.html';
  }
});

// --- Navigate to habits page ---
document.getElementById('open-habits-page').addEventListener('click', () => {
  window.location.href = 'habits.html';
});