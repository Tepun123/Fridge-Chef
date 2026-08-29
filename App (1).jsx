import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000';

function App() {
  // --- Auth state ---
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  // --- App state ---
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Check for an existing session when the app first loads
  useEffect(() => {
    fetch(`${API_BASE}/api/me`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
      })
      .catch((error) => console.error('Error checking session:', error))
      .finally(() => setCheckingAuth(false));
  }, []);

  // Once logged in, load the user's fridge items
  useEffect(() => {
    if (user) {
      fetchFridgeItems();
    }
  }, [user]);

  // --- Auth handlers ---

  const handleAuthInputChange = (e) => {
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(authForm),
      });
      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setAuthForm({ username: '', password: '' });
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setAuthError('Could not reach the server');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');

    try {
      const response = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(authForm),
      });
      const data = await response.json();

      if (response.ok) {
        // Auto switch to login after a successful registration
        setAuthMode('login');
        setAuthError('Account created! You can log in now.');
        setAuthForm({ ...authForm, password: '' });
      } else {
        setAuthError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Error registering:', error);
      setAuthError('Could not reach the server');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setUser(null);
      setIngredients([]);
      setRecipes([]);
      setSelectedRecipe(null);
    }
  };

  // --- Fridge / recipe handlers (all now send credentials) ---

  const fetchFridgeItems = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/fridge`, {
        credentials: 'include',
      });
      if (response.status === 401) {
        setUser(null);
        setIngredients([]);
        return;
      }
      const data = await response.json();
      // Guard against any non-array response (e.g. an error object) so a
      // bad response can never crash the render with ingredients.map().
      setIngredients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching fridge items:', error);
      setIngredients([]);
    }
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    if (!newIngredient.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/fridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ingredient: newIngredient.trim() }),
      });

      if (response.ok) {
        setNewIngredient('');
        fetchFridgeItems();
      } else if (response.status === 401) {
        setUser(null);
      }
    } catch (error) {
      console.error('Error adding ingredient:', error);
    }
  };

  const handleRemoveIngredient = async (item, index) => {
    const targetId = typeof item === 'object' && item !== null && item.id ? item.id : index;

    try {
      const response = await fetch(`${API_BASE}/api/fridge/${targetId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchFridgeItems();
      } else if (response.status === 401) {
        setUser(null);
      }
    } catch (error) {
      console.error('Error removing ingredient:', error);
    }
  };

  const handleSearchRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const response = await fetch(`${API_BASE}/api/recipes`, {
        credentials: 'include',
      });
      if (response.status === 401) {
        setUser(null);
        return;
      }
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
      const response = await fetch(`${API_BASE}/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: recipe.id, title: recipe.title }),
      });
      if (response.ok) {
        alert(`Logged "${recipe.title}" to cooking history!`);
        setSelectedRecipe(null);
      } else if (response.status === 401) {
        setUser(null);
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

  // --- Render: loading spinner while we check for a session ---
  if (checkingAuth) {
    return (
      <div className="app-container">
        <p style={{ textAlign: 'center', marginTop: '80px', color: '#888' }}>Loading...</p>
      </div>
    );
  }

  // --- Render: login / register screen ---
  if (!user) {
    return (
      <div className="app-container">
        <h1 className="app-title">The Minimalist Fridge Chef</h1>

        <div style={{ maxWidth: '380px', margin: '40px auto' }} className="panel-card">
          <h2 className="panel-title">{authMode === 'login' ? 'Log In' : 'Create Account'}</h2>

          <form
            onSubmit={authMode === 'login' ? handleLogin : handleRegister}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={authForm.username}
              onChange={handleAuthInputChange}
              className="search-input"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={authForm.password}
              onChange={handleAuthInputChange}
              className="search-input"
              required
            />

            {authError && (
              <p style={{ color: authError.includes('created') ? '#38edac' : '#ff4d4d', fontSize: '0.9rem', margin: 0 }}>
                {authError}
              </p>
            )}

            <button type="submit" className="find-recipes-btn">
              {authMode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '18px', color: '#aaa', fontSize: '0.9rem' }}>
            {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
              style={{ background: 'none', border: 'none', color: '#38edac', cursor: 'pointer', fontWeight: 700 }}
            >
              {authMode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // --- Render: main dashboard (only reached once logged in) ---
  return (
    <div className="app-container">
      {/* Top Bar Navigation */}
      <div className="header-nav">
        <button className="icon-btn">☰</button>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Hi, {user.username}</span>
          <button className="icon-btn">👤</button>
          <button className="icon-btn">⚙</button>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: '1px solid #333',
              color: '#fff',
              borderRadius: '8px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Log Out
          </button>
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
            {(Array.isArray(ingredients) ? ingredients : []).map((item, index) => (
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
