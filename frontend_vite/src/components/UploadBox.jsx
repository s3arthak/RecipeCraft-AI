
import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function UploadBox({ compact = false }) {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [dish, setDish] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (file?.preview) {
        try { URL.revokeObjectURL(file.preview); } catch (e) {}
      }
    };
  }, []);

  function safeRevoke(f) {
    try {
      if (f?.preview) URL.revokeObjectURL(f.preview);
    } catch (e) {}
  }

  function onFiles(list) {
    const f = list?.[0];
    if (!f) return;
    safeRevoke(file);
    try {
      const preview = URL.createObjectURL(f);
      setFile(Object.assign(f, { preview }));
    } catch (e) {
      setFile(f);
    }
  }

  function onKeyPress(e) {
    if (e.key === "Enter" || e.key === " " || e.code === "Space") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  async function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!file && !dish) {
      return alert("Upload an image or type a dish name");
    }

    setLoading(true);
    setProgress(10);

    try {
      const token = localStorage.getItem("sgr_token");
      if (file) {
        const form = new FormData();
        form.append("image", file, file.name);
        if (process.env.NODE_ENV !== "production") {
          for (const pair of form.entries()) {
            console.log("FormData entry:", pair[0], pair[1]);
          }
        }
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await api.post("/upload/image", form, {
          headers,
          onUploadProgress: (ev) => {
            if (!ev.total) return;
            const pct = Math.round((ev.loaded / ev.total) * 80) + 10;
            setProgress(pct);
          },
        });

        setProgress(100);
        safeRevoke(file);
        setFile(null);

        console.log("Upload response:", res?.data);
        const recipe = res?.data?.recipe || res?.data;
        if (recipe && recipe._id) {
          setTimeout(() => navigate(`/recipe/${recipe._id}`), 200);
          return;
        }
        alert(res?.data?.message || "Upload succeeded but no recipe generated.");
        return;
      }
      
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      setProgress(20);
      const res = await api.post("/recipes/generate", { dish, options: {} }, { headers });
      setProgress(100);

      const recipe = res?.data?.recipe || res?.data;
      if (recipe && recipe._id) {
        setTimeout(() => navigate(`/recipe/${recipe._id}`), 200);
        return;
      }
      alert("Recipe generated but could not navigate.");
    } catch (err) {
      console.error("UploadBox submit error full:", err);
      if (err?.response) {
        console.error("Server response:", err.response.data);
      }
      const serverMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
      alert("Failed to upload/generate: " + (serverMsg || "Unknown error"));
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 600);
    }
  }

  return (
    <form onSubmit={submit} className="w-full" aria-busy={loading}>
      <div
        className={`dropzone ${drag ? "dragover" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={onKeyPress}
        role="button"
        tabIndex={0}
        style={{ cursor: "pointer", borderRadius: 8, background: "#fff", border: "1px dashed #e6e6e6", padding: 16 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => onFiles(e.target.files)}
        />

        {!file ? (
          <div className="py-4 text-center">
            <div className="kicker">Upload photo or receipt</div>
            <div className="mt-2 text-sm text-slate-600">Drop an image here or click to browse</div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button type="button" onClick={(ev) => { ev.stopPropagation(); inputRef.current?.click(); }} className="btn btn-primary">Choose file</button>
              <div className="text-sm text-slate-500">or type dish name below</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            {file.preview ? <img src={file.preview} alt="preview" style={{ maxWidth: "100%", borderRadius: 8 }} /> : <div className="text-sm">File ready: {file.name}</div>}
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-700 truncate" style={{ maxWidth: "70%" }}>{file.name}</div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost" onClick={(ev) => { ev.stopPropagation(); inputRef.current?.click(); }}>Replace</button>
                <button type="button" className="btn btn-ghost" onClick={(ev) => { ev.stopPropagation(); safeRevoke(file); setFile(null); }}>Remove</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3">
        <input placeholder="Or type a dish name (e.g. pizza)" value={dish} onChange={(e) => setDish(e.target.value)} className="input w-full" />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Working..." : (compact ? "Go" : "Generate recipe")}</button>
        <button type="button" className="btn btn-ghost" onClick={() => { safeRevoke(file); setFile(null); setDish(""); }} disabled={loading}>Clear</button>
        <div style={{ flex: 1 }} />
        {progress > 0 && (
          <div className="w-36 bg-slate-100 rounded overflow-hidden">
            <div style={{ width: `${progress}%` }} className="h-2 bg-[var(--primary)] transition-all" />
          </div>
        )}
      </div>
    </form>
  );
}
