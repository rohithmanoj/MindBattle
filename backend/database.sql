-- Drop tables if they exist to start fresh
DROP TABLE IF EXISTS contests_kbc;
DROP TABLE IF EXISTS contests_fastest_finger;

-- Create the table for KBC-style contests
CREATE TABLE contests_kbc (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(255),
    entry_fee_cents INTEGER DEFAULT 0,
    prize_pool_cents INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    registration_start_date TIMESTAMPTZ NOT NULL,
    registration_end_date TIMESTAMPTZ NOT NULL,
    contest_start_date TIMESTAMPTZ NOT NULL,
    max_participants INTEGER,
    rules TEXT,
    questions JSONB,
    participants JSONB DEFAULT '[]',
    number_of_questions INTEGER,
    created_by VARCHAR(255),
    results JSONB DEFAULT '[]',
    difficulty VARCHAR(50),
    time_per_question INTEGER
);

-- Create the table for Fastest Finger-style contests
CREATE TABLE contests_fastest_finger (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(255),
    entry_fee_cents INTEGER DEFAULT 0,
    prize_pool_cents INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    registration_start_date TIMESTAMPTZ NOT NULL,
    registration_end_date TIMESTAMPTZ NOT NULL,
    contest_start_date TIMESTAMPTZ NOT NULL,
    max_participants INTEGER,
    rules TEXT,
    questions JSONB,
    participants JSONB DEFAULT '[]',
    number_of_questions INTEGER,
    created_by VARCHAR(255),
    results JSONB DEFAULT '[]',
    difficulty VARCHAR(50),
    total_contest_time INTEGER -- in seconds
);

-- Insert Sample Data for KBC Contests
INSERT INTO contests_kbc (
    id, title, description, category, entry_fee_cents, prize_pool_cents, status,
    registration_start_date, registration_end_date, contest_start_date,
    max_participants, rules, questions, participants, number_of_questions, created_by, results, difficulty, time_per_question
) VALUES
(
    'kbc_1', 'History Buff''s Challenge', 'A deep dive into world history, from ancient civilizations to modern times. Only the most knowledgeable will prevail!', 'History', 500, 20000, 'Upcoming',
    NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '1 hour',
    100, 'Standard KBC rules. 15 questions, 3 lifelines.',
    '[{"question": "Who was the first Roman Emperor?", "options": ["Julius Caesar", "Augustus", "Nero", "Caligula"], "answer": "Augustus"}]',
    '["user1@example.com", "user2@example.com"]', 15, 'admin@mindbattle.com', '[]', 'Hard', 30
),
(
    'kbc_2', 'Science Whiz Marathon', 'Test your knowledge across physics, biology, and chemistry. From simple concepts to mind-bending theories.', 'Science & Nature', 1000, 50000, 'Finished',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 hour',
    50, 'Standard KBC rules.',
    '[{"question": "What is the powerhouse of the cell?", "options": ["Nucleus", "Ribosome", "Mitochondrion", "Golgi apparatus"], "answer": "Mitochondrion"}]',
    '["user3@example.com"]', 15, 'admin@mindbattle.com',
    '[{"userId": "user3@example.com", "name": "Alice", "score": 50000}]', 'Medium', 30
);

-- Insert Sample Data for Fastest Finger Contests
INSERT INTO contests_fastest_finger (
    id, title, description, category, entry_fee_cents, prize_pool_cents, status,
    registration_start_date, registration_end_date, contest_start_date,
    max_participants, rules, questions, participants, number_of_questions, created_by, results, difficulty, total_contest_time
) VALUES
(
    'ff_1', 'Pop Culture Blitz', 'How well do you know the latest movies, music, and memes? Answer as many questions as you can in 2 minutes!', 'Movies & TV', 200, 5000, 'Upcoming',
    NOW(), NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '1 hour',
    200, 'Answer as many questions as possible in the time limit. Score is based on correct answers and speed.',
    '[{"question": "Which artist released the album ''Midnights''?", "options": ["Taylor Swift", "Beyonce", "Adele", "Harry Styles"], "answer": "Taylor Swift"}]',
    '[]', 20, 'admin@mindbattle.com', '[]', 'Easy', 120
),
(
    'ff_2', 'Geography Sprint', 'A rapid-fire quiz on world capitals, famous landmarks, and geographical wonders. Think fast!', 'Geography', 0, 1000, 'Live',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '5 minutes',
    500, 'Free entry! Top 3 players with the highest score and fastest time share the prize pool.',
    '[{"question": "What is the capital of Australia?", "options": ["Sydney", "Melbourne", "Canberra", "Perth"], "answer": "Canberra"}]',
    '["user1@example.com", "user4@example.com"]', 30, 'admin@mindbattle.com', '[]', 'Medium', 180
);��뢗���b�
��-�
