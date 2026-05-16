import sqlite3

def init_database():
    """Creates the database file and initializes the 3 tables."""
    conn = sqlite3.connect("fridge_chef.db")
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL
        )
    """)

    # 2. Recipes Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL
        )
    """)

    # 3. UserRecipes Table (History tracking)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            recipe_id INTEGER NOT NULL,
            cooked_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (recipe_id) REFERENCES recipes (id)
        )
    """)
    conn.commit()
    conn.close()
    print("Database check complete: tables are ready!")


def create_user(username):
    """Helper function to quickly add a new test user."""
    conn = sqlite3.connect("fridge_chef.db")
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username) VALUES (?)", (username,))
        conn.commit()
        print(f"User '{username}' created successfully!")
    except sqlite3.IntegrityError:
        print(f"User '{username}' already exists.")
    finally:
        conn.close()


def log_cooked_recipe(user_id, recipe_id, recipe_title):
    """Saves a recipe to the database and links it to a user's history."""
    conn = sqlite3.connect("fridge_chef.db")
    cursor = conn.cursor()
    
    # First, make sure the recipe is stored in our main recipes cache table
    cursor.execute("""
        INSERT OR IGNORE INTO recipes (id, title) 
        VALUES (?, ?)
    """, (recipe_id, recipe_title))
    
    # Second, log it into the user's personal history
    cursor.execute("""
        INSERT INTO user_recipes (user_id, recipe_id) 
        VALUES (?, ?)
    """, (user_id, recipe_id))
    
    conn.commit()
    conn.close()
    print(f"Successfully logged '{recipe_title}' to User #{user_id}'s history!")