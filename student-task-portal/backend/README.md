# Student Task Portal Backend

This is the backend server for the Student Task Portal application. It provides RESTful APIs for managing students, tasks, blog posts, and messaging.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/student-task-portal

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d

   # Frontend URL
   FRONTEND_URL=http://localhost:3000

   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-specific-password
   SMTP_FROM=your-email@gmail.com
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user
- PATCH `/api/auth/profile` - Update user profile
- POST `/api/auth/change-password` - Change password
- POST `/api/auth/forgot-password` - Request password reset
- POST `/api/auth/reset-password` - Reset password

### Tasks
- POST `/api/tasks` - Create new task (admin)
- GET `/api/tasks/admin/all` - Get all tasks (admin)
- GET `/api/tasks/admin/stats` - Get task statistics (admin)
- PATCH `/api/tasks/:id` - Update task (admin)
- DELETE `/api/tasks/:id` - Delete task (admin)
- POST `/api/tasks/:id/grade` - Grade task submission (admin)
- GET `/api/tasks/student` - Get student's tasks
- POST `/api/tasks/:id/submit` - Submit task (student)
- GET `/api/tasks/:id` - Get task by ID

### Blog
- POST `/api/blog` - Create new post (admin)
- GET `/api/blog/admin/all` - Get all posts (admin)
- GET `/api/blog/admin/stats` - Get post statistics (admin)
- PATCH `/api/blog/:id` - Update post (admin)
- DELETE `/api/blog/:id` - Delete post (admin)
- GET `/api/blog` - Get published posts
- GET `/api/blog/:id` - Get post by ID
- POST `/api/blog/:id/comments` - Add comment

### Messages
- POST `/api/messages` - Send message
- GET `/api/messages/conversations` - Get recent conversations
- GET `/api/messages/conversations/:userId` - Get conversation
- POST `/api/messages/conversations/:senderId/read` - Mark messages as read
- GET `/api/messages/unread` - Get unread count
- DELETE `/api/messages/:id` - Delete message

### Students
- GET `/api/students/profile` - Get student profile
- PATCH `/api/students/profile` - Update student profile
- GET `/api/students/dashboard` - Get student dashboard
- GET `/api/students/performance` - Get student performance
- GET `/api/students/admin/all` - Get all students (admin)
- PATCH `/api/students/admin/:studentId/status` - Update student status (admin)

### Admin
- GET `/api/admin/dashboard` - Get admin dashboard
- GET `/api/admin/profile` - Get admin profile
- PATCH `/api/admin/profile` - Update admin profile
- GET `/api/admin/stats` - Get system statistics

## Features

- User authentication and authorization
- Task management and submission
- Blog post management
- Real-time messaging
- Student performance tracking
- Admin dashboard with statistics
- Email notifications

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT for authentication
- Nodemailer for email notifications

## Development

To start the development server with hot reloading:
```bash
npm run dev
```

## Production

To build and start the production server:
```bash
npm run build
npm start
```

## Testing

To run tests:
```bash
npm test
```

## License

MIT 