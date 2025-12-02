import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';
import RecipeCard from '../components/RecipeCard';
import Navbar from '../components/Navbar';
import Trie from '../trie';
import { useNavigate } from 'react-router-dom';
import recipeCache from '../recipeCache'; 

export default function Dashboard() {
  const [recipes, setRecipes] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  // Trie and maps
  const trieRef = useRef(null);
  const titleToIdRef = useRef(new Map());
  const [suggestions, setSuggestions] = useState([]);
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // helper to build trie and title->id map
  function buildTrieAndMap(list) {
    const titles = [];
    const map = new Map();
    for (const it of list) {
      const title = (it.title || it.name || '').toString().trim();
      if (!title) continue;
      const lower = title.toLowerCase();
      if (!map.has(lower)) map.set(lower, it._id || it.id || null);
      titles.push(title);
    }
    const t = new Trie();
    t.buildFromList(titles);
    trieRef.current = t;
    titleToIdRef.current = map;
  }

  useEffect(() => {
    let mounted = true;
    async function load() {

     setLoading(true);

      try {
        const cached = recipeCache.get('all_recipes');
        if (cached && Array.isArray(cached)) {
          // load from cache
          if (!mounted) return;
          console.log('⚡ Loaded recipes from cache');
          setRecipes(cached);
          buildTrieAndMap(cached);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Recipe cache read failed:', e);
      }

      // 2) Fetch from API and populate cache
      try {
        const { data } = await api.get('/recipes?limit=500&page=1');
        const list = data?.recipes ?? (Array.isArray(data) ? data : []);
        if (!mounted) return;
        setRecipes(list);
        buildTrieAndMap(list);

        try {
          recipeCache.set('all_recipes', list);
        } catch (e) {
          console.warn('Failed to set recipe cache:', e);
        }
      } catch (e) {
        console.error('Failed to load recipes', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);


  const filtered = useMemo(() => {
    if (!q?.trim()) return recipes;
    const s = q.trim().toLowerCase();
    return recipes.filter(r => {
      const title = (r.title || '').toString().toLowerCase();
      const desc = (r.description || r.summary || '').toString().toLowerCase();
      const ingr = (Array.isArray(r.ingredients) ? r.ingredients.join(' ') : (r.ingredients || '')).toString().toLowerCase();
      return title.includes(s) || desc.includes(s) || ingr.includes(s);
    });
  }, [recipes, q]);

  useEffect(() => {
    if (!trieRef.current || !q.trim()) {
      setSuggestions([]);
      setOpenSuggestions(false);
      setActiveIndex(-1);
      return;
    }
    const prefix = q.trim();
    // small debounce
    const id = setTimeout(() => {
      try {
        const sug = trieRef.current.suggest(prefix, 8) || [];
        setSuggestions(sug);
        setOpenSuggestions(sug.length > 0);
        setActiveIndex(-1);
      } catch (e) {
        setSuggestions([]);
        setOpenSuggestions(false);
        setActiveIndex(-1);
      }
    }, 100);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    function onDoc(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setOpenSuggestions(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function handleInputChange(e) {
    setQ(e.target.value);
  }

  function handleKeyDown(e) {
    if (!openSuggestions) {
      if (e.key === 'ArrowDown' && suggestions.length) {
        setOpenSuggestions(true);
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setOpenSuggestions(false);
      setActiveIndex(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = (activeIndex >= 0 && suggestions[activeIndex]) ? suggestions[activeIndex] : q;
      chooseSuggestion(chosen);
    }
  }

  function chooseSuggestion(item) {
    if (!item) return;
    // set query to chosen suggestion and close dropdown
    setQ(item);
    setOpenSuggestions(false);
    setActiveIndex(-1);

    const id = titleToIdRef.current.get(item.toLowerCase());
    if (id) {
    
      navigate(`/recipe/${id}`);
      return;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Discover Recipes</h1>

          <div className="w-full max-w-md" ref={containerRef}>
            <label className="relative block">
              <input
                ref={inputRef}
                value={q}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Search recipes, ingredients, or description..."
                className="w-full pl-4 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-autocomplete="list"
                aria-expanded={openSuggestions}
                aria-haspopup="listbox"
              />
              {/* suggestions dropdown */}
              {openSuggestions && suggestions.length > 0 && (
                <ul
                  role="listbox"
                  aria-label="Suggestions"
                  className="absolute z-50 mt-1 left-0 right-0 bg-white border rounded shadow-lg max-h-64 overflow-auto"
                >
                  {suggestions.map((s, idx) => (
                    <li
                      key={s + idx}
                      role="option"
                      aria-selected={idx === activeIndex}
                      onMouseDown={(ev) => { ev.preventDefault(); chooseSuggestion(s); }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`px-4 py-2 cursor-pointer text-sm ${
                        idx === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-medium">{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </label>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          {loading ? 'Loading recipes…' : `${filtered.length} recipe${filtered.length !== 1 ? 's' : ''} found`}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filtered.map(r => (
            <RecipeCard key={r._id || r.id || r.slug || Math.random()} recipe={r} />
          ))}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="mt-8 text-center text-gray-500">No recipes match your search. Try another query.</div>
        )}
      </main>
    </div>
  );
}
