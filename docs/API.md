# API Documentation

This document contains comprehensive API endpoint documentation for the POS Backend system.

## Authentication

### POST /api/auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "role": "admin"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid username or password"
}
```

### GET /api/auth/verify
Verify JWT token validity.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "user": {
    "userId": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### POST /api/auth/logout
Logout user (client-side token removal).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful. Please remove the token from client storage."
}
```

## Health Check

### GET /api/health
Check API health status.

**Response (200):**
```json
{
  "success": true,
  "message": "POS Backend API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

## Testing

Test the login endpoint with curl:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'

# Verify token (replace <token> with actual token)
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer <token>"
```

## See Also

- [System Architecture & Modules](./MODULES.md) - Detailed documentation about the modular architecture and system flow
- [Project README](../README.md) - Getting started guide and project overview