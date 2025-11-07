-- MindBattle Database Schema
-- PostgreSQL Database Setup

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS contests_kbc CASCADE;
DROP TABLE IF EXISTS contests_fastest_finger CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Users Table
CREATE TABLE users (
    email VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    wallet_balance_cents INTEGER DEFAULT 0,
    transactions JSONB DEFAULT '[]'::jsonb,
    role VARCHAR(50),
    registration_date BIGINT NOT NULL,
    total_points INTEGER DEFAULT 0,
    contest_history JSONB DEFAULT '[]'::jsonb,
    banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KBC Format Contests Table
CREATE TABLE contests_kbc (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    entry_fee_cents INTEGER DEFAULT 0,
    prize_pool_cents INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Draft',
    registration_start_date BIGINT NOT NULL,
    registration_end_date BIGINT NOT NULL,
    contest_start_date BIGINT NOT NULL,
    max_participants INTEGER DEFAULT 100,
    rules TEXT,
    questions JSONB DEFAULT '[]'::jsonb,
    participants JSONB DEFAULT '[]'::jsonb,
    number_of_questions INTEGER DEFAULT 0,
    time_per_question INTEGER DEFAULT 30,
    created_by VARCHAR(255),
    results JSONB DEFAULT '[]'::jsonb,
    difficulty VARCHAR(50) DEFAULT 'Medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(email) ON DELETE SET NULL
);

-- Fastest Finger Format Contests Table
CREATE TABLE contests_fastest_finger (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    entry_fee_cents INTEGER DEFAULT 0,
    prize_pool_cents INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Draft',
    registration_start_date BIGINT NOT NULL,
    registration_end_date BIGINT NOT NULL,
    contest_start_date BIGINT NOT NULL,
    max_participants INTEGER DEFAULT 100,
    rules TEXT,
    questions JSONB DEFAULT '[]'::jsonb,
    participants JSONB DEFAULT '[]'::jsonb,
    number_of_questions INTEGER DEFAULT 0,
    total_contest_time INTEGER DEFAULT 300,
    created_by VARCHAR(255),
    results JSONB DEFAULT '[]'::jsonb,
    difficulty VARCHAR(50) DEFAULT 'Medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(email) ON DELETE SET NULL
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_contests_kbc_status ON contests_kbc(status);
CREATE INDEX idx_contests_kbc_start_date ON contests_kbc(contest_start_date);
CREATE INDEX idx_contests_kbc_category ON contests_kbc(category);
CREATE INDEX idx_contests_fastest_finger_status ON contests_fastest_finger(status);
CREATE INDEX idx_contests_fastest_finger_start_date ON contests_fastest_finger(contest_start_date);
CREATE INDEX idx_contests_fastest_finger_category ON contests_fastest_finger(category);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_admin_email ON audit_logs(admin_email);

-- Insert a default admin user (password should be hashed in production)
-- Default password: 'admin123' (CHANGE THIS IN PRODUCTION!)
INSERT INTO users (email, name, password, wallet_balance_cents, role, registration_date, total_points)
VALUES ('admin@mindbattle.com', 'Admin User', 'admin123', 0, 'Super Admin', EXTRACT(EPOCH FROM NOW()) * 1000, 0)
ON CONFLICT (email) DO NOTHING;

-- Sample KBC Contest (optional - for testing)
INSERT INTO contests_kbc (
    id, title, description, category, entry_fee_cents, prize_pool_cents, 
    status, registration_start_date, registration_end_date, contest_start_date,
    max_participants, rules, questions, number_of_questions, time_per_question,
    created_by, difficulty
)
VALUES (
    'kbc-sample-001',
    'General Knowledge Championship',
    'Test your general knowledge and win big!',
    'General Knowledge',
    500, -- $5.00 entry fee
    10000, -- $100.00 prize pool
    'Upcoming',
    EXTRACT(EPOCH FROM NOW()) * 1000,
    EXTRACT(EPOCH FROM (NOW() + INTERVAL '7 days')) * 1000,
    EXTRACT(EPOCH FROM (NOW() + INTERVAL '8 days')) * 1000,
    50,
    'Standard KBC rules apply. Answer questions correctly to win prizes.',
    '[]'::jsonb,
    10,
    30,
    'admin@mindbattle.com',
    'Medium'
)
ON CONFLICT (id) DO NOTHING;

-- Sample Fastest Finger Contest (optional - for testing)
INSERT INTO contests_fastest_finger (
    id, title, description, category, entry_fee_cents, prize_pool_cents,
    status, registration_start_date, registration_end_date, contest_start_date,
    max_participants, rules, questions, number_of_questions, total_contest_time,
    created_by, difficulty
)
VALUES (
    'ff-sample-001',
    'Speed Quiz Challenge',
    'Answer as fast as you can and climb the leaderboard!',
    'Mixed',
    300, -- $3.00 entry fee
    5000, -- $50.00 prize pool
    'Upcoming',
    EXTRACT(EPOCH FROM NOW()) * 1000,
    EXTRACT(EPOCH FROM (NOW() + INTERVAL '5 days')) * 1000,
    EXTRACT(EPOCH FROM (NOW() + INTERVAL '6 days')) * 1000,
    100,
    'Fastest Finger format. Speed and accuracy both matter!',
    '[]'::jsonb,
    15,
    300, -- 5 minutes total
    'admin@mindbattle.com',
    'Easy'
)
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions (adjust as needed for your deployment)
-- These are examples and may need modification based on your Render setup
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
