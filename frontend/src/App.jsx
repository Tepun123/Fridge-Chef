import { useState, useEffect } from 'react';

function App() {
  const [fridge, setFridge] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [recipes, setRecipes] = useState([]);

  const fetchFridge = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/fridge');
      const data = await res.json();
      setFridge(data);
    } catch (err) {
      console.error("Error fetching fridge:", err);
    }
  };

  useEffect(() => {
    fetchFridge();
  }, []);

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    if (!newIngredient.trim()) return;

    await fetch('http://127.0.0.1:5000/api/fridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredient: newIngredient })
    });

    setNewIngredient(''); 
    fetchFridge();        
  };

  const handleSearchRecipes = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/recipes');
      const data = await res.json();
      setRecipes(data);
    } catch (err) {
      console.error("Error searching recipes:", err);
    }
  };

  const handleLogCooked = async (recipe) => {
    await fetch('http://127.0.0.1:5000/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: recipe.id, title: recipe.title })
    });
    alert(`Logged "${recipe.title}" to your cooked history list!`);
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Fridge Chef 🍳</h1>
      <hr />

      <h3>Add Ingredient</h3>
      <form onSubmit={handleAddIngredient}>
        <input 
          type="text" 
          value={newIngredient} 
          onChange={(e) => setNewIngredient(e.target.value)} 
          placeholder="e.g. Chicken, Garlic, Beef..."
          style={{ padding: '8px', marginRight: '10px', width: '220px' }}
        />
        <button type="submit" style={{ padding: '8px 15px', cursor: 'pointer' }}>Add to Fridge</button>
      </form>

      <h3>My Virtual Fridge Inventory</h3>
      {fridge.length === 0 ? (
        <p style={{ color: '#888' }}>Your fridge is empty. Type an item above to add it!</p>
      ) : (
        <ul style={{ lineHeight: '2' }}>
          {fridge.map((item, index) => (
            <li key={index} style={{ textTransform: 'capitalize' }}>{item}</li>
          ))}
        </ul>
      )}

      <button 
        onClick={handleSearchRecipes} 
        style={{ padding: '12px 24px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', marginTop: '10px' }}
      >
        Find Recipes 🔍
      </button>

      {recipes.length > 0 && (
        <div style={{ marginTop: '25px' }}>
          <h3>Recipes matching your inventory:</h3>
          {recipes.map((recipe) => (
            <div key={recipe.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '12px', borderRadius: '6px', backgroundColor: '#f9f9f9' }}>
              <h4 style={{ margin: '0 0 8px 0' }}>{recipe.title}</h4>
              
              {recipe.missedIngredients && recipe.missedIngredients.length > 0 && (
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 12px 0' }}>
                  <strong>Missing ingredients:</strong> {recipe.missedIngredients.map(i => i.name).join(', ')}
                </p>
              )}

              <button 
                onClick={() => handleLogCooked(recipe)} 
                style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                Mark as Cooked ✅
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;