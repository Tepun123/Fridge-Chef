import os
from functools import wraps
from urllib.parse import quote
import requests
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv

# Import SQLAlchemy instance and models
from models import db, User, Ingredient, History

# 1. Load configuration and secret keys
load_dotenv()

# 2. Initialize Flask App
app = Flask(__name__)
# supports_credentials is required so the browser will send/receive the session cookie
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True)

# SECRET_KEY signs the session cookie - set a real one in your .env file
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "dev-secret-change-me")

# 3. Configure SQLAlchemy
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(BASE_DIR, 'fridge_chef.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()


def login_required(f):
    """Blocks a route unless someone is logged in."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Not logged in"}), 401
        return f(*args, **kwargs)
    return wrapper


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

# --- AUTH ROUTES ---

@app.route('/api/register', methods=['POST'])
def register():
    """Creates a new account."""
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "That username is already taken"}), 409

    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Account created! You can now log in."}), 201


@app.route('/api/login', methods=['POST'])
def login():
    """Logs a user in and starts a session."""
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401

    session['user_id'] = user.id
    return jsonify({"message": f"Welcome back, {user.username}!", "user": user.to_dict()}), 200


@app.route('/api/logout', methods=['POST'])
def logout():
    """Ends the current session."""
    session.pop('user_id', None)
    return jsonify({"message": "Logged out successfully"}), 200


@app.route('/api/me', methods=['GET'])
def me():
    """Tells the frontend who (if anyone) is currently logged in."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"user": None}), 200
    user = User.query.get(user_id)
    return jsonify({"user": user.to_dict() if user else None}), 200

# --- API ROUTES (all scoped to the logged-in user) ---

@app.route('/api/fridge', methods=['GET'])
@login_required
def get_fridge():
    """Fetches all ingredients for the logged-in user."""
    ingredients = Ingredient.query.filter_by(user_id=session['user_id']).all()
    return jsonify([item.to_dict() for item in ingredients]), 200

@app.route('/api/fridge', methods=['POST'])
@login_required
def add_fridge_item():
    """Adds a new ingredient for the logged-in user."""
    data = request.get_json(silent=True) or {}
    item_name = data.get('ingredient')

    if not item_name or not item_name.strip():
        return jsonify({"error": "Ingredient name cannot be blank"}), 400

    new_item = Ingredient(user_id=session['user_id'], name=item_name.lower().strip())
    db.session.add(new_item)
    db.session.commit()

    return jsonify({"message": f"Added '{item_name}' successfully!", "item": new_item.to_dict()}), 201

@app.route('/api/fridge/<int:item_id>', methods=['DELETE'])
@login_required
def remove_fridge_item(item_id):
    """Removes an ingredient, scoped to the logged-in user."""
    item = Ingredient.query.filter_by(id=item_id, user_id=session['user_id']).first()

    if not item:
        return jsonify({"error": "Item not found"}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Removed successfully!"}), 200

@app.route('/api/recipes', methods=['GET'])
@login_required
def search_recipes():
    """Fetches matching recipes from Spoonacular using the logged-in user's fridge items."""
    ingredients = Ingredient.query.filter_by(user_id=session['user_id']).all()
    if not ingredients:
        return jsonify([])

    results = get_recipes_by_ingredients([item.name for item in ingredients])
    return jsonify(results), 200

@app.route('/api/history', methods=['GET', 'POST'])
@login_required
def recipe_history():
    """Logs a chosen recipe (POST) or retrieves past history (GET) for the logged-in user."""
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        recipe_id = data.get('id')
        title = data.get('title')

        if not recipe_id or not title:
            return jsonify({"error": "Missing recipe 'id' or 'title'"}), 400

        entry = History(user_id=session['user_id'], recipe_id=recipe_id, title=title)
        db.session.add(entry)
        db.session.commit()
        return jsonify({"message": f"Successfully logged {title}!"}), 201

    # GET request
    history = History.query.filter_by(user_id=session['user_id']).order_by(History.timestamp.desc()).all()
    return jsonify([entry.to_dict() for entry in history]), 200

if __name__ == '__main__':
    app.run(port=5000, debug=True)