# Revcode - AI-Powered Code Review Platform

Revcode is an intelligent code review platform that leverages AI to help developers improve code quality, security, and performance. It integrates with GitHub to provide automated code reviews, intelligent suggestions, and comprehensive analytics.

## Features

- **AI-Powered Code Reviews**: Automated analysis of code changes with intelligent suggestions
- **GitHub Integration**: Seamlessly connect your GitHub repositories
- **Security Analysis**: Detect vulnerabilities and security risks
- **Performance Optimization**: Identify performance bottlenecks
- **Code Quality Metrics**: Track code complexity, maintainability, and best practices
- **User Dashboard**: Comprehensive overview of code quality and review history
- **Review Management**: Track, comment on, and manage code reviews

## Tech Stack

### Frontend
- **React**: UI library for building the user interface
- **TypeScript**: Type safety for the frontend
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Backend
- **Node.js**: JavaScript runtime for the server
- **Express**: Web framework for building APIs
- **TypeScript**: Type safety for the backend
- **SQLite**: Lightweight relational database
- **GitHub API**: Integration with GitHub repositories

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (or yarn/pnpm)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Revcode
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the `server` directory with the following variables:
   ```env
   PORT=3001
   DATABASE_URL=./dev.db
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
Revcode/
├── client/              # Frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── types/       # TypeScript types
│   │   └── App.tsx      # Main application component
│   ├── package.json
│   └── vite.config.ts
├── server/              # Backend application
│   ├── src/
│   │   ├── controllers/ # Request handlers
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── types/       # TypeScript types
│   │   └── index.ts     # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── .env                 # Environment variables (not in git)
├── README.md            # Project documentation
└── package.json         # Root project configuration
```

## API Endpoints

### Repositories
- `GET /api/repositories`: List all repositories
- `POST /api/repositories`: Add a new repository
- `GET /api/repositories/:id`: Get repository details
- `DELETE /api/repositories/:id`: Remove a repository

### Reviews
- `GET /api/repositories/:repoId/reviews`: List reviews for a repository
- `POST /api/repositories/:repoId/reviews`: Create a new review
- `GET /api/reviews/:id`: Get review details
- `POST /api/reviews/:id/comments`: Add a comment to a review

### Users
- `GET /api/users`: List all users
- `POST /api/users`: Create a new user
- `GET /api/users/:id`: Get user details

## Development

### Running in Development Mode

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev --prefix client
npm run dev --prefix server
```

### Database

The database is automatically initialized on first run. To reset the database:

```bash
# Remove the database file
rm server/dev.db

# Restart the server to recreate it
npm run dev --prefix server
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.