import os
from urllib.parse import quote
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import SQLAlchemy instance and models
from models import db, User, Ingredient, History

# 1. Load configuration and secret keys
load_dotenv()

# 2. Initialize Flask App
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

# 3. Configure SQLAlchemy
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fridge_chef.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# 4. Set up database tables and standard user on startup
USER_ID = None

with app.app_context():
    db.create_all()  # Replaces init_database()
    
    # Get or Create default user "Tepun"
    user = User.query.filter_by(username="Tepun").first()
    if not user:
        user = User(username="Tepun")
        db.session.add(user)
        db.session.commit()
    USER_ID = user.id

def get_recipes_by_ingredients(ingredients_list):
    """Fetches matching recipes from Spoonacular API based on fridge items."""
    api_key = os.getenv("SPOONACULAR_API_KEY")
    if not api_key:
        print("Error: SPOONACULAR_API_KEY is missing from your .env file!")
        return []

    clean_names = []
    for item in ingredients_list:
        if isinstance(item, dict):
            clean_names.append(item.get('name', '').strip())
        elif isinstance(item, str):
            clean_names.append(item.strip())

    clean_names = [name for name in clean_names if name]

    if not clean_names:
        return []

    ingredients_string = quote(",".join(clean_names))
    url = f"https://api.spoonacular.com/recipes/findByIngredients?ingredients={ingredients_string}&number=5&apiKey={api_key}"

    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return response.json()
        print(f"Spoonacular API Error: Status code {response.status_code} - {response.text}")
        return []
    except requests.exceptions.RequestException as e:
        print(f"Network error connecting to Spoonacular: {e}")
        return []

# --- API ROUTES ---

@app.route('/api/fridge', methods=['GET'])
def get_fridge():
    """Fetches all ingredients for the user."""
    ingredients = Ingredient.query.filter_by(user_id=USER_ID).all()
    return jsonify([item.to_dict() for item in ingredients]), 200

@app.route('/api/fridge', methods=['POST'])
def add_fridge_item():
    """Adds a new ingredient for the user."""
    data = request.get_json(silent=True) or {}
    item_name = data.get('ingredient')

    if not item_name or not item_name.strip():
        return jsonify({"error": "Ingredient name cannot be blank"}), 400

    new_item = Ingredient(user_id=USER_ID, name=item_name.lower().strip())
    db.session.add(new_item)
    db.session.commit()

    return jsonify({"message": f"Added '{item_name}' successfully!", "item": new_item.to_dict()}), 201

@app.route('/api/fridge/<int:item_id>', methods=['DELETE'])
def remove_fridge_item(item_id):
    """Removes an ingredient standardizing authorization."""
    item = Ingredient.query.filter_by(id=item_id, user_id=USER_ID).first()
    
    if not item:
        return jsonify({"error": "Item not found"}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Removed successfully!"}), 200

@app.route('/api/recipes', methods=['GET'])
def search_recipes():
    """Fetches matching recipes from Spoonacular using current fridge items."""
    ingredients = Ingredient.query.filter_by(user_id=USER_ID).all()
    if not ingredients:
        return jsonify([])

    results = get_recipes_by_ingredients([item.name for item in ingredients])
    return jsonify(results), 200

@app.route('/api/history', methods=['GET', 'POST'])
def recipe_history():
    """Logs a chosen recipe (POST) or retrieves past history (GET)."""
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        recipe_id = data.get('id')
        title = data.get('title')

        if not recipe_id or not title:
            return jsonify({"error": "Missing recipe 'id' or 'title'"}), 400

        entry = History(user_id=USER_ID, recipe_id=recipe_id, title=title)
        db.session.add(entry)
        db.session.commit()
        return jsonify({"message": f"Successfully logged {title}!"}), 201

    # GET request
    history = History.query.filter_by(user_id=USER_ID).order_by(History.timestamp.desc()).all()
    return jsonify([entry.to_dict() for entry in history]), 200

if __name__ == '__main__':
    app.run(port=5000, debug=True)