import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import RecipeView from './pages/RecipeView';
import MealPlanner from './pages/MealPlanner';
import PlanView from './pages/PlanView';

export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Landing/>} />
        <Route path='/dashboard' element={<Dashboard/>} />
        <Route path='/profile' element={<Profile/>} />
        <Route path='/recipe/:id' element={<RecipeView/>} />
        <Route path='/meal-planner' element={<MealPlanner/>} />
        <Route path='/meal-planner/:id' element={<PlanView/>} />
        <Route path='/my-plans' element={<PlanView/>} />
      </Routes>
    </BrowserRouter>
  );
}
