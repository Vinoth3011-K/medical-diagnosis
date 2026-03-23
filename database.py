import sqlite3
from datetime import datetime
import hashlib
import secrets

class Database:
    def __init__(self, db_name='medical_chatbot.db'):
        self.db_name = db_name
        self.init_db()
    
    def get_connection(self):
        conn = sqlite3.connect(self.db_name)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Chat history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                message TEXT NOT NULL,
                sender TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Diagnosis history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS diagnosis_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                symptoms TEXT NOT NULL,
                diagnosis TEXT NOT NULL,
                severity TEXT,
                urgency TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def hash_password(self, password):
        return hashlib.sha256(password.encode()).hexdigest()
    
    # User operations
    def create_user(self, name, email, password):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            hashed_password = self.hash_password(password)
            cursor.execute(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                (name, email.lower().strip(), hashed_password)
            )
            conn.commit()
            user_id = cursor.lastrowid
            conn.close()
            return {'id': user_id, 'name': name, 'email': email}
        except sqlite3.IntegrityError:
            conn.close()
            return None
    
    def get_user_by_email(self, email):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email.lower().strip(),))
        user = cursor.fetchone()
        conn.close()
        return dict(user) if user else None
    
    def verify_user(self, email, password):
        user = self.get_user_by_email(email)
        if user and user['password'] == self.hash_password(password):
            return {'id': user['id'], 'name': user['name'], 'email': user['email']}
        return None
    
    # Chat history operations
    def save_message(self, user_id, message, sender):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO chat_history (user_id, message, sender) VALUES (?, ?, ?)',
            (user_id, message, sender)
        )
        conn.commit()
        conn.close()
    
    def get_chat_history(self, user_id, limit=50):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT * FROM chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
            (user_id, limit)
        )
        messages = cursor.fetchall()
        conn.close()
        return [dict(msg) for msg in reversed(messages)]
    
    # Diagnosis history operations
    def save_diagnosis(self, user_id, symptoms, diagnosis, severity, urgency):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO diagnosis_history (user_id, symptoms, diagnosis, severity, urgency) VALUES (?, ?, ?, ?, ?)',
            (user_id, symptoms, diagnosis, severity, urgency)
        )
        conn.commit()
        conn.close()
    
    def get_diagnosis_history(self, user_id, limit=10):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT * FROM diagnosis_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
            (user_id, limit)
        )
        diagnoses = cursor.fetchall()
        conn.close()
        return [dict(d) for d in diagnoses]
