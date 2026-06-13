import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import database
 # Make sure this matches your terminal script's file name!

# 1. Load configuration and secret keys from your .env file
load_dotenv()

# 2. Initialize the Flask App server instance
app = Flask(__name__)
CORS(app)  # Allows your browser-based React app to talk to this backend safely

# 3. Initialize your database setup on startup
database.init_database()
database.create_user("Tepun")
USER_ID = 1  # Standard user account number for our project sessions

# --- API ROUTES ---

@app.route('/api/fridge', methods=['GET'])
def get_fridge():
    """Fetches all ingredients currently in the virtual fridge."""
    items = database.get_user_ingredients(USER_ID)
    return jsonify(items)

@app.route('/api/fridge', methods=['POST'])
def add_fridge_item():
    """Adds a new ingredient to the database."""
    data = request.json
    item_name = data.get('ingredient')
    if item_name:
        database.add_ingredient(USER_ID, item_name)
        return jsonify({"message": "Added successfully!"}), 201
    return jsonify({"error": "Blank name"}), 400

@app.route('/api/recipes', methods=['GET'])
def search_recipes():
    """Fetches matching recipes from Spoonacular using current fridge items."""
    fridge = database.get_user_ingredients(USER_ID)
    if not fridge:
        return jsonify([])  # Return empty list if fridge has no items
    results = get_recipes_by_ingredients(fridge)
    return jsonify(results if results else [])

@app.route('/api/history', methods=['POST'])
def log_history():
    """Logs a specific chosen recipe to your SQLite history table."""
    data = request.json
    recipe_id = data.get('id')
    title = data.get('title')
    database.log_cooked_recipe(USER_ID, recipe_id, title)
    return jsonify({"message": f"Successfully logged {title}!"})

# 4. Start the live local network server
if __name__ == '__main__':
    app.run(port=5000, debug=True)