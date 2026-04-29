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
     if (data.avatar_url) {
      document.getElementById('nav-avatar').src = data.avatar_url;
    }
    loadTasks();
  })
  .catch(() => {
    window.location.href = 'index.html';
  });

// --- Load tasks and split into active and completed ---
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

    renderActiveTasks(active);
    renderCompletedTasks(completed);
    updateStats(active.length, completed.length);
  } catch (err) {
    console.error('Error loading tasks:', err);
  }
};

// --- Update the stat cards ---
const updateStats = (activeCount, completedCount) => {
  const total = activeCount + completedCount;
  const efficiency = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  document.getElementById('stat-completed').textContent = completedCount;
  document.getElementById('stat-active').textContent = activeCount;
  document.getElementById('stat-efficiency').textContent = `${efficiency}%`;
  document.getElementById('efficiency-bar').style.width = `${efficiency}%`;
};

// --- Render active tasks ---
const renderActiveTasks = (tasks) => {
  const list = document.getElementById('active-task-list');

  if (tasks.length === 0) {
    list.innerHTML = `
      <p class="font-['Lexend'] text-on-surface-variant text-sm px-2">No active tasks. Add one above!</p>
    `;
    return;
  }

  list.innerHTML = tasks.map(task => `
    <div class="bg-surface-container-high p-5 flex items-center gap-6 group hover:bg-surface-container-highest transition-all duration-300">
      <div class="relative flex items-center justify-center">
        <input
          class="w-6 h-6 bg-transparent border-2 border-primary/40 rounded-none text-primary focus:ring-0 focus:ring-offset-0 checked:bg-primary cursor-pointer"
          type="checkbox"
          onchange="handleToggle(${task.task_id}, this)"
        />
      </div>
      <div class="flex-1 flex flex-col gap-1">
        <h3 id="task-name-${task.task_id}" class="text-lg font-bold font-body text-on-surface leading-tight">${task.name}</h3>
        ${task.description ? `<p class="text-xs font-['Manrope'] text-on-surface-variant">${task.description}</p>` : ''}
      </div>
    </div>
  `).join('');
};

// --- Render completed tasks ---
const renderCompletedTasks = (tasks) => {
  const list = document.getElementById('completed-task-list');

  if (tasks.length === 0) {
    list.innerHTML = `
      <p class="font-['Lexend'] text-on-surface-variant text-sm p-4">No completed tasks yet.</p>
    `;
    return;
  }

  list.innerHTML = tasks.map(task => `
    <div class="p-4 flex items-start gap-4 border-b border-white/5 last:border-0 group">
      <div class="mt-1">
        <span class="material-symbols-outlined text-primary text-lg" style="font-variation-settings: 'FILL' 1;">check_circle</span>
      </div>
      <div class="flex-1">
        <h4 class="text-sm font-bold text-zinc-500 line-through decoration-primary/40 font-body">${task.name}</h4>
        ${task.description ? `<p class="text-[10px] font-['Lexend'] text-zinc-700 uppercase tracking-widest mt-1">${task.description}</p>` : ''}
      </div>
      <button
        onclick="handleRestore(${task.task_id})"
        class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary/10 rounded flex items-center gap-1 text-[10px] font-bold text-primary uppercase">
        <span class="material-symbols-outlined text-lg">restore</span>
        Restore
      </button>
    </div>
  `).join('');
};

// --- Toggle a task to completed (check it off) ---
const handleToggle = async (taskId, checkbox) => {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH' });
    if (!res.ok) {
      checkbox.checked = !checkbox.checked;
      return;
    }
    loadTasks(); // Re-render both lists and stats
  } catch (err) {
    console.error('Error toggling task:', err);
    checkbox.checked = !checkbox.checked;
  }
};

// --- Restore a completed task back to active ---
const handleRestore = async (taskId) => {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH' });
    if (!res.ok) return;
    loadTasks(); // Re-render both lists and stats
  } catch (err) {
    console.error('Error restoring task:', err);
  }
};

// --- Modal open/close ---
const modal = document.getElementById('addTaskModal');

const openModal = () => modal.classList.remove('hidden');

const closeModal = () => {
  modal.classList.add('hidden');
  document.getElementById('task-name-input').value = '';
  document.getElementById('task-desc-input').value = '';
  const err = document.getElementById('task-error');
  err.textContent = '';
  err.classList.add('hidden');
};

document.getElementById('open-add-task').addEventListener('click', openModal);
document.getElementById('fab-add-task').addEventListener('click', openModal);
document.getElementById('close-add-task').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', closeModal);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

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