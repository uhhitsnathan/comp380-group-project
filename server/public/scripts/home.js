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
    loadTasks();
  })
  .catch(() => {
    window.location.href = 'index.html';
  });

// --- Load and render tasks from the API ---
const loadTasks = async () => {
  try {
    const res = await fetch('/api/tasks');
    if (!res.ok) {
      window.location.href = 'index.html';
      return;
    }
    const tasks = await res.json();
    renderTasks(tasks);
  } catch (err) {
    console.error('Error loading tasks:', err);
  }
};

// --- Render tasks into the task list ---
const renderTasks = (tasks) => {
  const taskList = document.getElementById('task-list');

  if (tasks.length === 0) {
    taskList.innerHTML = `
      <p class="font-['Lexend'] text-on-surface-variant text-sm">No tasks yet. Add one below!</p>
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
          ${task.completed ? 'checked' : ''}
          onchange="handleToggle(${task.task_id}, this)"
        />
        <span class="material-symbols-outlined absolute left-0 text-black text-lg opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">check</span>
      </div>
      <div class="flex flex-col">
        <span id="task-name-${task.task_id}" class="font-['Lexend'] text-on-surface text-lg transition-all ${task.completed ? 'line-through text-on-surface-variant/50' : ''}">
          ${task.name}
        </span>
        ${task.description ? `<span class="font-['Manrope'] text-on-surface-variant text-xs mt-0.5">${task.description}</span>` : ''}
      </div>
    </label>
  `).join('');
};

// --- Toggle a task complete/incomplete ---
const handleToggle = async (taskId, checkbox) => {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH' });
    if (!res.ok) {
      checkbox.checked = !checkbox.checked;
      return;
    }
    const updated = await res.json();

    // Use the unique ID to reliably find the name span
    const nameSpan = document.getElementById(`task-name-${taskId}`);
    if (updated.completed) {
      nameSpan.classList.add('line-through', 'text-on-surface-variant/50');
    } else {
      nameSpan.classList.remove('line-through', 'text-on-surface-variant/50');
    }
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
    loadTasks(); // Reload the task list to show the new task
  } catch (e) {
    err.textContent = 'Something went wrong. Please try again.';
    err.classList.remove('hidden');
  }
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