# POS Backend

A comprehensive Point of Sales (POS) backend system built with Express.js, TypeScript, and PostgreSQL. This enterprise-grade solution provides complete inventory management, user administration, and transaction processing capabilities with robust security, modular architecture, and scalable design. Features include JWT-based authentication, role-based access control, product catalog management, category and manufacturer organization, unit management, and comprehensive API endpoints for seamless integration with frontend applications.

## 🏗️ Architecture

```
src/
├── app.ts                     # Express app entry point
├── db/
│   └── index.ts              # PostgreSQL connection
├── exceptions/
│   ├── HttpException.ts      # Custom error class
│   └── errorHandler.ts       # Global error handling
├── middlewares/
│   └── auth.middleware.ts    # JWT authentication
├── modules/
│   └── auth/
│       ├── auth.routes.ts    # Route definitions
│       ├── auth.controller.ts# Request/response handling
│       ├── auth.service.ts   # Business logic
│       └── auth.sql.ts       # SQL queries
├── routes.ts                 # Route combiner
└── utils/
    └── helpers.ts            # Utility functions
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your database credentials:
   ```env
   PORT=3000
   NODE_ENV=development
   
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pos_db
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=24h
   ```

3. **Set up database:**
   ```bash
   # Create database and run the SQL script
   psql -U postgres -c "CREATE DATABASE pos_db;"
   psql -U postgres -d pos_db -f database.sql
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## 📡 API Endpoints

All full API documentation has been moved to [docs/API](./docs/API.md).

Here's a general example format used in our API:

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request:**
```json
{
  "key": "value"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Action completed",
  "data": { ... }
}
```

## 🛠️ Development

### Scripts

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Development with nodemon
npm run dev:watch
```

### Project Structure

- **Modular Architecture**: Each feature (auth) has its own module
- **Layered Design**: Routes → Controllers → Services → Database
- **Type Safety**: Full TypeScript support with strict mode
- **Error Handling**: Centralized error handling with custom exceptions
- **Security**: JWT authentication with bcrypt password hashing

For detailed information about the system architecture and module structure, see [docs/MODULES](./docs/MODULES.md).

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries
- **Error Handling**: No sensitive data in error responses

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'cashier',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Technologies

- **Express.js** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **pg** - PostgreSQL client
- **dotenv** - Environment variables
- **cors** - Cross-origin requests

## 📄 License

MIT License 