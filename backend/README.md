# MindBattle Backend

This folder contains the Node.js and PostgreSQL backend server for the MindBattle application.

## Setup

1.  **Install Dependencies:**
    Navigate into this directory and run:
    ```bash
    npm install
    ```

2.  **Setup PostgreSQL:**
    - Make sure you have PostgreSQL installed and running on your machine.
    - Create a new database for this project (e.g., `mindbattle_db`).

3.  **Environment Variables:**
    - Create a `.env` file in this `backend` directory.
    - Add your database connection string to it. It should look something like this:
    ```
    DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/mindbattle_db
    ```
    Replace `YOUR_USER`, `YOUR_PASSWORD`, and `mindbattle_db` with your actual database credentials.

4.  **Initialize Database Schema & Data:**
    - Use a PostgreSQL client (like `psql` or a GUI tool) to connect to your new database.
    - Run the SQL commands in the `database.sql` file. This will create the necessary tables and seed them with initial contest data.
    - For example, using the `psql` command-line tool:
      ```bash
      psql -d mindbattle_db -U YOUR_USER -f database.sql
      ```
      (You might be prompted for your password.)

## Running the Server

-   **For development (with auto-reload):**
    ```bash
    npm run dev
    ```
-   **For production:**
    ```bash
    npm start
    ```

The server will start on port 3001 (or the port specified in your `.env` file). The frontend is configured to connect to this server when it's running.
