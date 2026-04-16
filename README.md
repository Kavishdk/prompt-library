# AI Prompt Library (Professional Edition)

A production-grade full-stack application for managing AI Image Generation Prompts, built for the Front-end Developer Intern assignment.

## 🚀 Key Features
- **Frontend:** React with Tailwind CSS, React Hook Form (Reactive validation), and Lucide icons.
- **Backend:** Node.js Express API with clean RESTful endpoints.
- **Database:** **PostgreSQL** for persistent storages of prompts, users, and tags.
- **Caching:** **Redis** used as the primary source of truth for the live "Visualization Counter".
- **Authentication:** JWT-based Secure Authentication (Login/Register).
- **Tagging System:** Categorize prompts with a Many-to-Many tagging implementation.

## 🏗️ Architecture
- **Multi-Service Docker:** Orchestrated Frontend, Backend, PostgreSQL, and Redis.
- **Live Counter:** Every time a prompt is viewed, the counter is atomically incremented in Redis.
- **Security:** Protected endpoints for prompt creation using JWT tokens.

## 🛠️ Setup Instructions

### Using Docker (Highly Recommended)
Run the entire production-grade stack with a single command:
```bash
docker-compose up --build
```
The app will be available at [http://localhost:3000](http://localhost:3000).

### Manual Setup (Local)
To run without Docker, you must have PostgreSQL and Redis running on your machine.
1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Configuration:**
    Create a `.env` file based on `.env.example`:
    ```env
    DATABASE_URL=postgresql://user:password@localhost:5432/prompt_lib
    REDIS_URL=redis://localhost:6379
    JWT_SECRET=your_jwt_secret
    ```
3.  **Run Development Server:**
    ```bash
    npm run dev
    ```

## 📋 API Design
- `POST /api/auth/register` - Create a new account.
- `POST /api/auth/login` - Secure login (returns JWT).
- `GET /api/prompts` - List all prompts (supports `?tag=` filtering).
- `GET /api/prompts/:id` - Get prompt details and increment Redis view counter.
- `POST /api/prompts` - Create a new prompt (Requires JWT).
- `GET /api/tags` - List all available categorization tags.

## ⚖️ Architectural Decisions
- **Redis for Counters:** Choosing Redis over Postgres for counters ensures high performance and prevents database write-locking under high traffic.
- **Relational Integrity:** PostgreSQL handles the Many-to-Many relationship between Prompts and Tags to maintain data consistency.
- **Multi-Stage Docker:** Optimized build process for smaller production images.
