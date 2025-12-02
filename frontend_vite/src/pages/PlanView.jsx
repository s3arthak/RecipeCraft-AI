// src/pages/PlanView.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { attachStoredToken } from '../api';
import Navbar from '../components/Navbar';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function PlanView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [plan, setPlan] = useState(null);

  const [plans, setPlans] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadSinglePlan(planId) {
      setLoading(true);
      setError(null);
      try {
        try { attachStoredToken && attachStoredToken(); } catch (e) {}
        const res = await api.get(`/mealplans/${planId}`);
        if (!mounted) return;
        setPlan(res.data.plan || res.data);
      } catch (err) {
        console.error('load plan', err);
        setError('Failed to load plan');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function loadPlanList() {
      setLoading(true);
      setError(null);
      try {
        try { attachStoredToken && attachStoredToken(); } catch (e) {}
        const res = await api.get('/mealplans'); 
        if (!mounted) return;
        const data = res.data.plans || res.data || [];
        setPlans(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('load plans', err);
        setError('Failed to load plans');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (id) loadSinglePlan(id);
    else loadPlanList();

    return () => { mounted = false; };
  }, [id]);


  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">My Meal Plans</h1>
            <button onClick={() => navigate('/meal-planner')} className="px-3 py-2 bg-amber-500 text-white rounded">Create plan</button>
          </div>

          {(!plans || plans.length === 0) ? (
            <div className="text-gray-500">You don't have any saved plans yet.</div>
          ) : (
            <div className="grid gap-3">
              {plans.map(p => (
                <div key={p._id || p.id} className="p-4 bg-white rounded shadow flex items-center justify-between">
                  <div>
                    <Link to={`/meal-planner/${p._id || p.id}`} className="font-medium hover:underline">{p.title || 'Untitled plan'}</Link>
                    <div className="text-sm text-gray-500">Saved {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/meal-planner/${p._id || p.id}`} className="px-3 py-1 border rounded text-sm">View</Link>
                    <Link to={`/meal-planner/edit/${p._id || p.id}`} className="px-3 py-1 bg-amber-500 text-white rounded text-sm">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }


  if (!plan) {
    return <div className="p-8 text-center text-red-500">Plan not found</div>;
  }

  // group entries by day
  const grouped = {};
  for (const d of DAYS) grouped[d] = [];
  (plan.entries || []).forEach(e => {
    grouped[e.day] = grouped[e.day] || [];
    grouped[e.day].push(e);
  });

  // create grocery list
  const groceryMap = {};
  for (const e of plan.entries || []) {
    const rec = e.recipe;
    if (!rec) continue;
    const ingreds = rec.ingredients || [];
    for (const it of ingreds) {
      const key = (typeof it === 'string' ? it : JSON.stringify(it)).toLowerCase().trim();
      groceryMap[key] = (groceryMap[key] || 0) + 1;
    }
  }
  const groceries = Object.keys(groceryMap).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{plan.title || 'Meal Plan'}</h1>
          <div className="flex gap-2">
            <button onClick={() => navigate('/meal-planner')} className="px-3 py-2 border rounded">Back</button>
            <Link to={`/meal-planner/edit/${plan._id || plan.id}`} className="px-3 py-2 bg-amber-500 text-white rounded">Edit</Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          {DAYS.map(day => (
            <div key={day} className="bg-white p-4 rounded border min-h-[140px]">
              <div className="font-semibold mb-2">{day}</div>
              {(grouped[day] || []).length === 0 ? (
                <div className="text-gray-400">—</div>
              ) : (
                (grouped[day] || []).map((e, i) => (
                  <div key={i} className="mb-2">
                    {e.recipe ? (
                      <Link to={`/recipe/${e.recipe._id || e.recipe.id || e.recipe}`} className="font-medium hover:underline">
                        {e.recipe.title || e.recipe}
                      </Link>
                    ) : (
                      <span className="font-medium">{e.title || 'Recipe'}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Grocery list</h3>
          {groceries.length === 0 ? (
            <div className="text-gray-400">No groceries found.</div>
          ) : (
            <ul className="list-disc pl-6">
              {groceries.map((g, i) => (<li key={i}>{g}</li>))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
