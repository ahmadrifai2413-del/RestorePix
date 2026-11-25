import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./Home";
import Studio from "./Studio";
import "./style.css";
import "./studio-v2.css";
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/studio" element={<Studio />} />
      <Route
        path="*"
        element={
          <main className="shell how">
            <h1>Page not found</h1>
            <Link to="/">Return to RestorePix</Link>
          </main>
        }
      />
    </Routes>
  </BrowserRouter>,
);
