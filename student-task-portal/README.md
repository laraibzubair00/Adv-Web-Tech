# Student Task & Performance Management Portal

A comprehensive platform for managing student tasks, performance tracking, and communication between administrators and students.

## Features

### Admin Features
- Secure login panel with JWT authentication
- Student management with bulk import
- Task assignment and review system
- Real-time messaging
- Performance reporting and certificates
- Blog management

### Student Features
- Task submission and tracking
- Direct messaging with admin
- Public portfolio display
- Performance monitoring

## Tech Stack
- Frontend: React.js (Vercel)
- Backend: Node.js with Express.js (Render)
- Database: MongoDB Atlas
- Authentication: JWT

## Project Structure
```
student-task-portal/
├── frontend/           # React frontend application
├── backend/           # Node.js backend application
└── docs/             # Documentation
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- Git

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create .env file with required environment variables
4. Start development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create .env file with required environment variables
4. Start development server:
   ```bash
   npm start
   ```

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
```

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the LICENSE file for details. 