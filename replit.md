# Zoo Management System

## Overview

A comprehensive zoo animal monitoring system built with React frontend, Express.js backend, and PostgreSQL database. The application enables zookeepers to record daily observations via audio recordings, which are automatically transcribed and structured using AI (Google Gemini), while providing role-based dashboards for administrators, veterinarians, and zookeepers to track animal health and welfare.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React SPA** with TypeScript and Vite for development
- **shadcn/ui** component library with Radix UI primitives for accessible components
- **TailwindCSS** with custom theming for consistent design system
- **Wouter** for lightweight client-side routing
- **TanStack Query** for server state management and caching
- **React Hook Form** with Zod validation for form handling

### Backend Architecture
- **FastAPI** server with Python
- **Session-based authentication** with in-memory session storage using cookies
- **Role-based access control** (admin, doctor, zookeeper roles)
- **RESTful API** design with structured error handling
- **File upload handling** for audio files
- **Python integration** for AI processing via subprocess execution
- **JSON-based user storage** with 5 admins, 10 doctors, and 100 zookeepers

### Data Storage
- **JSON file storage** for user credentials (users.json)
- **In-memory storage** for submissions and comments
- **File system storage** for audio recordings and generated reports
- **Structured data storage** for flexible animal monitoring data

### AI Processing Pipeline
- **Audio transcription** using Deepgram API
- **Structured data extraction** from transcriptions using Google Gemini LLM
- **LangChain** with Pydantic for structured output parsing
- **Schema-driven data validation** ensuring consistent animal monitoring records

### Authentication & Authorization
- **Session-based authentication** with secure cookie handling
- **Three-tier role system**: Administrators (full system access), Veterinarians (review and comment), Zookeepers (data entry)
- **Route-level protection** with middleware-based role checking
- **Automatic role-based dashboard routing**

### File Handling
- **Audio recording** support in browser with MediaRecorder API
- **Multiple audio format support** (WAV, MP3, M4A, OGG)
- **File size validation** (50MB limit) and format checking
- **Temporary file storage** with cleanup after processing

### State Management
- **Client-side caching** with TanStack Query for server state
- **Optimistic updates** for better user experience
- **Real-time data invalidation** on mutations
- **Form state management** with React Hook Form

## External Dependencies

### AI Services
- **Google Gemini API** (gemini-2.5-flash model) for text processing and structured data extraction
- **Deepgram API** for high-accuracy audio transcription

### Backend Runtime
- **FastAPI** (Python web framework for high-performance APIs)
- **Uvicorn** (ASGI server for running FastAPI)

### UI Components
- **Radix UI** primitives for accessible, unstyled components
- **Lucide React** for consistent iconography
- **TailwindCSS** for utility-first styling

### Development Tools
- **Vite** for fast development and building
- **TypeScript** for type safety across frontend and backend
- **ESBuild** for efficient production bundling
- **Drizzle Kit** for database schema management

### Python AI Stack
- **LangChain** for LLM workflow orchestration
- **Pydantic** for data validation and parsing
- **Google GenerativeAI** Python client for Gemini integration

### Session Management
- **In-memory session storage** with cookie-based authentication
- **UUID-based session IDs** for secure session tracking
- **24-hour session expiration** with automatic cleanup