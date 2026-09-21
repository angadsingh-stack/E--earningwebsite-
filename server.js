const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const files = {
  users: path.join(__dirname, 'data', 'users.json'),
  courses: path.join(__dirname, 'data', 'courses.json'),
  progress: path.join(__dirname, 'data', 'progress.json')
};

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`Could not read ${file}:`, error.message);
    return [];
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Please log in first.' });
  }

  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired login.' });
  }
}

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  const users = readJson(files.users);
  if (users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: 'Email is already registered.' });
  }

  const user = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: await bcrypt.hash(password, 10)
  };

  users.push(user);
  writeJson(files.users, users);

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const users = readJson(files.users);
  const user = users.find(item => item.email === String(email).trim().toLowerCase());

  if (!user || !(await bcrypt.compare(password || '', user.password))) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/courses', (req, res) => {
  res.json(readJson(files.courses));
});

app.get('/api/progress', authenticate, (req, res) => {
  const progress = readJson(files.progress).filter(item => item.userId === req.user.id);
  res.json(progress);
});

app.post('/api/progress', authenticate, (req, res) => {
  const { courseId, lessonId, completed } = req.body;
  if (!courseId || !lessonId) {
    return res.status(400).json({ message: 'courseId and lessonId are required.' });
  }

  const progress = readJson(files.progress);
  const existing = progress.find(item =>
    item.userId === req.user.id && item.courseId === Number(courseId) && item.lessonId === Number(lessonId)
  );

  if (existing) {
    existing.completed = Boolean(completed);
    existing.updatedAt = new Date().toISOString();
  } else {
    progress.push({
      userId: req.user.id,
      courseId: Number(courseId),
      lessonId: Number(lessonId),
      completed: Boolean(completed),
      updatedAt: new Date().toISOString()
    });
  }

  writeJson(files.progress, progress);
  res.json({ message: 'Progress saved.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`E-learning website running at http://localhost:${PORT}`);
});
