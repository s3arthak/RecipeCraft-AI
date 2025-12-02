import React from 'react';
import { useNavigate } from 'react-router-dom';

function resolveThumb(thumb) {

  const placeholder = '/hero-food.jpg';
  if (!thumb) return placeholder;

  if (/^https?:\/\//i.test(thumb)) return thumb;

  const raw = import.meta.env.VITE_API_URL || '/api';
  const base = raw.replace(/\/api\/?$/, '').replace(/\/+$/, '');

  const t = thumb.startsWith('/') ? thumb : '/' + thumb;

  if (base === '') return t;
  return `${base}${t}`;
}

function ImageWithFallback({ src, alt, className, style }) {
  const placeholder = '/hero-food.jpg';
  const [s, setS] = React.useState(src || placeholder);

  React.useEffect(() => {
    setS(src || placeholder);
  }, [src]);

  return (
    <img
      src={s}
      alt={alt || ''}
      className={className}
      style={style}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (s !== placeholder) setS(placeholder);
      }}
    />
  );
}

export default function RecipeCard({ recipe }) {
  const navigate = useNavigate();

  const openRecipe = (id) => {
    if (!id) return;
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      navigate(`/recipe/${id}`);
    } else {
      navigate('/recipes');
    }
  };

  const thumbSrc = resolveThumb(recipe?.thumb);

  return (
    <div
      onClick={() => openRecipe(recipe?._id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') openRecipe(recipe?._id); }}
      className="flex gap-4 items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition cursor-pointer"
      style={{ minHeight: 84 }}
    >
      <div className="w-24 h-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
        <ImageWithFallback src={thumbSrc} alt={recipe?.title} className="w-full h-full object-cover" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-lg leading-tight text-ellipsis overflow-hidden whitespace-nowrap max-w-[60%]">
            {recipe?.title || 'Recipe'}
          </h3>
          <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{(recipe?.prepTimeMin ? `${recipe.prepTimeMin}m` : '30m')}</div>
        </div>

        <div className="text-sm text-slate-500 mt-1 truncate">
          {recipe?.cuisine ? `${recipe.cuisine} • ` : ''}{recipe?.difficulty || 'easy'}
        </div>

        <p className="mt-2 text-sm text-slate-600 line-clamp-2">
          {recipe?.description || recipe?.summary || 'A tasty, healthier take on a classic — quick to make and full of flavor.'}
        </p>
      </div>
    </div>
  );
}
