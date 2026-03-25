const todoApp = document.getElementById("todoApp");

const list = document.getElementById("todoList");
const form = document.getElementById("todoForm");
const todoText = document.getElementById("todoText");
const todoDate = document.getElementById("todoDate");
const stats = document.getElementById("stats");
const filterAll = document.getElementById("filterAll");
const filterToday = document.getElementById("filterToday");
const filterCompleted = document.getElementById("filterCompleted");
const filterPassive = document.getElementById("filterPassive");

let currentUser = 'guest';
let currentList = 'Standard';
let lists = [];
let todos = [];

function validateInput(text) {
  if (typeof text !== "string") return "";
  let cleaned = text.replace(/[<>"]/g, '');
  cleaned = cleaned.replace(/[\\']/g, '');
  return cleaned.trim().substring(0, 200);
}

function validateDate(date) {
  if (typeof date !== "string") return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "";
  return date;
}

function getTodosKey() {
  return `todo_lists_${currentList}`;
}

function getListsKey() {
  return 'todo_lists_index';
}

function loadLists() {
  try {
    const stored = localStorage.getItem(getListsKey());
    if (stored) {
      lists = JSON.parse(stored);
    } else {
      lists = ['Standard'];
      saveLists();
    }
  } catch (e) {
    console.error("Load lists failed:", e);
    lists = ['Standard'];
  }
}

function saveLists() {
  try {
    localStorage.setItem(getListsKey(), JSON.stringify(lists));
  } catch (e) {
    console.error("Save lists failed:", e);
  }
}

function createList(name) {
  const cleanName = validateInput(name).substring(0, 50);
  if (cleanName && !lists.includes(cleanName)) {
    lists.push(cleanName);
    saveLists();
    switchList(cleanName);
    return true;
  }
  return false;
}

function deleteList(name) {
  const index = lists.indexOf(name);
  if (index > -1 && lists.length > 1) {
    lists.splice(index, 1);
    if (currentList === name) {
      switchList(lists[0]);
    }
    saveLists();
    // Optionally delete todos: localStorage.removeItem(getTodosKey().replace(currentList, name));
    return true;
  }
  return false;
}

function switchList(name) {
  if (lists.includes(name)) {
    currentList = name;
    loadUserTodos();
    updateListUI();
  }
}

function updateListUI() {
  const header = document.querySelector('.app-header h1');
  if (header) {
    header.textContent = `📝 Todo Liste – ${currentList}`;
  }
  updateListSelect();
}

function save() {
  try {
    localStorage.setItem(getTodosKey(), JSON.stringify(todos));
  } catch (e) {
    console.error("Save failed:", e);
  }
}

function loadTodos() {
  try {
    const stored = localStorage.getItem(getTodosKey());
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Load failed:", e);
  }
  return [];
}

function loadUserTodos() {
  todos = loadTodos().map(todo => ({
    ...todo,
    text: validateInput(todo.text),
    date: validateDate(todo.date)
  }));
  render();
}

let currentFilter = "all";
let editingIndex = -1;

function sanitizeText(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function updateStats() {
  if (!stats) return;
  const activeTodos = todos.filter(todo => !todo.passive);
  const total = activeTodos.length;
  const completed = activeTodos.filter(todo => todo.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  stats.innerHTML = "";
  const statsText = document.createElement("div");
  statsText.className = "stats-text";
  statsText.textContent = `${completed} von ${total} Todos erledigt (${percentage}%)`;
  
  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";
  const progressFill = document.createElement("div");
  progressFill.className = "progress-fill";
  progressFill.style.width = `${percentage}%`;
  
  progressBar.appendChild(progressFill);
  stats.appendChild(statsText);
  stats.appendChild(progressBar);
}

function render() {
  list.innerHTML = "";
  let filtered = todos;

  if (currentFilter === "today") {
    const today = new Date().toISOString().split("T")[0];
    filtered = todos.filter(todo => todo.date === today && !todo.passive);
  } else if (currentFilter === "completed") {
    filtered = todos.filter(todo => todo.completed && !todo.passive);
  } else if (currentFilter === "passive") {
    filtered = todos.filter(todo => todo.passive);
  } else {
    filtered = todos.filter(todo => !todo.passive);
  }

  filtered.forEach((todo, localIndex) => {
    const globalIndex = todos.indexOf(todo);
    const li = document.createElement("li");
    li.dataset.index = globalIndex;
    if (todo.completed) li.classList.add("completed");
    if (todo.passive) li.classList.add("passive");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.onclick = function(e) {
      e.stopPropagation();
      todos[globalIndex].completed = !todos[globalIndex].completed;
      save();
      render();
    };

    let textElement;
    if (globalIndex === editingIndex) {
      const editContainer = document.createElement("div");
      editContainer.style.display = "flex";
      editContainer.style.gap = "0.75rem";
      editContainer.style.alignItems = "center";
      
      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.value = todo.text;
      textInput.className = "edit-input";
      textInput.style.flex = "1";
      
      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.value = todo.date;
      dateInput.className = "edit-input-date";
      
      const saveEdit = () => {
        const newText = validateInput(textInput.value);
        const newDate = validateDate(dateInput.value);
        if (newText.trim() && newDate) {
          todos[editingIndex].text = newText;
          todos[editingIndex].date = newDate;
          editingIndex = -1;
          save();
          render();
        } else {
          alert("Ungültiger Text oder Datum!");
        }
      };
      
      textInput.onblur = saveEdit;
      textInput.onkeypress = (e) => { if (e.key === "Enter") saveEdit(); };
      dateInput.onblur = saveEdit;
      dateInput.onkeypress = (e) => { if (e.key === "Enter") saveEdit(); };
      
      textInput.focus();
      textInput.select();
      
      editContainer.appendChild(textInput);
      editContainer.appendChild(dateInput);
      textElement = editContainer;
    } else {
      const span = document.createElement("span");
      span.textContent = sanitizeText(`${todo.text} (${todo.date})${todo.passive ? ' [PASSIV]' : ''}`);
      textElement = span;
    }

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "edit";
    editBtn.textContent = "✏️";
    editBtn.onclick = function(e) {
      e.stopPropagation();
      editingIndex = globalIndex;
      render();
    };

    const passiveBtn = document.createElement("button");
    passiveBtn.className = "passive-btn";
    passiveBtn.textContent = todo.passive ? "🔄" : "⏸️";
    passiveBtn.onclick = function(e) {
      e.stopPropagation();
      togglePassive(globalIndex);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete";
    deleteBtn.textContent = "🗑️";
    deleteBtn.onclick = function(e) {
      e.stopPropagation();
      deleteTodo(globalIndex);
    };

    actions.appendChild(editBtn);
    actions.appendChild(passiveBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(textElement);
    li.appendChild(actions);
    list.appendChild(li);
  });

  updateStats();
}

// Deprecated prompt-based editTodo, replaced with inline editing

function togglePassive(index) {
  todos[index].passive = !todos[index].passive;
  save();
  render();
}

function deleteTodo(index) {
  if (confirm("Todo löschen?")) {
    todos.splice(index, 1);
    save();
    render();
  }
}

if (form) form.addEventListener("submit", e => {
  e.preventDefault();
  const text = validateInput(todoText.value);
  const date = validateDate(todoDate.value);
  if (text && date) {
    todos.unshift({text, date, completed: false, passive: false});
    form.reset();
    save();
    render();
  } else {
    alert("Text und gültiges Datum eingeben!");
  }
});

function initFilters() {
  [filterAll, filterToday, filterCompleted, filterPassive].forEach((btn, i) => {
    if (btn) btn.addEventListener('click', () => {
      currentFilter = ['all', 'today', 'completed', 'passive'][i];
      [filterAll, filterToday, filterCompleted, filterPassive].forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });
}

initFilters();

loadLists();
loadUserTodos();
updateListUI();
render();

// List UI event listeners
const listSelect = document.getElementById('listSelect');
if (listSelect) {
  listSelect.onchange = (e) => switchList(e.target.value);
}

const createListBtn = document.getElementById('createListBtn');
if (createListBtn) {
  createListBtn.onclick = () => {
    const nameInput = document.getElementById('newListName');
    if (createList(nameInput.value)) {
      nameInput.value = '';
    } else {
      alert('Listenname ungültig oder bereits vorhanden!');
    }
  };
}

const deleteListBtn = document.getElementById('deleteListBtn');
if (deleteListBtn) {
  deleteListBtn.onclick = () => {
    if (deleteList(currentList)) {
      alert('Liste gelöscht');
    } else {
      alert('Kann Standard-Liste nicht löschen oder keine andere Liste vorhanden!');
    }
  };
}

function updateListSelect() {
  const select = document.getElementById('listSelect');
  if (select) {
    select.innerHTML = lists.map(name => `<option value="${name}" ${name === currentList ? 'selected' : ''}>${name}</option>`).join('');
  }
}

// Call on load and after changes
updateListSelect();
