# LearnHub E-learning Website

A beginner-friendly full-stack e-learning website with:

- Register and login
- Course listing
- Lesson viewer
- Lesson completion tracking
- Responsive frontend
- Node.js + Express backend
- JSON file storage

## Run the project

1. Install Node.js 18 or newer.
2. Open a terminal in this project folder.
3. Run:

```bash
npm install
npm start
```

4. Open `http://localhost:3000` in your browser.

## Project structure

- `server.js` - Express backend and API
- `public/` - HTML, CSS and JavaScript frontend
- `data/` - users, courses and progress data

## Main API routes

- `POST /api/register`
- `POST /api/login`
- `GET /api/courses`
- `GET /api/progress`
- `POST /api/progress`

## Production note

For a real production website, replace JSON storage with MySQL or MongoDB and set a strong `JWT_SECRET` environment variable.
