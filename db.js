// db.js - SQLite database setup for MarkWise AI
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, 'markwise.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'teacher',
  school TEXT DEFAULT '',
  plan TEXT DEFAULT 'Pro Plan',
  scripts_marked INTEGER DEFAULT 0,
  plan_limit INTEGER DEFAULT 1000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  grade TEXT,
  class_name TEXT,
  subject TEXT,
  assessment_type TEXT,
  paper TEXT,
  total_marks INTEGER DEFAULT 100,
  teacher_instructions TEXT DEFAULT '',
  memo_path TEXT,
  question_paper_path TEXT,
  status TEXT DEFAULT 'setup',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  learner_name TEXT,
  learner_number INTEGER DEFAULT 0,
  file_path TEXT,
  marks INTEGER DEFAULT 0,
  total_marks INTEGER DEFAULT 100,
  percentage REAL DEFAULT 0,
  pass INTEGER DEFAULT 0,
  ai_confidence REAL DEFAULT 0,
  ai_explanation TEXT DEFAULT '',
  status TEXT DEFAULT 'uploaded',
  moderated INTEGER DEFAULT 0,
  flagged INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);

CREATE TABLE IF NOT EXISTS question_stats (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  question_num INTEGER,
  possible_marks INTEGER,
  average_mark REAL DEFAULT 0,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  assessment_id TEXT,
  title TEXT,
  detail TEXT,
  icon TEXT DEFAULT 'fa-file-check',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = db;
