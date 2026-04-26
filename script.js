const STORAGE_KEY = "todo.tasks.v1";
const THEME_KEY = "todo.theme.v1";

const state = {
  tasks: [],
  filter: "all",
  editingId: null,
};

const refs = {
  taskInput: document.getElementById("taskInput"),
  addTaskBtn: document.getElementById("addTaskBtn"),
  taskList: document.getElementById("taskList"),
  emptyState: document.getElementById("emptyState"),
  taskCount: document.getElementById("taskCount"),
  clearCompletedBtn: document.getElementById("clearCompletedBtn"),
  filterBtns: document.querySelectorAll(".filter-btn"),
  themeToggle: document.getElementById("themeToggle"),
  themeIcon: document.querySelector(".theme-icon"),
  themeLabel: document.querySelector(".theme-label"),
};

init();

function init() {
  loadTheme();
  loadTasks();
  bindEvents();
  renderTasks();
}

function bindEvents() {
  refs.addTaskBtn.addEventListener("click", () => addTask(refs.taskInput.value));

  refs.taskInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addTask(refs.taskInput.value);
    }
  });

  refs.taskList.addEventListener("change", (event) => {
    const target = event.target;
    if (!target.classList.contains("task-checkbox")) {
      return;
    }

    const item = target.closest(".task-item");
    if (!item) {
      return;
    }

    toggleTask(item.dataset.id);
  });

  refs.taskList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const item = button.closest(".task-item");
    if (!item) {
      return;
    }

    const taskId = item.dataset.id;

    if (action === "delete") {
      animateAndDelete(taskId, item);
      return;
    }

    if (action === "edit") {
      state.editingId = taskId;
      renderTasks();
      focusEditInput(taskId);
      return;
    }

    if (action === "cancel") {
      state.editingId = null;
      renderTasks();
      return;
    }

    if (action === "save") {
      const input = item.querySelector(".edit-input");
      if (input) {
        updateTask(taskId, input.value);
      }
    }
  });

  refs.taskList.addEventListener("keydown", (event) => {
    const input = event.target;
    if (!input.classList.contains("edit-input")) {
      return;
    }

    const item = input.closest(".task-item");
    if (!item) {
      return;
    }

    if (event.key === "Enter") {
      updateTask(item.dataset.id, input.value);
    }

    if (event.key === "Escape") {
      state.editingId = null;
      renderTasks();
    }
  });

  refs.clearCompletedBtn.addEventListener("click", clearCompleted);

  refs.filterBtns.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      state.editingId = null;
      renderTasks();
    });
  });

  refs.themeToggle.addEventListener("click", toggleTheme);
}

function addTask(rawText) {
  const text = rawText.trim();
  if (!text) {
    refs.taskInput.focus();
    return;
  }

  state.tasks.unshift({
    id: createId(),
    text,
    completed: false,
    createdAt: Date.now(),
  });

  refs.taskInput.value = "";
  state.editingId = null;
  persistTasks();
  renderTasks();
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  if (state.editingId === taskId) {
    state.editingId = null;
  }
  persistTasks();
  renderTasks();
}

function updateTask(taskId, rawText) {
  const text = rawText.trim();
  if (!text) {
    return;
  }

  state.tasks = state.tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return { ...task, text };
  });

  state.editingId = null;
  persistTasks();
  renderTasks();
}

function toggleTask(taskId) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return { ...task, completed: !task.completed };
  });

  persistTasks();
  renderTasks();
}

function clearCompleted() {
  state.tasks = state.tasks.filter((task) => !task.completed);
  state.editingId = null;
  persistTasks();
  renderTasks();
}

function renderTasks() {
  const filteredTasks = getFilteredTasks();
  refs.taskList.innerHTML = filteredTasks.map((task) => renderTaskItem(task)).join("");

  const total = state.tasks.length;
  const remaining = state.tasks.filter((task) => !task.completed).length;
  refs.taskCount.textContent = `${remaining} active / ${total} total`;

  refs.emptyState.style.display = filteredTasks.length ? "none" : "block";
  refs.clearCompletedBtn.disabled = !state.tasks.some((task) => task.completed);

  refs.filterBtns.forEach((button) => {
    const isSelected = button.dataset.filter === state.filter;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-selected", String(isSelected));
  });
}

function getFilteredTasks() {
  if (state.filter === "active") {
    return state.tasks.filter((task) => !task.completed);
  }

  if (state.filter === "completed") {
    return state.tasks.filter((task) => task.completed);
  }

  return state.tasks;
}

function renderTaskItem(task) {
  const completedClass = task.completed ? "completed" : "";
  const checked = task.completed ? "checked" : "";
  const safeText = escapeHtml(task.text);

  if (state.editingId === task.id) {
    return `
      <li class="task-item ${completedClass}" data-id="${task.id}">
        <input class="task-checkbox" type="checkbox" ${checked} aria-label="Toggle completion for ${safeText}" />
        <div class="task-main">
          <div class="edit-wrap">
            <input class="edit-input" type="text" value="${safeText}" maxlength="180" aria-label="Edit task" />
            <button class="save-btn" data-action="save" type="button">Save</button>
            <button class="cancel-btn" data-action="cancel" type="button">Cancel</button>
          </div>
          <time class="task-time">${formatDate(task.createdAt)}</time>
        </div>
      </li>
    `;
  }

  return `
    <li class="task-item ${completedClass}" data-id="${task.id}">
      <input class="task-checkbox" type="checkbox" ${checked} aria-label="Toggle completion for ${safeText}" />
      <div class="task-main">
        <p class="task-text">${safeText}</p>
        <time class="task-time">${formatDate(task.createdAt)}</time>
      </div>
      <div class="task-actions">
        <button class="icon-btn" data-action="edit" type="button" aria-label="Edit task">Edit</button>
        <button class="icon-btn delete" data-action="delete" type="button" aria-label="Delete task">Delete</button>
      </div>
    </li>
  `;
}

function animateAndDelete(taskId, itemElement) {
  itemElement.classList.add("is-removing");
  window.setTimeout(() => deleteTask(taskId), 170);
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.tasks = [];
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.tasks = Array.isArray(parsed)
      ? parsed.filter(isValidTask).map((task) => ({
          ...task,
          text: String(task.text),
          completed: Boolean(task.completed),
          createdAt: Number(task.createdAt || Date.now()),
        }))
      : [];
  } catch {
    state.tasks = [];
  }
}

function persistTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidTask(task) {
  return task && typeof task.id === "string" && typeof task.text === "string";
}

function focusEditInput(taskId) {
  const input = refs.taskList.querySelector(`.task-item[data-id="${taskId}"] .edit-input`);
  if (!input) {
    return;
  }

  input.focus();
  input.select();
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const isDark = savedTheme === "dark";
  document.body.classList.toggle("dark", isDark);
  updateThemeButton(isDark);
}

function toggleTheme() {
  const isDark = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  updateThemeButton(isDark);
}

function updateThemeButton(isDark) {
  refs.themeToggle.setAttribute("aria-pressed", String(isDark));
  refs.themeIcon.textContent = isDark ? "🌙" : "☀";
  refs.themeLabel.textContent = isDark ? "Dark" : "Light";
}
