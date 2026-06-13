import sqlite3

DB_FILE = "fridge_chef.db"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    with get_db_connection() as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS users (
                            id INTEGER PRIMARY KEY AUTOINCREMENT, 
                            username TEXT UNIQUE)''')
        conn.execute('''CREATE TABLE IF NOT EXISTS ingredients (
                            id INTEGER PRIMARY KEY AUTOINCREMENT, 
                            user_id INTEGER, 
                            name TEXT,
                            FOREIGN KEY(user_id) REFERENCES users(id))''')
        conn.execute('''CREATE TABLE IF NOT EXISTS history (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER,
                            recipe_id INTEGER,
                            title TEXT,
                            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY(user_id) REFERENCES users(id))''')
        conn.commit()

def create_user(username):
    with get_db_connection() as conn:
        try:
            conn.execute("INSERT INTO users (username) VALUES (?)", (username,))
            conn.commit()
        except sqlite3.IntegrityError:
            pass  # User already exists

def add_ingredient(user_id, item_name):
    with get_db_connection() as conn:
        conn.execute("INSERT INTO ingredients (user_id, name) VALUES (?, ?)", (user_id, item_name.lower().strip()))
        conn.commit()

def get_user_ingredients(user_id):
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT name FROM ingredients WHERE user_id = ?", (user_id,))
        return [row['name'] for row in cursor.fetchall()]

def log_cooked_recipe(user_id, recipe_id, title):
    with get_db_connection() as conn:
        conn.execute("INSERT INTO history (user_id, recipe_id, title) VALUES (?, ?, ?)", (user_id, recipe_id, title))
        conn.commit()