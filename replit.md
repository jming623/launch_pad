# 프로젝트헌터 - Project Hunter Platform

## Overview

This is a Korean-focused project showcase platform called "프로젝트헌터" (Project Hunter) designed for individual creators and small projects to promote their work in the AI era. The platform allows users to discover, showcase, and interact with innovative projects through a ranking system and community features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Monorepo Structure
- **Frontend**: React with TypeScript, using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit OAuth integration with session management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management

### Directory Organization
```
├── client/          # Frontend React application
├── server/          # Express.js backend
├── shared/          # Shared types and schemas
└── attached_assets/ # Project documentation
```

## Key Components

### Frontend Architecture
- **React Router**: Using Wouter for lightweight client-side routing
- **Component Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark mode support
- **Form Handling**: React Hook Form with Zod validation
- **Query Management**: TanStack Query for API state management

### Backend Architecture
- **API Layer**: RESTful Express.js server with TypeScript
- **Database Layer**: Drizzle ORM with type-safe schema definitions
- **Authentication**: Replit OAuth with session-based auth using PostgreSQL session store
- **File Structure**: Modular routing with separate storage abstraction layer

### Database Schema Design
- **Users**: Replit OAuth user profiles with basic information
- **Projects**: Core entity with title, description, media, and metadata
- **Categories**: Project categorization system
- **Likes**: User engagement tracking with project relationships
- **Comments**: Threaded commenting system with parent-child relationships
- **Feedback**: Platform feedback collection with categorization
- **Sessions**: PostgreSQL-based session storage for authentication

## Data Flow

### Authentication Flow
1. **Nickname-based Registration**: Email/password registration with nickname setup flow
2. Secure bcrypt password hashing and session management
3. Profanity filtering system with Korean language support (19 filtered words)
4. Two-step registration: account creation → nickname setup via `/nickname` page
5. Multi-provider OAuth support (Google, GitHub, Replit) for social authentication
6. Session management using PostgreSQL session store with connect-pg-simple
7. Protected routes with passport.js authentication middleware

### Project Discovery Flow
1. Projects displayed with ranking system (Today/Weekly/Monthly/All Time)
2. Category-based filtering system
3. Like-based engagement metrics
4. View tracking for popularity metrics

### Content Creation Flow
1. Authenticated users can create projects
2. Form validation using Zod schemas
3. Image/video upload support
4. Category selection and tagging

## External Dependencies

### Database Infrastructure
- **Neon Database**: Serverless PostgreSQL database
- **Connection Pooling**: Using @neondatabase/serverless for optimal performance

### Authentication Services
- **Traditional Email/Password**: Primary authentication method with bcrypt hashing
- **Multi-Provider OAuth**: Google, GitHub, and Replit social login options
- **Session Management**: PostgreSQL-based session storage with passport.js

### Development Tools
- **Vite**: Frontend build tool with React plugin
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Server-side bundling for production

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Lucide Icons**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server for frontend, tsx for backend hot reloading
- **Database**: Drizzle push for schema synchronization
- **Environment**: NODE_ENV-based configuration switching

### Production Build
- **Frontend**: Vite build generating optimized static assets
- **Backend**: ESBuild bundling Express server to single file
- **Assets**: Static file serving through Express in production

### Environment Configuration
- **Database URL**: PostgreSQL connection string
- **Session Secret**: Secure session encryption key
- **OAuth Config**: Replit OAuth application credentials
- **Replit Integration**: Special handling for Replit environment detection

### Scaling Considerations
- Serverless-ready architecture with connection pooling
- Session storage externalized to PostgreSQL
- Static asset optimization through Vite build process
- API rate limiting and error handling middleware

## Recent Changes

### 2025-01-27: "더 많은 프로젝트 보기" 버튼 로직 개선
- **조건부 표시**: 초기 로드에서 프로젝트가 없으면 버튼 숨김
- **스마트 상태 관리**: 버튼 클릭 후 더 이상 로드할 프로젝트가 없으면 버튼 숨김
- **사용자 경험 개선**: 불필요한 로드 시도 방지 및 명확한 UI 피드백

### 2025-01-20: 프로필 관리 시스템 완성
- **닉네임 우선 표시**: 헤더에서 닉네임이 이메일보다 우선 표시되도록 수정
- **프로필 수정 페이지**: `/profile` 경로에 프로필 수정 페이지 추가
- **프로필 사진 업로드**: multer를 사용한 파일 업로드 기능 (5MB 제한)
- **프로필 메뉴**: 헤더 드롭다운에 "프로필 수정" 메뉴 추가
- **실시간 닉네임 검증**: 프로필 수정 시에도 비속어 및 중복 검사 적용
- **파일 관리**: 이전 프로필 사진 자동 삭제 기능