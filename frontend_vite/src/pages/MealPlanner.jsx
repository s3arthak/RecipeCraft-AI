// src/pages/MealPlanner.jsx
import React, { useEffect, useState } from 'react';
import api, { attachStoredToken } from '../api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Navbar from '../components/Navbar';
import { Link, useNavigate } from 'react-router-dom';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const uid = () => Math.random().toString(36).slice(2,9);
const DRAFT_KEY = 'mealplanner_draft_v1';

export default function MealPlanner() {
  const navigate = useNavigate();

  const [columns, setColumns] = useState(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const d of DAYS) parsed[d] = parsed[d] || [];
        return parsed;
      }
    } catch (e) { console.warn('failed to read draft', e); }
    const base = {};
    for (const d of DAYS) base[d] = [];
    return base;
  });

  const [recipes, setRecipes] = useState([]);
  const [planId, setPlanId] = useState(null);
  const [title, setTitle] = useState('My Weekly Plan');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/recipes');
        const list = (data.recipes || data || []).map(r => ({ id: String(r._id || r.id), title: r.title }));
        setRecipes(list);
      } catch (e) { console.error('load recipes', e); }
    })();
  }, []);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(columns)); } catch (e) { /* ignore */ }
  }, [columns]);

  const onDragEnd = result => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const srcId = source.droppableId;
    const dstId = destination.droppableId;
    const newCols = { ...columns };
    let itemData = null;
    if (srcId === 'POOL') {
      itemData = recipes.find(r => r.id === draggableId);
    } else {
      itemData = newCols[srcId].find(it => it.uid === draggableId);
    }
    if (!itemData) return;
    if (srcId !== 'POOL') newCols[srcId] = newCols[srcId].filter(it => it.uid !== draggableId);
    const entry = { uid: uid(), recipeId: itemData.id, title: itemData.title };
    newCols[dstId] = Array.from(newCols[dstId] || []);
    newCols[dstId].splice(destination.index, 0, entry);
    setColumns(newCols);
  };

  function removeEntry(day, uidToRemove) {
    setColumns(prev => ({ ...prev, [day]: prev[day].filter(it => it.uid !== uidToRemove) }));
  }

  async function confirmAndSave() {
    setSaveError(null);
    try {
      setSaving(true);

      
      try { attachStoredToken && attachStoredToken(); } catch (e) {
        console.warn('attachStoredToken failed', e);
      }

      const entries = [];
      for (const day of DAYS) {
        for (const e of columns[day]) {
          entries.push({ day, recipe: e.recipeId, notes: '' });
        }
      }

      const payload = { id: planId, title, entries };
      console.log('Saving meal plan — payload:', payload);

      const res = await api.post('/mealplans', payload);

      console.log('POST /api/mealplans response:', res);
      if (res && res.data) console.log('res.data:', res.data);

      const planObj = (res && res.data && (res.data.plan || res.data)) || null;
      const id = planObj?._id || planObj?.id || null;

      if (!planObj || !id) {
      
        const msg = planObj ? 'Server returned plan but no id.' : 'Server did not return a plan object.';
        console.error('Save result unexpected:', res && res.data ? res.data : res);
        setSaveError(msg);
        alert('Save failed: ' + msg + ' See console for details.');
        setSaving(false);
        return;
      }

      setPlanId(id);

      try {
        const newCols = {};
        for (const d of DAYS) newCols[d] = [];
        (planObj.entries || []).forEach(en => {
          const recipeObj = en.recipe || en.recipeId || en.recipeRef;
          const rid = (recipeObj && (recipeObj._id || recipeObj.id)) || String(en.recipe);
          const titleText = (recipeObj && recipeObj.title) || en.title || 'Recipe';
          newCols[en.day] = newCols[en.day] || [];
          newCols[en.day].push({ uid: uid(), recipeId: String(rid), title: titleText });
        });
        if (Object.values(newCols).some(arr => arr.length > 0)) {
          setColumns(newCols);
          try { localStorage.setItem(DRAFT_KEY, JSON.stringify(newCols)); } catch (e) {}
        }
      } catch (e) {
        console.warn('hydrate columns failed', e);
      }

      alert(`Meal plan saved successfully (id: ${id}). Redirecting to plan view...`);
      navigate(`/meal-planner/${id}`);
    } catch (err) {
      console.error('save plan error (caught):', err);
      let friendly = 'Unknown error while saving plan.';
      if (err.response) {
        console.error('Error response.data:', err.response.data);
        console.error('Error response.status:', err.response.status);
        friendly = `Server error ${err.response.status}: ${JSON.stringify(err.response.data)}`;
      } else if (err.request) {
        console.error('No response received. request:', err.request);
        friendly = 'No response from server (network error).';
      } else if (err.message) {
        friendly = err.message;
      }
      setSaveError(friendly);
      alert('Failed to save plan — ' + friendly);
    } finally {
      setSaving(false);
    }
  }

  function buildGroceryList() {
    const map = {};
    for (const day of DAYS) for (const e of columns[day]) {
      const k = (e.title || e.recipeId).toString();
      map[k] = (map[k] || 0) + 1;
    }
    return Object.keys(map).sort().map(k => `${k} (${map[k]})`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Weekly Meal Planner</h1>
          <div className="flex items-center gap-2">
            <input value={title} onChange={e => setTitle(e.target.value)} className="px-3 py-2 border rounded" />
            <button
              type="button"
              onClick={confirmAndSave}
              disabled={saving}
              className="px-3 py-2 bg-amber-500 text-white rounded disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save plan'}
            </button>
          </div>
        </div>

        {saveError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            <strong>Error saving plan:</strong> {typeof saveError === 'string' ? saveError : JSON.stringify(saveError)}
          </div>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="mt-6 grid grid-cols-4 gap-6">
            <div className="col-span-1">
              <h3 className="font-semibold mb-2">Recipes pool</h3>
              <div className="p-2 bg-white rounded shadow h-[60vh] overflow-auto">
                <Droppable droppableId="POOL">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {recipes.map((r, idx) => (
                        <Draggable key={r.id} draggableId={r.id} index={idx}>
                          {(p) => (
                            <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                              className="mb-2 p-2 border rounded cursor-move bg-white">
                              <div className="font-medium">{r.title}</div>
                              <div className="text-xs text-gray-500">Drag to a day</div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>

            <div className="col-span-3">
              <div className="grid grid-cols-3 gap-4">
                {DAYS.map(day => (
                  <div key={day}>
                    <h4 className="font-semibold mb-2">{day}</h4>
                    <Droppable droppableId={day}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[140px] p-3 bg-white rounded border">
                          {columns[day].map((entry, idx) => (
                            <Draggable key={entry.uid} draggableId={entry.uid} index={idx}>
                              {(p) => (
                                <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="p-2 mb-2 rounded border flex justify-between items-center">
                                  <Link to={`/recipe/${entry.recipeId}`} className="text-sm font-medium">{entry.title}</Link>
                                  <div className="flex gap-2">
                                    <button onClick={() => removeEntry(day, entry.uid)} className="text-xs text-red-500">Remove</button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-white rounded shadow">
                <h4 className="font-semibold mb-2">Grocery list (auto)</h4>
                {Object.values(columns).flat().length === 0 ? (
                  <div className="text-gray-500">Drag recipes into the days to build a grocery list.</div>
                ) : (
                  <ul className="list-disc pl-6">
                    {buildGroceryList().map((g, i) => (<li key={i}>{g}</li>))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </DragDropContext>
      </main>
    </div>
  );
}
