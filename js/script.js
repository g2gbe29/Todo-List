const app = {
  currentList: 'Standard',
  lists: [],
  todos: [],
  currentFilter: 'all',
  editingIndex: null,
  isGlobalView: false,
  globalViewType: null,
  globalTodos: [],
  globalTodoIndices: [],

  listIcons: {
    'Standard': '📋',
    'ToDo': '✓',
    'Einkaufen': '🛒',
    'Arbeit': '💼',
    'Privat': '🏠',
    'Familie': '👨‍👩‍',
    'Schule': '📚',
    'Sport': '⚽'
  },

  init() {
    this.loadLists();
    this.loadUserTodos();
    this.setupEventListeners();
    this.showDashboard();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todoDate').value = today;
  },

  // XSS-Schutz: Entfernt verbotene Zeichen (<, >, &, |)
  sanitizeInput(input) {
    if (!input) return '';
    return input.replace(/[<>&|]/g, '');
  },

  // Prüft ob Input verbotene Zeichen enthält
  containsForbiddenChars(input) {
    if (!input) return false;
    return /[<>&|]/.test(input);
  },

  loadLists() {
    const stored = localStorage.getItem('todo_lists_index');
    this.lists = stored ? JSON.parse(stored) : ['Standard'];
    if (!this.lists.includes('Standard')) this.lists.push('Standard');
  },

  saveLists() {
    localStorage.setItem('todo_lists_index', JSON.stringify(this.lists));
  },

  loadUserTodos() {
    const stored = localStorage.getItem(`todo_lists_${this.currentList}`);
    this.todos = stored ? JSON.parse(stored) : [];
  },

  saveTodos() {
    localStorage.setItem(`todo_lists_${this.currentList}`, JSON.stringify(this.todos));
  },

  createList(name) {
    const cleanName = this.sanitizeInput(name.trim()).substring(0, 50);
    if (cleanName && !this.lists.includes(cleanName)) {
      this.lists.push(cleanName);
      this.saveLists();
      return true;
    }
    return false;
  },

  deleteList(name) {
    const index = this.lists.indexOf(name);
    if (index > -1 && this.lists.length > 1 && name !== 'Standard') {
      this.lists.splice(index, 1);
      if (this.currentList === name) this.currentList = this.lists[0];
      this.saveLists();
      localStorage.removeItem(`todo_lists_${name}`);
      return true;
    }
    return false;
  },

  showDashboard() {
    document.getElementById('dashboardView').style.display = 'block';
    document.getElementById('listView').style.display = 'none';
    this.isGlobalView = false;
    this.globalViewType = null;
    this.currentFilter = 'all';
    this.showAllFilters();
    this.updateDashboard();
  },

  showListView() {
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('listView').style.display = 'block';
    document.getElementById('listTitle').textContent = this.currentList;
    if (!this.isGlobalView) {
      this.showAllFilters();
      this.renderTodos();
    }
  },

  showAllFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.style.display = 'block';
    });
  },

  showSingleFilter(filterType) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      if (btn.dataset.filter === filterType) {
        btn.style.display = 'block';
        btn.classList.add('active');
      } else {
        btn.style.display = 'none';
      }
    });
  },

  getAllTodosFromAllLists() {
    const allTodos = [];
    const indices = [];
    
    this.lists.forEach(listName => {
      const listTodos = JSON.parse(localStorage.getItem(`todo_lists_${listName}`) || '[]');
      listTodos.forEach((todo, index) => {
        allTodos.push({ ...todo, listName: listName, originalIndex: index });
        indices.push({ listName: listName, index: index });
      });
    });
    
    return { todos: allTodos, indices: indices };
  },

  showAllTodos() {
    this.isGlobalView = true;
    this.globalViewType = 'all';
    this.currentFilter = 'all';
    const { todos, indices } = this.getAllTodosFromAllLists();
    this.globalTodos = todos.filter(t => !t.completed && !t.passive);
    this.globalTodoIndices = indices.filter((_, i) => !todos[i].completed && !todos[i].passive);
    document.getElementById('listTitle').textContent = 'Alle Aufgaben';
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('listView').style.display = 'block';
    this.showSingleFilter('all');
    this.renderGlobalTodos();
  },

  showTodayTodos() {
    this.isGlobalView = true;
    this.globalViewType = 'today';
    this.currentFilter = 'today';
    const today = new Date().toISOString().split('T')[0];
    const { todos, indices } = this.getAllTodosFromAllLists();
    this.globalTodos = todos.filter(t => t.date === today && !t.completed && !t.passive);
    this.globalTodoIndices = indices.filter((_, i) => todos[i].date === today && !todos[i].completed && !todos[i].passive);
    document.getElementById('listTitle').textContent = 'Heute fällig';
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('listView').style.display = 'block';
    this.showSingleFilter('today');
    this.renderGlobalTodos();
  },

  showCompletedTodos() {
    this.isGlobalView = true;
    this.globalViewType = 'completed';
    this.currentFilter = 'completed';
    const { todos, indices } = this.getAllTodosFromAllLists();
    this.globalTodos = todos.filter(t => t.completed);
    this.globalTodoIndices = indices.filter((_, i) => todos[i].completed);
    document.getElementById('listTitle').textContent = 'Erledigt';
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('listView').style.display = 'block';
    this.showSingleFilter('completed');
    this.renderGlobalTodos();
  },

  updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    let totalAlle = 0, totalHeute = 0, totalErledigt = 0;

    this.lists.forEach(listName => {
      const listTodos = JSON.parse(localStorage.getItem(`todo_lists_${listName}`) || '[]');
      totalAlle += listTodos.filter(t => !t.completed && !t.passive).length;
      totalHeute += listTodos.filter(t => t.date === today && !t.completed && !t.passive).length;
      totalErledigt += listTodos.filter(t => t.completed).length;
    });

    document.getElementById('countAlle').textContent = totalAlle;
    document.getElementById('countHeute').textContent = totalHeute;
    document.getElementById('countErledigt').textContent = totalErledigt;

    this.renderListsGrid();
  },

  renderListsGrid() {
    const grid = document.getElementById('listsGrid');
    grid.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];

    this.lists.forEach(listName => {
      const listTodos = JSON.parse(localStorage.getItem(`todo_lists_${listName}`) || '[]');
      const count = listTodos.filter(t => !t.completed && !t.passive).length;
      const todayCount = listTodos.filter(t => t.date === today && !t.completed && !t.passive).length;
      const icon = this.listIcons[listName] || '📝';

      const card = document.createElement('div');
      card.className = 'list-card';
      card.onclick = () => {
        this.currentList = listName;
        this.isGlobalView = false;
        this.loadUserTodos();
        this.showListView();
      };

      card.innerHTML = `
        <div class="list-card-left">
          <div class="list-icon">${icon}</div>
          <span class="list-name">${this.sanitizeInput(listName)}</span>
        </div>
        <div class="list-card-right">
          ${todayCount > 0 ? `<span class="today-count">${todayCount}</span>` : ''}
          <span class="list-count">${count}</span>
        </div>
      `;

      grid.appendChild(card);
    });
  },

  renderTodos() {
    const list = document.getElementById('todoList');
    list.innerHTML = '';

    let filtered = [...this.todos];
    const today = new Date().toISOString().split('T')[0];

    if (this.currentFilter === 'today') {
      filtered = filtered.filter(t => t.date === today && !t.completed && !t.passive);
    } else if (this.currentFilter === 'completed') {
      filtered = filtered.filter(t => t.completed);
    } else {
      filtered = filtered.filter(t => !t.completed && !t.passive);
    }

    if (filtered.length === 0) {
      list.innerHTML = '<li class="empty-state">Keine Aufgaben vorhanden</li>';
      return;
    }

    filtered.forEach((todo, idx) => {
      const globalIndex = this.todos.indexOf(todo);
      const li = document.createElement('li');
      li.className = 'todo-item';
      if (todo.completed) li.classList.add('completed');
      
      if (!todo.completed && todo.date === today) {
        li.classList.add('due-today');
      }
      
      // Überfällige Aufgaben markieren
      if (!todo.completed && todo.date < today) {
        li.classList.add('overdue');
      }

      const checkbox = document.createElement('div');
      checkbox.className = `checkbox ${todo.completed ? 'checked' : ''}`;
      checkbox.onclick = () => this.toggleTodo(globalIndex);

      const content = document.createElement('div');
      content.className = 'todo-content';
      content.onclick = () => this.openEditModal(globalIndex);
      
      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = todo.text;
      
      const date = document.createElement('span');
      date.className = 'todo-date';
      date.textContent = this.formatDate(todo.date);

      content.appendChild(text);
      content.appendChild(date);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-todo-btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.deleteTodo(globalIndex);
      };

      li.appendChild(checkbox);
      li.appendChild(content);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });

    this.updateStats();
  },

  renderGlobalTodos() {
    const list = document.getElementById('todoList');
    list.innerHTML = '';

    if (this.globalTodos.length === 0) {
      list.innerHTML = '<li class="empty-state">Keine Aufgaben vorhanden</li>';
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    this.globalTodos.forEach((todo, idx) => {
      const li = document.createElement('li');
      li.className = 'todo-item';
      if (todo.completed) li.classList.add('completed');
      
      if (!todo.completed && todo.date === today) {
        li.classList.add('due-today');
      }
      
      // Überfällige Aufgaben markieren
      if (!todo.completed && todo.date < today) {
        li.classList.add('overdue');
      }

      const checkbox = document.createElement('div');
      checkbox.className = `checkbox ${todo.completed ? 'checked' : ''}`;
      checkbox.onclick = () => this.toggleGlobalTodo(idx);

      const content = document.createElement('div');
      content.className = 'todo-content';
      content.onclick = () => this.openEditGlobalModal(idx);
      
      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = todo.text;
      
      const date = document.createElement('span');
      date.className = 'todo-date';
      date.textContent = `${this.formatDate(todo.date)} • ${todo.listName}`;

      content.appendChild(text);
      content.appendChild(date);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-todo-btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.deleteGlobalTodo(idx);
      };

      li.appendChild(checkbox);
      li.appendChild(content);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });

    this.updateGlobalStats();
  },

  formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateString === today.toISOString().split('T')[0]) {
      return 'Heute';
    } else if (dateString === tomorrow.toISOString().split('T')[0]) {
      return 'Morgen';
    } else {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    }
  },

  updateStats() {
    const active = this.todos.filter(t => !t.completed && !t.passive);
    const completed = this.todos.filter(t => t.completed).length;
    const total = active.length + completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('statsText').textContent = `${completed} von ${total} erledigt`;
    document.getElementById('progressPercent').textContent = `${percent}%`;
    document.getElementById('progressFill').style.width = `${percent}%`;
  },

  updateGlobalStats() {
    const completed = this.globalTodos.filter(t => t.completed).length;
    const total = this.globalTodos.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('statsText').textContent = `${completed} von ${total} erledigt`;
    document.getElementById('progressPercent').textContent = `${percent}%`;
    document.getElementById('progressFill').style.width = `${percent}%`;
  },

  addTodo(text, date) {
    if (!text.trim() || !date) return;
    
    if (this.containsForbiddenChars(text)) {
      alert('Fehler: Die Zeichen <, >, & und | sind nicht erlaubt!');
      return;
    }
    
    this.todos.unshift({
      text: this.sanitizeInput(text.trim()),
      date: date,
      completed: false,
      passive: false
    });
    this.saveTodos();
    this.renderTodos();
    this.updateDashboard();
  },

  toggleTodo(index) {
    this.todos[index].completed = !this.todos[index].completed;
    this.saveTodos();
    this.renderTodos();
    this.updateDashboard();
  },

  toggleGlobalTodo(globalIndex) {
    const todoInfo = this.globalTodoIndices[globalIndex];
    const listTodos = JSON.parse(localStorage.getItem(`todo_lists_${todoInfo.listName}`) || '[]');
    listTodos[todoInfo.index].completed = !listTodos[todoInfo.index].completed;
    localStorage.setItem(`todo_lists_${todoInfo.listName}`, JSON.stringify(listTodos));
    
    if (this.globalViewType === 'all') {
      this.showAllTodos();
    } else if (this.globalViewType === 'today') {
      this.showTodayTodos();
    } else if (this.globalViewType === 'completed') {
      this.showCompletedTodos();
    }
    this.updateDashboard();
  },

  deleteTodo(index) {
    if (confirm('Aufgabe löschen?')) {
      this.todos.splice(index, 1);
      this.saveTodos();
      this.renderTodos();
      this.updateDashboard();
    }
  },

  deleteGlobalTodo(globalIndex) {
    if (confirm('Aufgabe löschen?')) {
      const todoInfo = this.globalTodoIndices[globalIndex];
      const listTodos = JSON.parse(localStorage.getItem(`todo_lists_${todoInfo.listName}`) || '[]');
      listTodos.splice(todoInfo.index, 1);
      localStorage.setItem(`todo_lists_${todoInfo.listName}`, JSON.stringify(listTodos));
      
      if (this.globalViewType === 'all') {
        this.showAllTodos();
      } else if (this.globalViewType === 'today') {
        this.showTodayTodos();
      } else if (this.globalViewType === 'completed') {
        this.showCompletedTodos();
      }
      this.updateDashboard();
    }
  },

  openEditModal(index) {
    this.editingIndex = index;
    const todo = this.todos[index];
    
    document.getElementById('editText').value = todo.text;
    document.getElementById('editDate').value = todo.date;
    document.getElementById('editModal').style.display = 'block';
    
    setTimeout(() => document.getElementById('editText').focus(), 100);
  },

  openEditGlobalModal(globalIndex) {
    this.editingIndex = globalIndex;
    const todo = this.globalTodos[globalIndex];
    
    document.getElementById('editText').value = todo.text;
    document.getElementById('editDate').value = todo.date;
    document.getElementById('editModal').style.display = 'block';
    
    setTimeout(() => document.getElementById('editText').focus(), 100);
  },

  closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    this.editingIndex = null;
  },

  saveEdit() {
    if (this.editingIndex === null) return;
    
    const text = document.getElementById('editText').value.trim();
    const date = document.getElementById('editDate').value;
    
    if (!text || !date) {
      alert('Bitte Text und Datum eingeben!');
      return;
    }
    
    if (this.containsForbiddenChars(text)) {
      alert('Fehler: Die Zeichen <, >, & und | sind nicht erlaubt!');
      return;
    }
    
    if (this.isGlobalView) {
      const todoInfo = this.globalTodoIndices[this.editingIndex];
      const listTodos = JSON.parse(localStorage.getItem(`todo_lists_${todoInfo.listName}`) || '[]');
      listTodos[todoInfo.index].text = this.sanitizeInput(text);
      listTodos[todoInfo.index].date = date;
      localStorage.setItem(`todo_lists_${todoInfo.listName}`, JSON.stringify(listTodos));
      
      if (this.globalViewType === 'all') {
        this.showAllTodos();
      } else if (this.globalViewType === 'today') {
        this.showTodayTodos();
      } else if (this.globalViewType === 'completed') {
        this.showCompletedTodos();
      }
    } else {
      this.todos[this.editingIndex].text = this.sanitizeInput(text);
      this.todos[this.editingIndex].date = date;
      this.saveTodos();
      this.renderTodos();
    }
    
    this.updateDashboard();
    this.closeEditModal();
  },

  updateFilterButtons(activeFilter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === activeFilter);
    });
  },

  setupEventListeners() {
    document.getElementById('backBtn').onclick = () => this.showDashboard();
    
    document.getElementById('addListBtn').onclick = () => {
      const name = prompt('Name der neuen Liste:');
      if (name) {
        if (this.containsForbiddenChars(name)) {
          alert('Fehler: Die Zeichen <, >, & und | sind nicht erlaubt!');
          return;
        }
        if (this.createList(name)) {
          this.updateDashboard();
        }
      }
    };

    document.getElementById('deleteListBtn').onclick = () => {
      if (this.currentList !== 'Standard' && !this.isGlobalView && confirm('Liste löschen?')) {
        if (this.deleteList(this.currentList)) {
          this.showDashboard();
        }
      }
    };

    document.getElementById('addTodoBtn').onclick = () => {
      if (this.isGlobalView) {
        alert('Bitte zuerst eine Liste auswählen!');
        return;
      }
      const text = document.getElementById('todoText').value;
      const date = document.getElementById('todoDate').value;
      if (text && date) {
        this.addTodo(text, date);
        document.getElementById('todoText').value = '';
      } else {
        alert('Bitte Text und Datum eingeben!');
      }
    };

    document.getElementById('todoText').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('addTodoBtn').click();
      }
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = () => {
        if (this.isGlobalView) {
          return;
        } else {
          document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentFilter = btn.dataset.filter;
          this.renderTodos();
        }
      };
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll('.list-card').forEach(card => {
        const name = card.querySelector('.list-name').textContent.toLowerCase();
        card.style.display = name.includes(term) ? 'flex' : 'none';
      });
    });

    document.getElementById('editText').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.saveEdit();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());