import sqlite3

def init_database():
    """Creates the database file and initializes the tables."""
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

    # 4. NEW: Ingredients Table (Your Virtual Fridge)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, name) -- Prevents adding the exact same ingredient twice
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
        print(f"User '{username}' verified/created.")
    except sqlite3.IntegrityError:
        pass  # User already exists, which is fine!
    finally:
        conn.close()


def add_ingredient(user_id, ingredient_name):
    """Saves a typed ingredient into the user's virtual fridge database."""
    conn = sqlite3.connect("fridge_chef.db")
    cursor = conn.cursor()
    clean_name = ingredient_name.lower().strip()
    try:
        cursor.execute("INSERT INTO ingredients (user_id, name) VALUES (?, ?)", (user_id, clean_name))
        conn.commit()
        print(f"-> Added '{clean_name}' to your virtual fridge!")
    except sqlite3.IntegrityError:
        print(f"-> '{clean_name}' is already in your fridge!")
    finally:
        conn.close()


def get_user_ingredients(user_id):
    """Fetches all ingredients currently stored in the user's database fridge."""
    conn = sqlite3.connect("fridge_chef.db")
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM ingredients WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    # Turn a list of tuples like [('chicken',), ('garlic',)] into a clean list of strings ['chicken', 'garlic']
    return [row[0] for row in rows]


def log_cooked_recipe(user_id, recipe_id, recipe_title):
    """Saves a recipe to the database and links it to a user's history."""
    conn = sqlite3.connect("fridge_chef.db")
    cursor = conn.cursor()
    
    cursor.execute("INSERT OR IGNORE INTO recipes (id, title) VALUES (?, ?)", (recipe_id, recipe_title))
    cursor.execute("INSERT INTO user_recipes (user_id, recipe_id) VALUES (?, ?)", (user_id, recipe_id))
    
    conn.commit()
    conn.close()
    print(f"Successfully logged '{recipe_title}' to your history!")