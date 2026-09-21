const state = {
  courses: [],
  progress: [],
  selectedCourse: null,
  selectedLesson: null,
  authMode: 'login',
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null')
};

const elements = {
  courseGrid: document.getElementById('courseGrid'),
  lessonSection: document.getElementById('lessonSection'),
  coursesSection: document.getElementById('courses'),
  courseTitle: document.getElementById('courseTitle'),
  lessonList: document.getElementById('lessonList'),
  lessonTitle: document.getElementById('lessonTitle'),
  lessonContent: document.getElementById('lessonContent'),
  lessonNumber: document.getElementById('lessonNumber'),
  completeButton: document.getElementById('completeButton'),
  authModal: document.getElementById('authModal'),
  authButton: document.getElementById('authButton'),
  logoutButton: document.getElementById('logoutButton'),
  authForm: document.getElementById('authForm'),
  authMessage: document.getElementById('authMessage'),
  nameGroup: document.getElementById('nameGroup'),
  welcomeText: document.getElementById('welcomeText')
};

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

async function loadCourses() {
  state.courses = await api('/api/courses''https://e-earningwebsite.onrender.com/' );
  if (state.token) {
    try { state.progress = await api('/api/progress'); }
    catch { logout(); }
  }
  renderCourses();
  updateAuthUI();
}

function completedLessons(courseId) {
  return state.progress.filter(item => item.courseId === courseId && item.completed).length;
}

function renderCourses() {
  elements.courseGrid.innerHTML = state.courses.map(course => {
    const completed = completedLessons(course.id);
    const percent = Math.round((completed / course.lessons.length) * 100);
    return `
      <article class="course-card">
        <span class="badge">${course.level}</span>
        <h3>${course.title}</h3>
        <p>${course.description}</p>
        <div class="course-meta"><span>${course.lessons.length} lessons</span><span>${percent}% complete</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
        <button class="primary-button" onclick="openCourse(${course.id})">Start Course</button>
      </article>`;
  }).join('');
}

window.openCourse = function(courseId) {
  state.selectedCourse = state.courses.find(course => course.id === courseId);
  state.selectedLesson = state.selectedCourse.lessons[0];
  elements.coursesSection.classList.add('hidden');
  elements.lessonSection.classList.remove('hidden');
  renderLessonArea();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function isLessonComplete(courseId, lessonId) {
  return state.progress.some(item => item.courseId === courseId && item.lessonId === lessonId && item.completed);
}

function renderLessonArea() {
  const course = state.selectedCourse;
  const lesson = state.selectedLesson;
  elements.courseTitle.textContent = course.title;
  elements.lessonList.innerHTML = course.lessons.map((item, index) => `
    <button class="lesson-item ${item.id === lesson.id ? 'active' : ''} ${isLessonComplete(course.id, item.id) ? 'completed' : ''}"
      onclick="selectLesson(${item.id})">${index + 1}. ${item.title}</button>
  `).join('');
  const index = course.lessons.findIndex(item => item.id === lesson.id);
  elements.lessonNumber.textContent = `Lesson ${index + 1} of ${course.lessons.length}`;
  elements.lessonTitle.textContent = lesson.title;
  elements.lessonContent.textContent = lesson.content;
  elements.completeButton.textContent = isLessonComplete(course.id, lesson.id) ? 'Completed ✓' : 'Mark as Complete';
};

window.selectLesson = function(lessonId) {
  state.selectedLesson = state.selectedCourse.lessons.find(lesson => lesson.id === lessonId);
  renderLessonArea();
};

document.getElementById('backButton').addEventListener('click', () => {
  elements.lessonSection.classList.add('hidden');
  elements.coursesSection.classList.remove('hidden');
  renderCourses();
});

elements.completeButton.addEventListener('click', async () => {
  if (!state.token) {
    openAuth();
    elements.authMessage.textContent = 'Login to save your progress.';
    return;
  }

  const completed = !isLessonComplete(state.selectedCourse.id, state.selectedLesson.id);
  await api('/api/progress', {
    method: 'POST',
    body: JSON.stringify({ courseId: state.selectedCourse.id, lessonId: state.selectedLesson.id, completed })
  });
  state.progress = await api('/api/progress');
  renderLessonArea();
});

function openAuth() {
  elements.authModal.classList.remove('hidden');
}
function closeAuth() {
  elements.authModal.classList.add('hidden');
  elements.authMessage.textContent = '';
}

elements.authButton.addEventListener('click', openAuth);
document.getElementById('closeModal').addEventListener('click', closeAuth);
elements.authModal.addEventListener('click', event => { if (event.target === elements.authModal) closeAuth(); });

document.getElementById('loginTab').addEventListener('click', () => setAuthMode('login'));
document.getElementById('registerTab').addEventListener('click', () => setAuthMode('register'));

function setAuthMode(mode) {
  state.authMode = mode;
  document.getElementById('loginTab').classList.toggle('active', mode === 'login');
  document.getElementById('registerTab').classList.toggle('active', mode === 'register');
  elements.nameGroup.classList.toggle('hidden', mode === 'login');
  elements.authMessage.textContent = '';
}

elements.authForm.addEventListener('submit', async event => {
  event.preventDefault();
  const payload = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  };

  try {
    const data = await api(`/api/${state.authMode}`, { method: 'POST', body: JSON.stringify(payload) });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    state.progress = await api('/api/progress');
    closeAuth();
    updateAuthUI();
    renderCourses();
    if (state.selectedCourse) renderLessonArea();
  } catch (error) {
    elements.authMessage.textContent = error.message;
  }
});

function updateAuthUI() {
  elements.authButton.classList.toggle('hidden', Boolean(state.user));
  elements.logoutButton.classList.toggle('hidden', !state.user);
  elements.welcomeText.textContent = state.user ? `Welcome, ${state.user.name}. Keep learning!` : 'Create an account to save your lesson progress.';
}

function logout() {
  state.token = null;
  state.user = null;
  state.progress = [];
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateAuthUI();
  renderCourses();
}

elements.logoutButton.addEventListener('click', logout);

loadCourses().catch(error => {
  elements.courseGrid.innerHTML = `<p>Could not load courses: ${error.message}</p>`;
});
