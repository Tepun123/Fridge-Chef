from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy instance (to be registered with Flask app)
db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)

    # Relationships to child tables (cascades deletes if a user is deleted)
    ingredients = db.relationship('Ingredient', backref='user', lazy=True, cascade="all, delete-orphan")
    history = db.relationship('History', backref='user', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"


class Ingredient(db.Model):
    __tablename__ = 'ingredients'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)

    def to_dict(self):
        """Utility method to return clean dictionary response for APIs."""
        return {"id": self.id, "name": self.name}


class History(db.Model):
    __tablename__ = 'history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipe_id = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Utility method to return clean dictionary response for APIs."""
        return {
            "id": self.id,
            "recipe_id": self.recipe_id,
            "title": self.title,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }