# Full-Stack JS engineer test assessment - the **Quiz Builder**

## **Overview**

This task is to implement a **Quiz Builder** web application where users can create custom quizzes with various types of questions. The application consists of a **Backend** (Node.js) and **Frontend** (React). Users should be able to build quizzes, view all available quizzes, and view any single quiz in detail.

---

## **Objective**

Build a full-stack quiz creation platform where:

- A user can create a quiz with multiple question types
- All quizzes are listed in a dashboard
- Each quiz can be viewed in a separate page

---

## **Backend**

**Tech Stack:**

- Node.js (Nest.js or Express.js)
- TypeScript
- PostgreSQL or SQLite (via Prisma or Sequelize)

**Endpoints:**

1. `POST /quizzes` – Create a new quiz
2. `GET /quizzes` – Return a list of all quizzes with titles and number of questions
3. `GET /quizzes/:id` – Return full details of a quiz including all questions
4. `DELETE /quizzes/:id` – Delete a quiz

---

## **Frontend**

**Tech Stack:**

- React.js
- TypeScript
- Next.js (preferred)
- Optional: `React Hook Form`, `Zod`, or other form helpers

### **Pages**

### **1. Quiz Creation Page (`/create`)**

- Form to add:
    - Quiz title
    - One or more questions
- **Supported Question Types:**
    - **Boolean**: True/False radio buttons
    - **Input**: Short text answer
    - **Checkbox**: Multiple choice with several correct answers
- Ability to dynamically add/remove questions
- Submit form to POST `/quizzes`

### **2. Quiz List Page (`/quizzes`)**

- Fetch from `GET /quizzes`
- Display quiz title and number of questions
- Each item should link to the quiz details page
- Each item should have a delete icon when the user clicks on it to delete the quiz from the database (`DELETE /quizzes/:id`) and from the page

### **3. Quiz Detail Page (`/quizzes/:id`)**

- Fetch quiz from `GET /quizzes/:id`
- Display title and questions
- Render questions in read-only mode (not for solving, just structure)

---

## **Additional Requirements**

1. **Styling**
    - Use any styling solution you prefer (e.g., Tailwind, CSS Modules)
    - Mobile responsiveness is a plus
2. **Code Quality**
    1. Set up ESLint and Prettier to ensure consistent code formatting and quality.
    2. Ensure that all files are properly linted and formatted before submission.
3. **Environment Config**
    - Use `.env` for backend DB config and base URLs
    - Do not commit `.env` files
4. **README**
    - Describe how to:
        - Start frontend and backend
        - Set up database
        - Create sample quiz

---

## **Project Structure**

```
quiz-builder/
├── backend/         # Express/NestJS app
│   ├── src/
│   └── prisma/ or models/
├── frontend/        # React/Next.js app
│   ├── pages/
│   ├── components/
│   └── services/
└── README.md

```

---

## **Deliverables**

- GitHub repo with `/frontend` and `/backend` directories
- Working local project with functioning API and UI
- Sample quiz or seed script (optional)
- Clean, readable, and modular code