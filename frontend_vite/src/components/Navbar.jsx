// src/components/Navbar.jsx
import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import GoogleSignIn from "./GoogleSignIn";
import { setAuthToken } from "../api";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("sgr_token");
    if (token) {
      setAuthToken(token);
      const stored = localStorage.getItem("sgr_user");
      if (stored) setUser(JSON.parse(stored));
    }
  }, []);

  // lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  function handleLogin(userObj) {
    setUser(userObj);
    if (userObj) localStorage.setItem("sgr_user", JSON.stringify(userObj));
  }

  function logout() {
    localStorage.removeItem("sgr_token");
    localStorage.removeItem("sgr_user");
    setUser(null);
    window.location = "/";
  }

  function handleNavClick() {
    setOpen(false);
  }

  return (
    <header className="nav no-print">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* LEFT SECTION */}
        <div className="flex items-center gap-6">
          <Link to="/" className="brand">SmartRecipe</Link>

          <nav className="hidden md:flex items-center gap-4 text-sm text-slate-700">
            <NavLink to="/" className={({ isActive }) =>
              isActive ? "text-slate-900 font-semibold" : "hover:text-slate-900"}>
              Home
            </NavLink>

            <NavLink to="/dashboard" className={({ isActive }) =>
              isActive ? "text-slate-900 font-semibold" : "hover:text-slate-900"}>
              Dashboard
            </NavLink>

            <NavLink to="/profile" className={({ isActive }) =>
              isActive ? "text-slate-900 font-semibold" : "hover:text-slate-900"}>
              Profile
            </NavLink>
            <NavLink to="/meal-planner" className={({ isActive }) =>
              isActive ? "text-slate-900 font-semibold" : "hover:text-slate-900"}>
              Meal Planner
            </NavLink>
            <NavLink to="/my-plans" className={({ isActive }) =>
              isActive ? "text-slate-900 font-semibold" : "hover:text-slate-900"}>
              My Plans
            </NavLink>
          </nav>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-3">
          {!user ? (
            <div className="hidden sm:block">
              <GoogleSignIn onLogin={handleLogin} />
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-900 font-bold">
                {(user.username || user.email || "U")[0].toUpperCase()}
              </div>
              <div className="hidden md:block text-sm text-slate-700">
                {user.username || user.email}
              </div>
              <button onClick={logout} className="btn btn-ghost ml-2">
                Logout
              </button>
            </div>
          )}

        
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
            className="p-2 rounded-md md:hidden focus:outline-none focus:ring-2"
          >
            {open ? (
              <svg className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      
      <div className={`mobile-drawer fixed inset-0 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
     
        <div
          className={`drawer-overlay absolute inset-0 ${open ? "opacity-100" : "opacity-0"} transition-opacity`}
          onClick={() => setOpen(false)}
          style={{ background: "rgba(0,0,0,0.35)" }}
        />
        <aside
          className={`drawer-panel absolute right-0 top-0 bottom-0 w-80 max-w-full p-5 transform ${open ? "translate-x-0" : "translate-x-full"} transition-transform`}
          role="dialog"
          aria-modal="true"
          style={{ background: "#f8fafc", color: "#0f172a" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="text-xl font-semibold" style={{ color: "#0f172a" }}>Menu</div>
            <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2 rounded-md">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#0f172a" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col gap-3">
            <NavLink onClick={handleNavClick} to="/" className={({ isActive }) =>
              isActive ? "px-3 py-2 rounded-md bg-slate-100 text-slate-900 font-semibold" : "px-3 py-2 rounded-md hover:bg-slate-50 text-slate-900"}>
              Home
            </NavLink>

            <NavLink onClick={handleNavClick} to="/dashboard" className={({ isActive }) =>
              isActive ? "px-3 py-2 rounded-md bg-slate-100 text-slate-900 font-semibold" : "px-3 py-2 rounded-md hover:bg-slate-50 text-slate-900"}>
              Dashboard
            </NavLink>
            

            <NavLink onClick={handleNavClick} to="/profile" className={({ isActive }) =>
              isActive ? "px-3 py-2 rounded-md bg-slate-100 text-slate-900 font-semibold" : "px-3 py-2 rounded-md hover:bg-slate-50 text-slate-900"}>
              Profile
            </NavLink>
            <NavLink onClick={handleNavClick} to="/meal-planner" className={({ isActive }) =>
              isActive ? "px-3 py-2 rounded-md bg-slate-100 text-slate-900 font-semibold" : "px-3 py-2 rounded-md hover:bg-slate-50 text-slate-900"}>
              Meal Planner
            </NavLink>

             <NavLink onClick={handleNavClick} to="/my-plans" className={({ isActive }) =>
              isActive ? "px-3 py-2 rounded-md bg-slate-100 text-slate-900 font-semibold" : "px-3 py-2 rounded-md hover:bg-slate-50 text-slate-900"}>
              My Plans
            </NavLink>

            <div className="border-t border-slate-200 my-4" />
            {!user ? (
              <div className="px-1">
                <GoogleSignIn onLogin={(u) => { handleLogin(u); setOpen(false); }} />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
               
                <div className="font-semibold text-slate-900">{user.username || user.email}</div>
                <button onClick={() => { logout(); setOpen(false); }} className="mt-1 bg-red-500 px-3 py-2 rounded-md text-white font-semibold hover:bg-red-600 w-max">
                  Logout
                </button>
              </div>
            )}
          </nav>
        </aside>
      </div>
    </header>
  );
}
