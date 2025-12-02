// src/pages/RecipeView.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api, { attachStoredToken } from "../api";

/*
  Speaker-only RecipeView
  - All microphone / speech-recognition removed.
  - Keeps SpeechSynthesis (device audio) to read steps & ingredients.
  - Prev / Next / Repeat buttons + optional auto-read.
*/

function extractJsonBlock(text) {
  if (!text || typeof text !== "string") return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const curly = text.match(/\{[\s\S]*\}/);
  if (curly) return curly[0];
  return null;
}

function tryParseLooseJson(s) {
  if (!s || typeof s !== "string") return null;
  try {
    return JSON.parse(s);
  } catch (e) {
    const san = s
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/([{,]\s*)([A-Za-z0-9_\$\-]+)\s*:/g, '$1"$2":');
    try {
      return JSON.parse(san);
    } catch {
      try {
        // final fallback — keep isolated and safe
        // eslint-disable-next-line no-eval
        return eval("(" + s + ")");
      } catch {
        return null;
      }
    }
  }
}

function tryParseElement(el) {
  if (typeof el !== "string") return el;
  const trimmed = el.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    const parsed = tryParseLooseJson(trimmed);
    if (parsed !== null) return parsed;
  }
  const block = extractJsonBlock(trimmed);
  if (block) {
    const parsed = tryParseLooseJson(block);
    if (parsed !== null) return parsed;
  }
  return el;
}

function ingredientToString(ing) {
  if (!ing && ing !== 0) return "";
  if (typeof ing === "string") return ing;
  if (typeof ing === "object") {
    const name = (ing.item || ing.name || ing.ingredient || ing.title || "").toString();
    const qty = (ing.quantity || ing.qty || "").toString();
    const unit = (ing.unit || ing.u || "").toString();
    const notes = (ing.notes || ing.note || ing.detail || "").toString();
    const parts = [];
    if (qty) parts.push(qty);
    if (unit) parts.push(unit);
    if (name) parts.push(name);
    let base = parts.join(" ").trim() || name || "";
    if (notes) base = base ? `${base} — ${notes}` : notes;
    return base || JSON.stringify(ing);
  }
  return String(ing);
}

function stepToString(s) {
  if (!s && s !== 0) return "";
  if (typeof s === "string") return s;
  if (typeof s === "object") {
    return (s.instruction || s.text || s.step || s.description || JSON.stringify(s)).toString();
  }
  return String(s);
}

function normalizeRecipe(raw) {
  const r = { ...(raw || {}) };

  if (Array.isArray(r.steps) && r.steps.length === 1 && typeof r.steps[0] === "string") {
    const candidate = extractJsonBlock(r.steps[0]);
    if (candidate) {
      const parsed = tryParseLooseJson(candidate);
      if (parsed) {
        r.ingredients = parsed.ingredients ?? r.ingredients;
        r.steps = parsed.steps ?? r.steps;
        r.nutrition = parsed.nutrition ?? r.nutrition;
        r.title = parsed.title ?? r.title;
      }
    }
  }

  if (Array.isArray(r.ingredients)) {
    let out = [];
    for (const it of r.ingredients) {
      const parsed = tryParseElement(it);
      if (Array.isArray(parsed)) out.push(...parsed.map((p) => ingredientToString(p)));
      else out.push(ingredientToString(parsed));
    }
    r.ingredients = out.filter(Boolean);
  } else if (typeof r.ingredients === "string") {
    const parsed = tryParseElement(r.ingredients);
    if (Array.isArray(parsed)) r.ingredients = parsed.map((i) => ingredientToString(i));
    else r.ingredients = r.ingredients.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  } else r.ingredients = [];

  if (Array.isArray(r.steps)) {
    let out = [];
    for (const s of r.steps) {
      const parsed = tryParseElement(s);
      if (Array.isArray(parsed)) out.push(...parsed.map((p) => stepToString(p)));
      else out.push(stepToString(parsed));
    }
    r.steps = out.filter(Boolean);
  } else if (typeof r.steps === "string") {
    const parsed = tryParseElement(r.steps);
    if (Array.isArray(parsed)) r.steps = parsed.map((s) => stepToString(s));
    else {
      const paras = r.steps.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      r.steps = paras.length > 1 ? paras : r.steps.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    }
  } else r.steps = [];

  r.nutrition = r.nutrition || {};
  ["calories", "protein", "carbs", "fat"].forEach((k) => {
    const v = r.nutrition[k];
    if (v === null || typeof v === "undefined") r.nutrition[k] = null;
    else if (typeof v === "number") r.nutrition[k] = v;
    else if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^\d.-]/g, ""));
      r.nutrition[k] = Number.isFinite(n) ? n : null;
    } else r.nutrition[k] = null;
  });

  return r;
}

function resolveThumb(thumb) {
  const placeholder = "/hero-food.jpg";
  if (!thumb) return placeholder;
  if (/^https?:\/\//i.test(thumb)) return thumb;
  const raw = import.meta.env.VITE_API_URL || "/api";
  const base = raw.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  return `${base}${thumb.startsWith("/") ? thumb : "/" + thumb}`;
}

export default function RecipeView() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Speaker-only state (no microphone input)
  const [speaking, setSpeaking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoRead, setAutoRead] = useState(false);
  const utterRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await api.get(`/recipes/${id}`);
        if (!mounted) return;
        setRaw(res.data);
        const normalized = normalizeRecipe(res.data || {});
        setRecipe(normalized);
      } catch (err) {
        console.error("Recipe load error:", err);
        setRecipe(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    (async () => {
      try {
        const token = localStorage.getItem("sgr_token");
        if (!token) return;
        attachStoredToken();
        const favRes = await api.get("/user/favorites");
        const favs = favRes?.data?.favorites || [];
        if (!Array.isArray(favs)) return;
        const found = favs.some((f) => (f._id || f.id || f).toString() === id.toString());
        setSaved(found);
      } catch (e) {}
    })();

    return () => {
      mounted = false;
      stopSpeaking();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!recipe) return <div className="p-8 text-center text-red-500">Recipe not found</div>;

  const img = resolveThumb(recipe.thumb || recipe.imageUrl || recipe.image || (recipe.url && recipe.url.startsWith("/uploads") ? recipe.url : null));

  async function handleToggleFavorite() {
    try {
      setSaving(true);
      attachStoredToken();
      const res = await api.post("/user/favorite", { recipeId: raw && raw._id ? raw._id : id });
      const added = res?.data?.added;
      setSaved(!!added);
    } catch (err) {
      console.error("Save favorite error", err?.response || err);
      alert("Failed to save favorite — please sign in and try again.");
    } finally {
      setSaving(false);
    }
  }

  function speak(text, { interrupt = true } = {}) {
    if (!text) return;
    if (!("speechSynthesis" in window)) return;
    if (interrupt) {
      window.speechSynthesis.cancel();
      if (utterRef.current) utterRef.current.onend = null;
      utterRef.current = null;
      setSpeaking(false);
    }
    const u = new SpeechSynthesisUtterance(text);
    u.onstart = () => setSpeaking(true);
    u.onend = () => {
      setSpeaking(false);
      if (autoRead) {
        setCurrentStep((s) => {
          const next = Math.min((recipe.steps || []).length - 1, s + 1);
          if (next !== s) {
            timerRef.current = setTimeout(() => {
              const stepText = recipe.steps[next];
              speak(`Step ${next + 1}. ${stepText}`);
            }, 450);
          } else {
            setAutoRead(false);
          }
          return next;
        });
      }
    };
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    if (utterRef.current) {
      try {
        utterRef.current.onend = null;
      } catch (e) {}
      utterRef.current = null;
    }
    setSpeaking(false);
  }

  function readCurrentStep() {
    if (!recipe.steps || recipe.steps.length === 0) {
      speak("No steps available for this recipe.");
      return;
    }
    const step = recipe.steps[currentStep];
    speak(`Step ${currentStep + 1}. ${step}`);
  }

  function nextStep() {
    if (!recipe.steps || recipe.steps.length === 0) return;
    setCurrentStep((s) => {
      const n = Math.min(recipe.steps.length - 1, s + 1);
      setTimeout(() => {
        const step = recipe.steps[n];
        speak(`Step ${n + 1}. ${step}`);
      }, 120);
      return n;
    });
  }

  function prevStep() {
    if (!recipe.steps || recipe.steps.length === 0) return;
    setCurrentStep((s) => {
      const n = Math.max(0, s - 1);
      setTimeout(() => {
        const step = recipe.steps[n];
        speak(`Step ${n + 1}. ${step}`);
      }, 120);
      return n;
    });
  }

  function repeatStep() {
    readCurrentStep();
  }
  
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold text-white">{recipe.title || "Recipe"}</h1>
          <p className="text-gray-500 mt-2">
            Prep: {recipe.prepTimeMin ?? "—"} min • Cook: {recipe.cookTimeMin ?? "—"} min • Serves: {recipe.servings ??
              "—"}
          </p>
        </div>

        {img && (
          <div className="w-56 h-40 rounded-lg overflow-hidden shadow-md flex-shrink-0">
            <img src={img} alt={recipe.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/hero-food.jpg"; }} />
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={() => readCurrentStep()} className="px-4 py-2 rounded-md font-semibold bg-blue-600 hover:bg-blue-700 text-white">
          Read current step
        </button>

        <button onClick={prevStep} className="px-3 py-2 rounded-md border bg-white text-gray-700">Prev</button>
        <button onClick={nextStep} className="px-3 py-2 rounded-md border bg-white text-gray-700">Next</button>
        <button onClick={repeatStep} className="px-3 py-2 rounded-md border bg-white text-gray-700">Repeat</button>
        <div className="ml-auto text-sm text-gray-300">{speaking ? "Speaking..." : ""}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">Ingredients</h2>
            <ul className="bg-white p-4 rounded-lg shadow-sm border space-y-2">
              {Array.isArray(recipe.ingredients) && recipe.ingredients.length ? (
                recipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-gray-800 flex items-start gap-3">
                    <div className="w-6 shrink-0 mt-1 text-amber-600 font-bold">{i + 1}.</div>
                    <div>{ing}</div>
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No ingredients provided.</li>
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Steps</h2>
            <div className="space-y-4">
              {Array.isArray(recipe.steps) && recipe.steps.length ? (
                recipe.steps.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      transition: "transform 220ms ease, box-shadow 220ms ease, opacity 300ms ease",
                      transform: currentStep === i ? "translateY(-4px)" : "translateY(0)",
                      boxShadow: currentStep === i ? "0 8px 24px rgba(0,0,0,0.15)" : undefined,
                      opacity: 1,
                    }}
                    className={`flex gap-4 p-5 rounded-lg ${currentStep === i ? "bg-amber-50" : "bg-white"} border`}
                    onClick={() => setCurrentStep(i)}
                  >
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-bold text-lg shadow-sm flex-shrink-0">{i + 1}</div>
                    <div className="text-gray-700 prose max-w-none">{s}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400">No steps provided.</div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Nutrition</h3>
            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between"><span>Calories</span><span>{recipe.nutrition?.calories ?? "—"}</span></div>
              <div className="flex justify-between"><span>Protein</span><span>{recipe.nutrition?.protein ? `${recipe.nutrition.protein} g` : "—"}</span></div>
              <div className="flex justify-between"><span>Carbs</span><span>{recipe.nutrition?.carbs ? `${recipe.nutrition.carbs} g` : "—"}</span></div>
              <div className="flex justify-between"><span>Fat</span><span>{recipe.nutrition?.fat ? `${recipe.nutrition.fat} g` : "—"}</span></div>
            </div>

            <button onClick={handleToggleFavorite} disabled={saving} className={`mt-4 w-full py-2 rounded-md ${saved ? "bg-slate-400" : "bg-green-500 hover:bg-green-600"} text-white transition`}>
              {saving ? "Saving..." : saved ? "Saved" : "Save to Favorites"}
            </button>
          </div>
        </aside>
      </div>

      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
