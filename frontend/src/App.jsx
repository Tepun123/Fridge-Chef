import React, { useState, useEffect } from 'react';

function App() {
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // Fetch the current fridge inventory on startup
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

  // Add an ingredient to the backend database
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
        fetchFridgeItems(); // Refresh list from DB
      }
    } catch (error) {
      console.error('Error adding ingredient:', error);
    }
  };

  // REMOVE an ingredient using its database row ID
  const handleRemoveIngredient = async (itemId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/fridge/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchFridgeItems(); // Refresh list to reflect removal
      }
    } catch (error) {
      console.error('Error removing ingredient:', error);
    }
  };

  // Search Spoonacular API via backend matching route
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

  // Log recipe cooking event to SQLite history
  const handleLogCooked = async (recipe) => {
    try {
      const response = await fetch('http://localhost:5000/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.id, title: recipe.title }),
      });
      if (response.ok) {
        alert(`Successfully logged "${recipe.title}" to cooking history!`);
      }
    } catch (error) {
      console.error('Error logging history:', error);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1>The Minimalist Fridge Chef 🍳</h1>
        <p>Manage your inventory and discover cooking ideas instantly.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        
        {/* LEFT COLUMN: FRIDGE INVENTORY */}
        <div>
          <h2>My Fridge Inventory</h2>
          
          <form onSubmit={handleAddIngredient} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="e.g., Tomatoes, Chicken, Eggs"
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              style={{ flexGrow: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Add
            </button>
          </form>

          {ingredients.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>Your fridge is empty. Add items to get started!</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {ingredients.map((item) => (
                <li 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '10px', 
                    borderBottom: '1px solid #eee',
                    backgroundColor: '#f9f9f9',
                    marginBottom: '5px',
                    borderRadius: '4px'
                  }}
                >
                  <span>{item.name}</span>
                  <button 
                    onClick={() => handleRemoveIngredient(item.id)}
                    style={{ 
                      backgroundColor: 'transparent', 
                      color: '#dc3545', 
                      border: 'none', 
                      fontSize: '16px', 
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      padding: '0 5px'
                    }}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={handleSearchRecipes}
            disabled={ingredients.length === 0 || loadingRecipes}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: ingredients.length === 0 ? 'not-allowed' : 'pointer',
              opacity: ingredients.length === 0 ? 0.6 : 1
            }}
          >
            {loadingRecipes ? 'Searching Recipes...' : 'Find Recipes 🔍'}
          </button>
        </div>

        {/* RIGHT COLUMN: API RECIPE SEARCH RESULTS */}
        <div>
          <h2>Matching Recipes</h2>
          {recipes.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No recipe targets queried yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {recipes.map((recipe) => (
                <div key={recipe.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '6px', backgroundColor: '#fff' }}>
                  <img src={recipe.image} alt={recipe.title} style={{ width: '100%', borderRadius: '4px', marginBottom: '10px' }} />
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{recipe.title}</h3>
                  <button 
                    onClick={() => handleLogCooked(recipe)}
                    style={{ 
                      padding: '6px 12px', 
                      backgroundColor: '#17a2b8', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer' 
                    }}
                  >
                    Mark as Cooked ✔
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;