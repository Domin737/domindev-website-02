# DominDev Website

A modern, responsive website built with React, TypeScript, and Vite, featuring a Node.js backend with LangChain integration. This monorepo contains both the frontend and backend components of the website.

## Project Structure

This is a monorepo project organized into the following structure:

```
domindev-website-02/
├── packages/
│   ├── frontend/          # React frontend application
│   │   ├── src/          # Source code
│   │   ├── public/       # Static assets
│   │   └── package.json  # Frontend dependencies
│   │
│   ├── backend/          # Node.js backend server
│   │   ├── src/          # Source code
│   │   ├── scripts/      # Utility scripts
│   │   └── package.json  # Backend dependencies
│   │
│   └── shared/           # Shared types and utilities
│       ├── src/          # Source code
│       │   ├── types/    # Shared TypeScript types/interfaces
│       │   └── utils/    # Common utility functions
│       └── package.json  # Shared module dependencies
│
└── package.json          # Root package.json with workspaces config
```

## Technologies Used

### Shared Module

- TypeScript types and interfaces
- Common utility functions
- Shared validation logic
- Type-safe communication between frontend and backend

### Frontend

- React 18
- TypeScript
- Vite
- SCSS for styling
- Modern responsive design

### Backend

- Node.js
- Express
- LangChain
- Redis for caching
- MongoDB

## Development

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- Redis server (for backend caching)
- MongoDB (for data storage)

### Getting Started

1. Clone the repository
2. Install all dependencies from the root directory:

```bash
npm run install:all
```

3. Start the development servers:

For frontend:

```bash
npm run dev:frontend
```

For backend:

```bash
npm run dev:backend
```

### Building for Production

Build all packages:

```bash
npm run build:shared   # Build shared module first
npm run build:frontend
npm run build:backend
```

## Features

### Frontend

- Modern and responsive design
- TypeScript for enhanced type safety
- SCSS modules for styled components
- Optimized build process with Vite
- SEO-friendly structure
- Mobile-first approach

### Backend

- RESTful API endpoints
- AI-powered chat functionality using LangChain
- Redis caching for improved performance
- Rate limiting and security measures
- Moderation system for chat content

## Available Scripts

### Root Directory

- `npm run install:all` - Install all dependencies
- `npm run build:shared` - Build shared module
- `npm run dev:frontend` - Start frontend development server
- `npm run dev:backend` - Start backend development server
- `npm run build:frontend` - Build frontend for production
- `npm run build:backend` - Build backend for production

### Frontend Package

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend Package

- `npm run start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run redisCacheClear` - Clear Redis cache
- `npm run redisCacheStats` - View Redis cache statistics

## Project Status

This project is actively maintained and regularly updated.

## License

All rights reserved. This source code is proprietary and confidential.
