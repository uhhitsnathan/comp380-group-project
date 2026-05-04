const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// --- On page load, verify the user is logged in and load habits ---
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
     document.getElementById('stat-streak').textContent = data.streak;
    loadHabits();
  })
  .catch(() => {
    window.location.href = 'index.html';
  });

// --- Load all habits and today's completions ---
const loadHabits = async () => {
  try {
    const [habitsRes, todayRes, streakRes] = await Promise.all([
      fetch('/api/habits'),
      fetch('/api/habits/today'),
      fetch('/api/streak')
    ]);

    const habits = await habitsRes.json();
    const todayHabits = await todayRes.json();
    // Refresh streak after loading habits
    
    const streakData = await streakRes.json();
    document.getElementById('stat-streak').textContent = streakData.streak;

    renderHabitList(habits);
    renderTodayList(todayHabits);
    updateStats(habits, todayHabits);
  } catch (err) {
    console.error('Error loading habits:', err);
  }
};

// --- Update stat cards ---
const updateStats = (habits, todayHabits) => {
  const total = todayHabits.length;
  const completed = todayHabits.filter(h => h.completed_today).length;
  const todayPct = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById('stat-active').textContent = habits.length;
  document.getElementById('stat-today').textContent = `${todayPct}%`;
  document.getElementById('today-bar').style.width = `${todayPct}%`;
};

// --- Render the weekly strip for a single day square ---
const renderDaySquare = (day, habitId) => {
  const label = DAYS[day.dayNum === 0 ? 6 : day.dayNum - 1]; // convert Sun=0 to index 6

  if (day.isFuture || !day.isActive) {
    // Future or inactive days — not clickable
    const opacity = day.isFuture ? 'opacity-20' : 'opacity-30';
    return `
      <div class="flex flex-col items-center">
        <span class="text-[8px] font-mono text-zinc-500 mb-1 uppercase">${label}</span>
        <div class="w-8 h-8 border border-white/10 ${opacity}"></div>
      </div>
    `;
  }

  if (day.isCompleted) {
    // Completed day — filled lime square
    const glow = day.isToday ? 'shadow-[0_0_8px_#e2fe4c]' : '';
    const clickable = day.isToday ? `onclick="handleDayToggle(${habitId}, '${day.date}', true)" cursor-pointer hover:brightness-110` : 'cursor-default';
    return `
      <div class="flex flex-col items-center">
        <span class="text-[8px] font-mono text-zinc-500 mb-1 uppercase ${day.isToday ? 'text-[#e2fe4c] font-bold' : ''}">${label}</span>
        <div class="w-8 h-8 bg-[#e2fe4c] flex items-center justify-center ${glow} ${clickable} transition-all">
          <span class="material-symbols-outlined text-black text-sm font-bold">check</span>
        </div>
      </div>
    `;
  }

  if (day.isToday) {
    // Today, not completed — interactive empty square
    return `
      <div class="flex flex-col items-center">
        <span class="text-[8px] font-mono text-[#e2fe4c] mb-1 uppercase font-bold">${label}</span>
        <div
          class="w-8 h-8 border-2 border-[#e2fe4c] hover:bg-[#e2fe4c]/20 cursor-pointer transition-colors"
          onclick="handleDayToggle(${habitId}, '${day.date}', false)"
        ></div>
      </div>
    `;
  }

  // Past day, not completed — missed
  return `
    <div class="flex flex-col items-center">
      <span class="text-[8px] font-mono text-zinc-500 mb-1 uppercase">${label}</span>
      <div class="w-8 h-8 border border-white/10 opacity-30 flex items-center justify-center">
        <span class="material-symbols-outlined text-zinc-600 text-sm">close</span>
      </div>
    </div>
  `;
};

// --- Render all habits in the main list with weekly strip ---
const renderHabitList = (habits) => {
  const list = document.getElementById('habit-list');

  if (habits.length === 0) {
    list.innerHTML = `
      <p class="font-['Lexend'] text-on-surface-variant text-sm px-2">No habits yet. Add one above!</p>
    `;
    return;
  }

  const freqLabel = (habit) => {
    if (habit.frequency === 'daily') return 'DAILY';
    if (habit.frequency === 'weekly') return 'WEEKLY';
    if (habit.frequency === 'specific') {
      const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      return habit.days_of_week.map(d => days[d]).join('/');
    }
    return '';
  };

list.innerHTML = habits.map(habit => `
    <div class="bg-surface-container-high p-5 flex flex-col md:flex-row md:items-center gap-6 group hover:bg-surface-container-highest transition-all duration-300">
      <div class="flex-1 flex flex-col gap-1">
        <div class="flex items-center gap-3">
          <span class="text-[9px] font-label-caps bg-[#e2fe4c]/20 text-[#e2fe4c] px-2 py-0.5 font-bold uppercase tracking-widest">${freqLabel(habit)}</span>
        </div>
        <h3 class="text-lg font-bold font-body-md text-on-surface leading-tight">${habit.name}</h3>
        ${habit.description ? `<p class="text-[10px] font-mono text-on-surface-variant uppercase">${habit.description}</p>` : ''}
      </div>

      <!-- Weekly strip -->
      <div class="flex items-center gap-1.5">
        ${habit.week_strip.map(day => renderDaySquare(day, habit.habit_id)).join('')}
      </div>

      <!-- Delete button -->
      <button
        onclick="handleDeleteHabit(${habit.habit_id})"
        class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-bold text-error uppercase hover:bg-error/10 px-2 py-1 rounded">
        <span class="material-symbols-outlined text-lg">delete</span>
        Remove
      </button>
    </div>
  `).join('');
};

// --- Render today's habits in the sidebar ---
const renderTodayList = (habits) => {
  const list = document.getElementById('today-habit-list');

  if (habits.length === 0) {
    list.innerHTML = `
      <p class="font-['Lexend'] text-on-surface-variant text-sm p-4">No habits due today!</p>
    `;
    return;
  }

  list.innerHTML = habits.map(habit => `
    <div class="p-4 flex items-center justify-between border-b border-white/5 last:border-0 group">
      <div class="flex items-center gap-3">
        <input
          class="w-5 h-5 appearance-none border border-[#e2fe4c] checked:bg-[#e2fe4c] cursor-pointer transition-all"
          type="checkbox"
          ${habit.completed_today ? 'checked' : ''}
          onchange="handleTodayToggle(${habit.habit_id}, this)"
        />
        <span id="today-habit-name-${habit.habit_id}" class="text-sm font-bold text-on-surface font-body-md uppercase tracking-wider ${habit.completed_today ? 'line-through text-zinc-500' : ''}">
          ${habit.name}
        </span>
      </div>
      <span id="today-habit-status-${habit.habit_id}" class="text-[10px] font-mono text-zinc-600 uppercase">
        ${habit.completed_today ? 'DONE' : 'PENDING'}
      </span>
    </div>
  `).join('');
};

// --- Handle clicking a day square in the weekly strip ---
const handleDayToggle = async (habitId, date, isCompleted) => {
  const method = isCompleted ? 'DELETE' : 'POST';

  try {
    const res = await fetch(`/api/habits/${habitId}/complete`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });

    if (!res.ok) return;
    loadHabits(); // Re-render everything
  } catch (err) {
    console.error('Error toggling day:', err);
  }
};

// --- Delete a habit ---
const handleDeleteHabit = async (habitId) => {
  if (!confirm('Are you sure you want to remove this habit? All completion history will be lost.')) return;

  try {
    const res = await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
    if (!res.ok) {
      console.error('Failed to delete habit');
      return;
    }
    loadHabits();
  } catch (err) {
    console.error('Error deleting habit:', err);
  }
};

// --- Handle sidebar checkbox toggle ---
const handleTodayToggle = async (habitId, checkbox) => {
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

    loadHabits(); // Re-render everything including the weekly strip
  } catch (err) {
    console.error('Error toggling habit:', err);
    checkbox.checked = !checkbox.checked;
  }
};

// --- Modal state ---
let selectedFrequency = null;
let selectedDays = [];

const modal = document.getElementById('addHabitModal');

const openModal = () => modal.classList.remove('hidden');

const closeModal = () => {
  modal.classList.add('hidden');
  document.getElementById('habit-name-input').value = '';
  document.getElementById('habit-desc-input').value = '';
  document.getElementById('habit-error').classList.add('hidden');
  document.getElementById('day-picker').classList.add('hidden');
  selectedFrequency = null;
  selectedDays = [];
  document.querySelectorAll('.freq-btn').forEach(btn => {
    btn.classList.remove('border-[#e2fe4c]', 'text-[#e2fe4c]');
  });
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.classList.remove('border-[#e2fe4c]', 'text-[#e2fe4c]', 'bg-[#e2fe4c]/10');
  });
};

document.getElementById('new-habit-btn').addEventListener('click', openModal);
document.getElementById('close-habit-modal').addEventListener('click', closeModal);
document.getElementById('habit-modal-backdrop').addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// --- Frequency button selection ---
document.querySelectorAll('.freq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedFrequency = btn.dataset.freq;
    document.querySelectorAll('.freq-btn').forEach(b => {
      b.classList.remove('border-[#e2fe4c]', 'text-[#e2fe4c]');
    });
    btn.classList.add('border-[#e2fe4c]', 'text-[#e2fe4c]');
    const dayPicker = document.getElementById('day-picker');
    if (selectedFrequency === 'specific') {
      dayPicker.classList.remove('hidden');
    } else {
      dayPicker.classList.add('hidden');
      selectedDays = [];
    }
  });
});

// --- Day button selection ---
document.querySelectorAll('.day-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const day = parseInt(btn.dataset.day);
    if (selectedDays.includes(day)) {
      selectedDays = selectedDays.filter(d => d !== day);
      btn.classList.remove('border-[#e2fe4c]', 'text-[#e2fe4c]', 'bg-[#e2fe4c]/10');
    } else {
      selectedDays.push(day);
      btn.classList.add('border-[#e2fe4c]', 'text-[#e2fe4c]', 'bg-[#e2fe4c]/10');
    }
  });
});

// --- Submit new habit ---
document.getElementById('submit-habit').addEventListener('click', async () => {
  const name = document.getElementById('habit-name-input').value.trim();
  const description = document.getElementById('habit-desc-input').value.trim();
  const err = document.getElementById('habit-error');

  if (!name) {
    err.textContent = 'Habit name is required.';
    err.classList.remove('hidden');
    return;
  }
  if (!selectedFrequency) {
    err.textContent = 'Please select a frequency.';
    err.classList.remove('hidden');
    return;
  }
  if (selectedFrequency === 'specific' && selectedDays.length === 0) {
    err.textContent = 'Please select at least one day.';
    err.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        frequency: selectedFrequency,
        days_of_week: selectedFrequency === 'specific' ? selectedDays : null
      })
    });

    const data = await res.json();

    if (!res.ok) {
      err.textContent = data.error;
      err.classList.remove('hidden');
      return;
    }

    closeModal();
    loadHabits();
  } catch (e) {
    err.textContent = 'Something went wrong. Please try again.';
    err.classList.remove('hidden');
  }
});