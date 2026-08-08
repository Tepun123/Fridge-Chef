import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import database

# 1. Load configuration and secret keys from your .env file
load_dotenv()

# 2. Initialize the Flask App server instance
app = Flask(__name__)
CORS(app, origins="http://localhost:5173")  # Allows React frontend requests

# 3. Initialize database setup on startup
database.init_database()
database.create_user("Tepun")
USER_ID = 1  # Standard user account ID

def get_recipes_by_ingredients(ingredients_list):
    """Fetches matching recipes from Spoonacular API based on fridge items."""
    api_key = os.getenv("SPOONACULAR_API_KEY")
    if not api_key:
        print("Error: SPOONACULAR_API_KEY is missing from your .env file!")
        return []

    # Extract clean string names regardless of whether items are dicts or strings
    clean_names = []
    for item in ingredients_list:
        if isinstance(item, dict):
            clean_names.append(item.get('name', ''))
        elif isinstance(item, str):
            clean_names.append(item)

    # Filter out any blank values
    clean_names = [name for name in clean_names if name]

    if not clean_names:
        return []

    ingredients_string = ",".join(clean_names)
    url = f"https://api.spoonacular.com/recipes/findByIngredients?ingredients={ingredients_string}&number=5&apiKey={api_key}"

    try:
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Spoonacular API Error: Status code {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"Network error connecting to Spoonacular: {e}")
        return []

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

@app.route('/api/fridge/<int:item_id>', methods=['DELETE'])
def remove_fridge_item(item_id):
    """Removes an ingredient from the database."""
    database.remove_ingredient(USER_ID, item_id)
    return jsonify({"message": "Removed successfully!"}), 200

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