const App = (function() {
  const Ui = {
    editMode: false,

    get: function(selector) {
      return $(selector);
    },

    cacheTemplates: function() {
      let self = this;
      $('script[type="text/x-handlebars"]').each(function() {
        let id = $(this).attr('id');
        let html = $(this).html();
        self.templates[id] = Handlebars.compile(html);
      });
    },

    registerPartials: function() {
      $('script[data-type="partial"]').each(function() {
        let id = $(this).attr('id');
        let html = $(this).html();
        Handlebars.registerPartial(id, html);
      });
    },

    showModal: function(e) {
      e.preventDefault();

      this.$modal.show();
    },

    hideModal: function(e) {
      this.$modal.hide();
      this.$form.get(0).reset();
      this.editMode = false;
    },

    toggleCheckbox: function(span) {
      let $checkbox = $(span).find('[type=checkbox]');
      $checkbox[0].checked = !$checkbox[0].checked;
      $checkbox.trigger('input');
    },

    toggleActive: function($ele, className) {
      $(`.${className}`).removeClass(className);
      $ele.addClass(className);
    },

    renderList: function(collection, heading, count) {
      this.$heading.text(heading);
      this.$currentCount.text(count);
      this.$list.html(this.templates.todos({todos: collection}));
    },

    init: function() {
      this.templates = {};
      this.$currentCount = this.get('.current-count');
      this.$allCount = this.get('.all-count');
      this.$compCount = this.get('.completed-count');
      this.$add = this.get('.add-todo');
      this.$modal = this.get('.modal');
      this.$form = this.get('form');
      this.$list = this.get('#todo-list');
      this.$nav = this.get('nav');
      this.$heading = this.get('#heading');

      this.cacheTemplates();
      this.registerPartials();

      return this;
    }
  };

  const Helper = {
    getFormData: function($form) {
      let o = {};
      $form.serializeArray().forEach(field => {
        o[field.name] = field.value;
      });

      return o;
    },

    getItemId: function($ele) {
      return +$ele.closest('li').attr('data-id');
    },

    getFullYear: function(year) {
      if (year === '') return '';
      return '20' + year;
    },

    populateForm: function($form, todo) {
      $form.find('#title').val(todo.title);
      $form.find('#day').val(todo.day);
      $form.find('#month').val(todo.month);
      $form.find('#year').val(this.getFullYear(todo.year));
      $form.find('#description').val(todo.description);
    },

    init: function() {
      return this;
    }
  };

  const Nav = {
    allTodos: [],
    completedTodos: [],

    filterCompleted: function() {
      this.completedTodos = this.allTodos.filter(todo => todo.completed);
    },

    buildList:  function(todos) {
      let list = {};

      todos.forEach(todo => {
        let date = `${todo.month}/${todo.year}`;

        if (todo.month === '' || todo.year === '') {
          date = 'No Due Date';
        }

        list[date] ||= [];
        list[date].push(todo);
      });

      return list;
    },

    buildForTempl: function(list) {
      let data = [];

      for (let date in list) {
        let o = {};
        o.dueDate = date;
        o.total = list[date].length;
        o.month = list[date][0].month;
        o.year = list[date][0].year;
        data.push(o);
      }

      return data;
    },

    renderNav: function(data, $list) {
      $list.html(this.ui.templates.months({months: data}));
    },

    loadAll: function() {
      let list = this.buildList(this.allTodos);
      let data = this.buildForTempl(list);
      let $navList = this.ui.$nav.find('.all-months');
      let month  = $navList.find('li.active').attr('data-month');
      let year  = $navList.find('li.active').attr('data-year');

      this.renderNav(data, $navList);
      this.ui.$allCount.text(this.allTodos.length);
      
      let $activeLi = $navList.find(`li[data-month="${month}"][data-year="${year}"]`);
      $activeLi.addClass('active');
    },

    loadCompleted: function() {
      this.filterCompleted();
      let list = this.buildList(this.completedTodos);
      let data = this.buildForTempl(list);
      let $navList = this.ui.$nav.find('.completed-months');
      let month  = $navList.find('li.active').attr('data-month');
      let year  = $navList.find('li.active').attr('data-year');

      this.renderNav(data, $navList);
      this.ui.$compCount.text(this.completedTodos.length);

      let $activeLi = $navList.find(`li[data-month="${month}"][data-year="${year}"]`);
      $activeLi.addClass('active');
    },

    loadBoth: function() {
      this.loadAll();
      this.loadCompleted();
    },

    init: function(ui) {
      this.ui = ui
      return this;
    },
  };

  const Todos = {
    collection: [],

    getTodo: function(id) {
      return this.collection.filter(todo => todo.id === id)[0];
    },

    removeFromCollection: function(id) {
      let index;

      this.collection.forEach((todo, idx) => {
        if (todo.id === id) {
          index = idx;
        }
      });

      this.collection.splice(index, 1);
    },

    removeFromActive: function(id) {
      this.activeList = this.activeList.filter(todo => todo.id !== id);
    },

    updateCollection: function(collection, updated) {
      collection.forEach((todo, idx) => {
        if(todo.id === updated.id) {
          collection[idx] = updated;
        }
      });
    },

    sortList: function(collection) {
      collection.sort((todo1, todo2) => todo1.id - todo2.id);
      collection.sort((todo1, todo2) => {
        if (!todo1.completed && todo2.completed) {
          return -1;
        } else if (!todo2.completed && todo1.completed) {
          return 1;
        } else {
          return 0;
        }
      });
    },

    clearIncomplete: function(collection) {
      return collection.filter(todo => todo.completed);
    },

    modifyYear: function(todo) {
      todo.year = todo.year.slice(-2);
    },

    modifyYears: function(collection) {
      collection.forEach(todo => {
        this.modifyYear(todo);
      });
    },

    getTodoDate: function(month, year) {
      let date = `${month}/${year}`;

      if (month === '' || year === '') {
        date = 'No Due Date';
      }

      return date;
    },

    loadAll: function() {
      let req = new XMLHttpRequest();
      req.open('GET', '/api/todos');

      req.addEventListener('load', () => {
        let res = JSON.parse(req.response);
        this.modifyYears(res);
        this.collection = res;
        this.sortList(this.collection);
        this.activeList = this.collection;
        this.nav.allTodos = this.collection;
        this.nav.loadBoth();
        this.ui.renderList(this.activeList, 'All Todos', this.activeList.length);
      });

      req.send();
    },

    renderCompleted: function() {
      this.inCompleteMode = true;

      this.activeList = [];
      this.collection.forEach(todo => {
        if (todo.completed) {
          this.activeList.push(todo);
        }
      });

      this.ui.renderList(this.activeList, 'Completed', this.activeList.length);
    },

    renderAll: function() {
      this.inCompleteMode = false;
      this.activeList  = this.collection;
      this.sortList(this.activeList);

      this.ui.renderList(this.activeList, 'All Todos', this.activeList.length);
    },

    renderMonthlyList: function(month, year, inComplete) {
      this.inCompleteMode = !!inComplete;
      let date = this.getTodoDate(month, year);
      let lists;

      if (this.inCompleteMode) {
        lists = this.nav.buildList(this.nav.completedTodos);
      } else {
        lists = this.nav.buildList(this.collection);
      }

      this.activeList  = lists[date] || [];
      this.sortList(this.activeList);
      this.ui.renderList(this.activeList, date, this.activeList.length);
    },

    add: function(json) {
      let req = new XMLHttpRequest();
      req.open('POST', '/api/todos');
      req.setRequestHeader('Content-Type', 'application/json');

      req.addEventListener('load', () => {
        let res = JSON.parse(req.response);
        this.modifyYear(res);
        this.ui.hideModal();
        this.collection.push(res);
        this.sortList(this.collection);
        this.nav.loadAll();
        this.renderAll();
        this.ui.toggleActive(this.ui.$nav.children().first(), 'active');
      });

      req.send(json);
    },

    delete: function(id) {
      let req = new XMLHttpRequest();
      req.open('DELETE', '/api/todos/' + id);

      req.addEventListener('load', () => {
        if (req.status === 204) {
          this.ui.get('li[data-id=' + id + ']').remove();
          this.removeFromCollection(id);
          this.removeFromActive(id);
          this.nav.loadBoth();
          this.ui.$currentCount.text(this.activeList.length);
        }
      });

      req.send();
    },

    updateState: function(state, id) {
      let req = new XMLHttpRequest();
      req.open('PUT', '/api/todos/' + id);
      req.setRequestHeader('Content-Type', 'application/json');

      req.addEventListener('load', () => {
        let res = JSON.parse(req.response);
        this.modifyYear(res);
        this.updateCollection(this.collection, res);
        this.updateCollection(this.activeList, res);
        this.sortList(this.activeList);
        this.nav.loadBoth();
        if (this.inCompleteMode && !state) { this.activeList = this.clearIncomplete(this.activeList); } 
        this.ui.$list.html(this.ui.templates.todos({todos: this.activeList}));
        this.ui.$currentCount.text(this.activeList.length);
        this.ui.hideModal();
      });

      req.send(JSON.stringify({completed: state}));
    },

    updateTodo: function(data) {
      let id = +this.ui.$form.find('[data-mode="edit"]').val();
      let todo = this.getTodo(id);

      let req = new XMLHttpRequest();
      req.open('PUT', '/api/todos/' + id);
      req.setRequestHeader('Content-Type', 'application/json');

      req.addEventListener('load', () => {
        let res = JSON.parse(req.response);
        this.modifyYear(res);
        this.updateCollection(this.collection, res);
        this.updateCollection(this.activeList, res);
        this.sortList(this.activeList);
        this.nav.loadBoth();
        this.renderMonthlyList(todo.month, todo.year, todo.completed);
        this.ui.hideModal();
      });

      req.send(JSON.stringify(data));
    },

    init: function(ui, nav) {
      this.ui = ui;
      this.nav = nav;
      this.activeList = null;
      this.inCompleteMode = false;
      this.loadAll();
      return this;
    }
  };

  return {
    addHandler: function(e) {
      e.preventDefault();
      let data = this.helper.getFormData(this.ui.$form); 

      if (this.ui.editMode) {
        this.todos.updateTodo(data);
        return;
      }

      this.todos.add(JSON.stringify(data));
    },

    deleteHandler: function(e) {
      e.preventDefault();

      let id = this.helper.getItemId($(e.target));
      this.todos.delete(id);
    },

    spanClickHandler: function(e) {
      if (e.target.tagName === 'SPAN') {
        this.ui.toggleCheckbox(e.target);
      }
    },

    checkHandler: function(e) {
      let state = e.target.checked;
      let id = this.helper.getItemId($(e.target));
      

      this.todos.updateState(state, id);
    },

    markCompleteHandler: function(e) {
      if (!this.ui.editMode) {
        alert('Cannot mark complete as Todo has not been created yet!');
        return;
      }

      let id = +this.ui.$form.find('[data-mode="edit"]').val();
      this.todos.updateState(true, id);
    },

    editHandler: function(e) {
      e.preventDefault();

      let id = this.helper.getItemId($(e.target));
      let todo = this.todos.getTodo(id);
      this.ui.showModal(e);
      this.helper.populateForm(this.ui.$form, todo);
      this.ui.$form.find('[data-mode="edit"]').val(id);
      this.ui.editMode = true;
    },

    clickCompletedHandler: function(e) {
      e.preventDefault();

      this.ui.toggleActive($(e.target).parent(), 'active');
      this.todos.renderCompleted();
    },

    clickAllHandler: function(e) {
      e.preventDefault();

      this.ui.toggleActive($(e.target).parent(), 'active');
      this.todos.renderAll();
    },

    clickAllMonthly: function(e) {
      e.preventDefault();

      let $list = $(e.target).parent();
      let month = $list.attr('data-month');
      let year = $list.attr('data-year');

      this.ui.toggleActive($list, 'active');
      this.todos.renderMonthlyList(month, year);
    },

    clickCompletedMonthly: function(e) {
      e.preventDefault();

      let $list = $(e.target).parent();
      let month = $list.attr('data-month');
      let year = $list.attr('data-year');

      this.ui.toggleActive($list, 'active');
      this.todos.renderMonthlyList(month, year, true);
    },

    bindEvents: function() {
      this.ui.$add.on('click', this.ui.showModal.bind(this.ui));
      this.ui.$form.on('submit', this.addHandler.bind(this));
      this.ui.$form.on('click', '#btn-done', this.markCompleteHandler.bind(this));
      this.ui.$list.on('click', '.delete-todo', this.deleteHandler.bind(this));
      this.ui.$list.on('click', 'span', this.spanClickHandler.bind(this));
      this.ui.$list.on('input', 'input[type=checkbox]', this.checkHandler.bind(this));
      this.ui.$list.on('click', '.edit-todo', this.editHandler.bind(this));
      this.ui.$modal.on('click', '.modal-layer', this.ui.hideModal.bind(this.ui));
      this.ui.$nav.on('click', '.completed-todos', this.clickCompletedHandler.bind(this));
      this.ui.$nav.on('click', '.all-todos', this.clickAllHandler.bind(this));
      this.ui.$nav.on('click', '.all-months a', this.clickAllMonthly.bind(this));
      this.ui.$nav.on('click', '.completed-months a', this.clickCompletedMonthly.bind(this));
    },

    init: function() {
      this.ui = Ui.init();
      this.nav = Nav.init(this.ui);
      this.todos = Todos.init(this.ui, this.nav);
      this.helper = Helper.init();

      this.bindEvents();
    }
  };
})();

$(App.init.bind(App));
