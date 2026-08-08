import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    fetchFridgeItems();
  }, []);

  const fetchFridgeItems = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/fridge');
      const data = await response.json();
      setIngredients(data);
    } catch (error) {
      console.error('Error fetching fridge items:', error);
    }
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    if (!newIngredient.trim()) return;

    try {
      const response = await fetch('http://localhost:5000/api/fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient: newIngredient.trim() }),
      });

      if (response.ok) {
        setNewIngredient('');
        fetchFridgeItems();
      }
    } catch (error) {
      console.error('Error adding ingredient:', error);
    }
  };

  const handleRemoveIngredient = async (item, index) => {
    const targetId = typeof item === 'object' && item !== null && item.id ? item.id : index;

    try {
      const response = await fetch(`http://localhost:5000/api/fridge/${targetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchFridgeItems();
      }
    } catch (error) {
      console.error('Error removing ingredient:', error);
    }
  };

  const handleSearchRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const response = await fetch('http://localhost:5000/api/recipes');
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error('Error searching recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const handleLogCooked = async (recipe) => {
    try {
      const response = await fetch('http://localhost:5000/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.id, title: recipe.title }),
      });
      if (response.ok) {
        alert(`Logged "${recipe.title}" to cooking history!`);
        setSelectedRecipe(null);
      }
    } catch (error) {
      console.error('Error logging history:', error);
    }
  };

  const getItemName = (item) => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) return item.name || item.ingredient;
    return String(item);
  };

  return (
    <div className="app-container">
      {/* Top Bar Navigation */}
      <div className="header-nav">
        <button className="icon-btn">☰</button>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="icon-btn">👤</button>
          <button className="icon-btn">⚙</button>
        </div>
      </div>

      <h1 className="app-title">The Minimalist Fridge Chef</h1>

      <div className="hero-btn-container">
        <button className="ur-fridge-btn">Ur Fridge</button>
      </div>

      {/* Main Two-Column Dashboard */}
      <div className="dashboard-grid">
        
        {/* Left Panel: Inventory */}
        <div className="panel-card">
          <h2 className="panel-title">My Fridge Inventory</h2>
          
          <form onSubmit={handleAddIngredient} className="add-ingredient-form">
            <input
              type="text"
              placeholder="Search items..."
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="add-btn">Add</button>
          </form>

          <div className="tags-container">
            {ingredients.map((item, index) => (
              <div key={item.id || index} className="ingredient-tag">
                <span>{getItemName(item)}</span>
                <button 
                  onClick={() => handleRemoveIngredient(item, index)} 
                  className="tag-remove-btn"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleSearchRecipes}
            disabled={ingredients.length === 0 || loadingRecipes}
            className="find-recipes-btn"
          >
            {loadingRecipes ? 'Searching...' : 'Find Recipes 🔍'}
          </button>
        </div>

        {/* Right Panel: Recommendation Page */}
        <div className="panel-card">
          <h2 className="panel-title">Recommendation Page</h2>
          
          {recipes.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic' }}>Click "Find Recipes" to generate recommendations.</p>
          ) : (
            <div className="recipes-grid">
              {recipes.map((recipe) => (
                <div 
                  key={recipe.id} 
                  className="recipe-card"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <img src={recipe.image} alt={recipe.title} className="recipe-circle-img" />
                  <h3 className="recipe-card-title">{recipe.title}</h3>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Recipe Side-Pop-Up Modal */}
      {selectedRecipe && (
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedRecipe(null)}>✕</button>
            <img src={selectedRecipe.image} alt={selectedRecipe.title} className="modal-img" />
            
            <h2 className="modal-title">{selectedRecipe.title}</h2>
            <div className="modal-meta">Cook time: 25 mins | Ingredients available</div>

            <div className="modal-subtitle">Instructions</div>
            <ol className="modal-instructions">
              <li>Prepare ingredients from your fridge list.</li>
              <li>Sauté in pan over medium heat.</li>
              <li>Season to taste and serve hot.</li>
            </ol>

            <button 
              className="start-cooking-btn"
              onClick={() => handleLogCooked(selectedRecipe)}
            >
              START COOKING
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;