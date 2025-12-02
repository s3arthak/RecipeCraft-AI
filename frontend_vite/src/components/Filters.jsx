import React from 'react';

export default function Filters({ onChange }){
  return (
    <div className="p-4 bg-white rounded shadow">
      <h4 className="font-semibold">Filters</h4>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select onChange={e=>onChange({ cuisine: e.target.value })} className="p-2 border rounded">
          <option value="">Any cuisine</option>
          <option>Italian</option>
          <option>Indian</option>
          <option>Mexican</option>
        </select>
        <select onChange={e=>onChange({ difficulty: e.target.value })} className="p-2 border rounded">
          <option value="">Any difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
    </div>
  );
}
