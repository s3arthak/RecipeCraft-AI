
import React, { useEffect, useState } from 'react';
import api, { attachStoredToken } from '../api';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export function resolveThumb(thumb) {
  const placeholderFrontend = '/hero-food.jpg'; 
  if (!thumb) return placeholderFrontend;

  if (/^https?:\/\//i.test(thumb)) return thumb;

  const raw = import.meta.env.VITE_API_URL || '/api';
  const base = raw.replace(/\/api\/?$/, '').replace(/\/+$/, ''); // -> http://localhost:4000
 
  return `${base}${thumb.startsWith('/') ? thumb : '/' + thumb}`;
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(new Set());
  const [debug, setDebug] = useState({ meStatus: null, meResp: null });

  useEffect(() => {
    const token = attachStoredToken();
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        const meRes = await api.get('/auth/me');
        if (!mounted) return;
        const userObj = meRes?.data?.user ?? meRes?.data;
        setUser(userObj);
        setDebug(d => ({ ...d, meStatus: meRes.status || 200, meResp: meRes.data }));
      } catch (err) {
        console.warn('GET /api/auth/me failed', err?.response || err);
        try {
          const storedToken = localStorage.getItem('sgr_token');
          if (storedToken) {
            const payload = decodeJwt(storedToken);
            if (payload) {
              setUser({
                username: payload.username || payload.name || payload.sub || 'User',
                email: payload.email || '',
                avatar: payload.avatar || null
              });
            }
          }
        } catch (e) {
          // ignore
        }
      }
      try {
        const favRes = await api.get('/user/favorites');
        if (!mounted) return;
        setFavorites(favRes?.data?.favorites ?? []);
      } catch (err) {
        console.warn('GET /api/user/favorites failed', err?.response || err);
        setFavorites([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, []);


  async function removeFavorite(recipeId) {
    if (!recipeId) return;
  
    setRemoving(prev => new Set(prev).add(String(recipeId)));
   
    const prevFavorites = [...favorites];
    setFavorites(prevFavorites.filter(f => (f._id || f.id || f).toString() !== recipeId.toString()));

    try {
      const res = await api.post('/user/favorite', { recipeId });
     
      if (!res || !res.data) {
        throw new Error('Unexpected response from server');
      }
    
    } catch (err) {
      console.error('Failed to remove favorite', err?.response || err);
   
      setFavorites(prevFavorites);
      const serverMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed';
      alert(`Could not remove favorite: ${serverMsg}`);
    } finally {
      
      setRemoving(prevSet => {
        const s = new Set(prevSet);
        s.delete(String(recipeId));
        return s;
      });
    }
  }


  function MiniSpinner() {
    return (
      <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
    );
  }

  
  const initials = (() => {
    const name = user?.username || user?.name || user?.email || 'U';
    return String(name).trim().charAt(0).toUpperCase() || 'U';
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6">
        {loading ? (
          <div className="text-center text-gray-500 p-8">Loading profile…</div>
        ) : !user ? (
          <div className="text-center p-8">
            <div className="mb-3">Please sign in to view your profile.</div>
            <Link to="/" className="btn btn-primary">Go home</Link>
          </div>
        ) : (
          <>
          
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-white text-2xl font-semibold">
                {initials}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{user.username || user.name || 'User'}</h2>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </div>

            {/* Favorites */}
            <section className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Favorites</h3>
                <div className="text-sm text-gray-500">{favorites.length} saved</div>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favorites.length === 0 && (
                  <div className="text-gray-400">You haven’t added any favorites yet.</div>
                )}

                {favorites.map(f => {
                  const id = (f._id || f.id || f).toString();
                  const title = f.title || 'View recipe';
                  const thumb = f.thumb || null;
                  const isRemoving = removing.has(id);

                  return (
                    <div key={id} className="p-4 bg-white rounded shadow flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                          <img
                            src={resolveThumb(thumb)}
                            alt={title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = '/hero-food.jpg'; }}
                          />
                        </div>
                        <div>
                          <Link to={`/recipe/${id}`} className="font-medium hover:underline">{title}</Link>
                          <div className="text-xs text-gray-500 mt-1">{f.cuisine ? `${f.cuisine} • ${f.difficulty || 'easy'}` : ''}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link to={`/recipe/${id}`} className="btn btn-ghost">View</Link>

                        <button
                          onClick={() => {
                            if (isRemoving) return;
                            // confirm removal
                            if (!window.confirm('Remove this recipe from favorites?')) return;
                            removeFavorite(id);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-sm"
                          disabled={isRemoving}
                          aria-disabled={isRemoving}
                        >
                          {isRemoving ? <MiniSpinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>}
                          <span className="text-sm text-red-600">{isRemoving ? 'Removing' : 'Remove'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
