const API = '/api';

let state = {
  token: localStorage.getItem('breach_token') || null,
  username: localStorage.getItem('breach_username') || null,
  score: 0,
  missions: [],
  activeMissionId: null,
};

const el = (id) => document.getElementById(id);

// ---------- Auth ----------

el('logout-btn') && el('logout-btn').addEventListener('click', logout);

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    el('login-form').classList.toggle('hidden', tab !== 'login');
    el('signup-form').classList.toggle('hidden', tab !== 'signup');
    el('auth-error').textContent = '';
  });
});

el('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = el('login-username').value.trim();
  const password = el('login-password').value;
  await authRequest('/auth/login', { username, password });
});

el('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = el('signup-username').value.trim();
  const password = el('signup-password').value;
  await authRequest('/auth/signup', { username, password });
});

async function authRequest(endpoint, body) {
  el('auth-error').textContent = '';
  try {
    const res = await fetch(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      el('auth-error').textContent = data.error || 'Something went wrong';
      return;
    }
    state.token = data.token;
    state.username = data.username;
    state.score = data.score;
    localStorage.setItem('breach_token', data.token);
    localStorage.setItem('breach_username', data.username);
    enterApp();
  } catch (err) {
    el('auth-error').textContent = 'Network error. Is the server running?';
  }
}

function logout() {
  state.token = null;
  state.username = null;
  localStorage.removeItem('breach_token');
  localStorage.removeItem('breach_username');
  el('app-screen').classList.add('hidden');
  el('auth-screen').classList.remove('hidden');
}

// ---------- App ----------

async function enterApp() {
  el('auth-screen').classList.add('hidden');
  el('app-screen').classList.remove('hidden');
  el('username-display').textContent = state.username;
  await loadMissions();
  await loadLeaderboard();
}

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${state.token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  return res.json();
}

async function loadMissions() {
  const data = await apiFetch('/missions');
  state.missions = data.missions;
  renderMissions();
}

async function loadLeaderboard() {
  const data = await apiFetch('/leaderboard');
  const container = el('leaderboard-container');
  container.innerHTML = '';
  data.leaderboard.forEach((row, i) => {
    const div = document.createElement('div');
    div.className = 'leaderboard-row';
    div.innerHTML = `<span>${i + 1}. ${escapeHtml(row.username)}</span><span>${row.score}</span>`;
    container.appendChild(div);
  });
}

function renderMissions() {
  const container = el('missions-container');
  container.innerHTML = '';
  state.missions.forEach((m) => {
    const card = document.createElement('div');
    card.className = 'mission-card' + (m.id === state.activeMissionId ? ' active' : '') + (m.completed ? ' completed' : '');
    card.innerHTML = `
      <div class="mission-title">${m.completed ? '✓ ' : ''}${escapeHtml(m.title)}</div>
      <div class="mission-meta">${m.difficulty} · ${m.points} pts · step ${m.stepIndex}/${m.totalSteps}</div>
    `;
    card.addEventListener('click', () => selectMission(m.id));
    container.appendChild(card);
  });
}

async function selectMission(id) {
  state.activeMissionId = id;
  renderMissions();
  const mission = await apiFetch(`/missions/${id}`);
  clearTerminal();
  printLine(`--- ${mission.title} (${mission.difficulty}, ${mission.points} pts) ---`, 'line-system');
  printLine(mission.briefing, 'line-output');
  if (mission.completed) {
    printLine('\n[This mission is already complete]', 'line-success');
  }
  const input = el('terminal-input');
  input.disabled = false;
  input.placeholder = 'type a command...';
  input.focus();
}

function clearTerminal() {
  el('terminal-output').innerHTML = '';
}

function printLine(text, cls) {
  const div = document.createElement('div');
  div.className = cls || 'line-output';
  div.textContent = text;
  el('terminal-output').appendChild(div);
  el('terminal-output').scrollTop = el('terminal-output').scrollHeight;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

el('terminal-input').addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;
  const input = e.target;
  const command = input.value.trim();
  if (!command || !state.activeMissionId) return;

  printLine('$ ' + command, 'line-command');
  input.value = '';

  if (command.toLowerCase() === 'hint') {
    printLine('Hint: re-read the last output carefully — it usually tells you the next command.', 'line-system');
    return;
  }

  try {
    const data = await apiFetch(`/missions/${state.activeMissionId}/command`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
    printLine(data.output, data.completed ? 'line-success' : 'line-output');
    if (typeof data.score === 'number') {
      state.score = data.score;
      el('score-display').textContent = `${state.score} pts`;
    }
    await loadMissions();
    if (data.completed) await loadLeaderboard();
  } catch (err) {
    printLine('Error contacting server.', 'line-error');
  }
});

// ---------- Init ----------

if (state.token) {
  enterApp().catch(logout);
}
