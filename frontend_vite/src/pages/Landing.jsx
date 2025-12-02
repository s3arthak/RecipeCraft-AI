// src/pages/Landing.jsx
import React from 'react';
import UploadBox from '../components/UploadBox';
import RecipeCard from '../components/RecipeCard';

export default function Landing(){

  const featured = [
  { 
    _id: '692a10ce9a4529d4341e5440', 
    title: 'Margherita Pizza', 
    cuisine: 'Italian', 
    difficulty: 'easy', 
    thumb: '/uploads/pizza.jpg' 
  },
  { 
    _id: '692a0f0c5d1e3de100f044a3', 
    title: 'Classic Veggie Burger', 
    cuisine: 'American', 
    difficulty: 'easy', 
    thumb: '/uploads/burger.jpg' 
  },
  { 
    _id: '692a0d7175ed64aac54e048c', 
    title: 'Aloo Parantha', 
    cuisine: 'Indian', 
    difficulty: 'easy', 
    thumb: '/uploads/parantha.jpg' 
  },
];


  return (
    <div className="min-h-screen">
      <section className="max-w-6xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* hero */}
          <div className="lg:col-span-8">
            <div className="hero hero-visual rounded-2xl">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="lg:w-2/3">
                  <div className="kicker">Smart recipe • powered by vision + AI</div>
                  <h1 className="h-hero">Healthy recipes from photos & receipts</h1>
                  <p className="h-sub">Upload any food photo or receipt, we’ll turn it into a healthy recipe with nutrition details and a ready-to-use shopping list</p>

                  <div className="mt-6 flex gap-3">
                    <a href="#try" className="btn btn-primary">Try it now</a>
                    <a href="/dashboard" className="btn btn-ghost">Browse recipes</a>
                  </div>
                </div>

                <div className="lg:w-1/3">
                  <div className="cta-panel fade-in">
                    <div className="text-sm text-slate-600">Quick generate</div>
                    <div className="mt-3">
                      <UploadBox compact />
                    </div>
                    <div className="mt-4 text-xs text-slate-500">Tip: Upload a pizza photo and get a healthier pizza recipe.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* features */}
            <div className="feature-grid mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
  <div className="feature p-4 bg-white rounded-lg shadow-sm border">
    <div className="kicker text-sm text-amber-600">Vision + LLM</div>
    <h3 className="mt-2 font-semibold">Image → Recipe</h3>
    <p className="mt-2 text-sm text-slate-600">
      Upload a photo and our multimodal LLM will infer the dish and return a
      structured recipe (ingredients, steps, nutrition, thumbnail).
    </p>
  </div>

  <div className="feature p-4 bg-white rounded-lg shadow-sm border">
    <div className="kicker text-sm text-amber-600">Voice</div>
    <h3 className="mt-2 font-semibold">Audio Assistant (English)</h3>
    <p className="mt-2 text-sm text-slate-600">
      Hands-free cooking with spoken instructions. Choose English or Hindi
      audio output (UI text remains in English). Includes commands like
      “Next step”, “Repeat”, and “Set timer”.
    </p>
  </div>
  <div className="feature p-4 bg-white rounded-lg shadow-sm border">
    <div className="kicker text-sm text-amber-600">Planner</div>
    <h3 className="mt-2 font-semibold">Weekly meal plans & pantry sync</h3>
    <p className="mt-2 text-sm text-slate-600">
      Auto-generate weekly meal plans, factor in user diet preferences and
      pantry items, and instantly produce a smart shopping list for missing ingredients.
    </p>
  </div>
</div>

          </div>

          {/* right column: featured recipes */}
          <aside className="lg:col-span-4">
            <div className="space-y-4">
              <div className="card">
                <h4 className="font-semibold">Featured Recipes</h4>
                <div className="mt-3 space-y-3">
                  {featured.map(r => <RecipeCard key={r._id} recipe={r} />)}
                </div>
              </div>

              <div className="card">
                <h4 className="font-semibold">Filters</h4>
                <div className="mt-3 text-sm text-blue">Cuisine • Time • Diet • Calories</div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
