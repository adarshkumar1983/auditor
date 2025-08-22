# Collaborative Text Editor with AI Assistant

This project is a real-time collaborative text editor with AI-powered writing assistance, built as a technical assignment for WorkRadius AI Technologies Pvt Ltd.

## Features

-   **Real-time Collaborative Editing:** Multiple users can edit the same document simultaneously.
-   **Document Management:** Create, save, and manage documents with persistence.
-   **User Authentication & Authorization:** Secure JWT-based authentication.
-   **AI Writing Assistant:** Integration with Google Gemini for:
    -   Grammar & Style Checker
    -   Text Enhancement
    -   Content Summarization
    -   Smart Auto-completion
    -   Writing Suggestions
-   **Cloud Deployment Ready:** Dockerized application for easy deployment to AWS EC2.

## Technical Stack

-   **Frontend:** React.js with React-Quill (rich text editor)
-   **Backend:** Node.js with Express.js
-   **Database:** MongoDB
-   **Real-time:** Socket.io
-   **AI Integration:** Google Gemini API
-   **Containerization:** Docker

## Project Structure

```
.qodo/
client/
├── public/
├── src/
│   ├── components/ # React components (Auth, DocumentList, Editor, AIAssistant)
│   ├── utils/      # Helper functions (auth.js)
│   └── App.js      # Main application component
├── .env            # Frontend environment variables
└── Dockerfile      # Dockerfile for client
server/
├── config/     # Database, JWT configuration
├── models/     # User, Document models
├── routes/     # API routes (auth, documents, AI)
├── middleware/ # Authentication, rate limiting, validation
├── services/   # Business logic (Gemini, document operations)
├── websockets/ # Socket.io handlers
├── utils/      # Helper functions
├── .env        # Backend environment variables
└── Dockerfile  # Dockerfile for server
docker-compose.yml
README.md
LEARNING.md
```

## Getting Started

Follow these steps to set up and run the project locally using Docker Compose.

### Prerequisites

-   Docker Desktop installed and running.

### 1. Clone the repository

```bash
git clone <repository_url>
cd <repository_directory>
```

### 2. Configure Environment Variables

#### Backend (`server/.env`)

Create a `.env` file inside the `server/` directory with the following content:

```env
MONGO_URI=mongodb://mongodb:27017/collaborative_editor
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:3000
PORT=5000
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

-   `MONGO_URI`: Connection string for MongoDB. When using Docker Compose, `mongodb` is the service name.
-   `JWT_SECRET`: A strong, random string for JWT signing.
-   `CLIENT_URL`: The URL of your frontend application.
-   `PORT`: The port the backend server will run on.
-   `GEMINI_API_KEY`: Your Google Gemini API Key. Obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).

#### Frontend (`client/.env`)

Create a `.env` file inside the `client/` directory with the following content:

```env
REACT_APP_SERVER_URL=http://localhost:5000
```

-   `REACT_APP_SERVER_URL`: The URL of your backend API.

### 3. Build and Run with Docker Compose

From the root directory of the project, run:

```bash
docker-compose up --build
```

This command will:

-   Build the Docker images for the client and server.
-   Start the MongoDB, server, and client containers.

### 4. Access the Application

Once all services are up and running, you can access the application in your browser at:

[http://localhost:3000](http://localhost:3000)

## AWS EC2 Deployment Notes

This application is designed to be deployed to AWS EC2 using Docker. The `Dockerfile`s and `docker-compose.yml` provide the necessary containerization. For a production deployment, you would typically:

1.  **Provision an EC2 Instance:** Launch an EC2 instance (e.g., t2.micro for testing).
2.  **Install Docker:** Install Docker and Docker Compose on the EC2 instance.
3.  **Clone Repository:** Clone your project repository onto the EC2 instance.
4.  **Configure Environment Variables:** Set up environment variables securely on the EC2 instance (e.g., using AWS Systems Manager Parameter Store or directly in the `docker-compose.yml` for simplicity, but not recommended for production secrets).
5.  **Run Docker Compose:** Execute `docker-compose up -d` to run the services in detached mode.
6.  **Security Groups:** Configure EC2 Security Groups to allow inbound traffic on ports 80 (for HTTP/HTTPS) and 5000 (if you expose the backend directly, though typically you'd use a reverse proxy).
7.  **SSL/TLS:** For HTTPS, set up a reverse proxy (like Nginx) on the EC2 instance and obtain an SSL certificate (e.g., using Let's Encrypt with Certbot).
8.  **Process Management:** Use a process manager like PM2 or systemd to ensure your Docker containers restart automatically if they crash.

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Document Management
- `GET /api/documents` - Get user's documents
- `POST /api/documents` - Create new document
- `GET /api/documents/:id` - Get specific document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/share` - Generate share link

### AI Assistant
- `POST /api/ai/grammar-check` - Check grammar and style
- `POST /api/ai/enhance` - Enhance writing quality
- `POST /api/ai/summarize` - Summarize text
- `POST /api/ai/complete` - Auto-complete text
- `POST /api/ai/suggestions` - Get content suggestions

## WebSocket Events

### Document Collaboration
- `join-document` / `leave-document` - Join/leave editing session
- `send-changes` - Send text modifications
- `receive-changes` - Receive text modifications
- `cursor-activity` - Update cursor position
- `user-joined` / `user-left` - User presence notifications
- `document-saved` - Save confirmation

## Contributing

Feel free to fork the repository and contribute.

## License

[Specify your license here, e.g., MIT License]
