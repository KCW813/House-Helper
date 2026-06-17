
import { useState, useEffect } from "react";

// ─── Default household profile ────────────────────────────────────────────────
const DEFAULT_PROFILE = {
  familyName: "Our Family",
  members: "Husband, two college-age boys home for summer",
  housekeeperName: "Yuri",
  housekeeperDays: ["Monday", "Thursday"],
  standardTasks: "Laundry, vacuuming, mopping kitchen/bathrooms, clean bathrooms, prep meals for the week",
  extraNotes: "Boys tend to leave dishes in their rooms. Summer means more outdoor entertaining.",
  // Food preferences — now structured
  likes: "Hearty portions, Italian food, grilled meats, Mexican food, comfort food, pasta",
  dislikes: "Shellfish, overly spicy food, liver or organ meats",
  dietary: "No shellfish allergy. Husband prefers lighter dinners. Boys eat large portions.",
  mealHistory: "Chicken stir-fry (last Mon), Spaghetti bolognese (last Thu)"
};

// ─── Default recipe box — families add their own favorites here ───────────────
const DEFAULT_RECIPES = [
  { id: "r1", name: "Lemon Herb Roasted Chicken", category: "Poultry", prepTime: "20 min", cookTime: "1 hr 15 min", notes: "Family favorite. Serve with roasted potatoes and green beans.", ingredients: "Whole chicken, lemons, rosemary, thyme, garlic, olive oil, potatoes, green beans" },
  { id: "r2", name: "Pasta Bolognese", category: "Pasta", prepTime: "15 min", cookTime: "1 hr", notes: "Boys love this. Make a double batch — freezes well.", ingredients: "Ground beef, crushed tomatoes, onion, carrots, celery, red wine, spaghetti, parmesan" },
  { id: "r3", name: "BBQ Pulled Pork", category: "Pork", prepTime: "15 min", cookTime: "8 hrs slow cooker", notes: "Start early morning. Serve with coleslaw and buns.", ingredients: "Pork shoulder, BBQ sauce, brown sugar, apple cider vinegar, garlic powder, onion powder" },
  { id: "r4", name: "Sheet Pan Salmon", category: "Fish", prepTime: "10 min", cookTime: "20 min", notes: "Husband's favorite lighter option. Good for Thursday.", ingredients: "Salmon fillets, asparagus, lemon, olive oil, dill, garlic" },
  { id: "r5", name: "Chicken Tacos", category: "Mexican", prepTime: "20 min", cookTime: "25 min", notes: "Great for a casual night. Set out all toppings.", ingredients: "Chicken thighs, taco seasoning, tortillas, avocado, salsa, shredded cheese, sour cream, lime" },
];

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const CATEGORIES = ["Poultry","Beef","Pork","Fish","Pasta","Mexican","Vegetarian","Soup","Salad","Other"];

// ─── AI helpers ───────────────────────────────────────────────────────────────
async function callClaude(systemPrompt, userMessage, onChunk) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    })
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "content_block_delta" && data.delta?.text) {
            full += data.delta.text;
            if (onChunk) onChunk(full);
          }
        } catch {}
      }
    }
  }
  return full;
}

async function callClaudeJSON(systemPrompt, userMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    })
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  let text = data.content.map(b => b.text || "").join("");
  text = text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
  return JSON.parse(text);
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
function load(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #f4faf9; color: #1e5f5a; min-height: 100vh; }
  .app { max-width: 840px; margin: 0 auto; padding-bottom: 80px; }

  /* Header */
  .header { background: #1e5f5a; color: #f4faf9; padding: 24px 32px; display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 3px solid #7fcdb9; }
  .header h1 { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 500; letter-spacing: -0.02em; }
  .header p { font-size: 11px; color: #7fb3aa; margin-top: 3px; letter-spacing: 0.07em; text-transform: uppercase; }
  .header-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #f4faf9; padding: 7px 13px; border-radius: 6px; font-size: 12px; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.15s; }
  .btn-ghost:hover { background: rgba(255,255,255,0.1); }
  .btn-ghost.active { background: #7fcdb9; border-color: #7fcdb9; color: #1e5f5a; font-weight: 500; }
  .btn-gold { background: #7fcdb9; border: none; color: #1e5f5a; padding: 7px 14px; border-radius: 6px; font-size: 12px; font-family: 'DM Sans', sans-serif; font-weight: 500; cursor: pointer; transition: all 0.15s; }
  .btn-gold:hover { background: #5fb3a3; }

  /* Nav tabs */
  .main-nav { display: flex; gap: 0; border-bottom: 1px solid #d9ece8; background: #fff; padding: 0 32px; }
  .nav-tab { font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 13px 18px; border: none; background: transparent; color: #4a7d77; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; margin-bottom: -1px; }
  .nav-tab.active { color: #1e5f5a; border-bottom-color: #7fcdb9; font-weight: 500; }
  .nav-tab:hover:not(.active) { color: #1e5f5a; }

  .content { padding: 24px 32px 0; }

  /* Visit tabs */
  .visit-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .visit-tabs { display: flex; gap: 6px; }
  .vtab { font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 7px 18px; border-radius: 20px; border: 1px solid #a8d4cb; background: transparent; color: #4a7d77; cursor: pointer; transition: all 0.15s; }
  .vtab.active { background: #1e5f5a; color: #f4faf9; border-color: #1e5f5a; }
  .vtab:hover:not(.active) { border-color: #7fb3aa; color: #1e5f5a; }

  /* Greeting */
  .greeting-card { background: #fff; border: 1px solid #d9ece8; border-left: 3px solid #7fcdb9; border-radius: 8px; padding: 13px 16px; margin-bottom: 16px; font-size: 14px; line-height: 1.65; color: #2d5f59; min-height: 50px; }
  .greeting-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #7fcdb9; font-weight: 500; margin-bottom: 4px; }
  .streaming-cursor::after { content: '|'; animation: blink 0.8s step-end infinite; color: #7fcdb9; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

  /* Generate button */
  .generate-btn { width: 100%; background: #1e5f5a; color: #f4faf9; border: none; border-radius: 8px; padding: 13px; font-family: 'Playfair Display', serif; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 18px; transition: all 0.2s; }
  .generate-btn:hover { background: #287a73; }
  .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #f4faf9; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Sections */
  .section { margin-bottom: 18px; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
  .section-title { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 500; color: #1e5f5a; display: flex; align-items: center; gap: 7px; }
  .section-count { font-size: 11px; color: #7fb3aa; }
  .link-btn { background: none; border: none; font-size: 12px; color: #7fcdb9; cursor: pointer; padding: 0; }
  .link-btn:hover { color: #4a9d8f; }

  /* Tasks */
  .tasks-card { background: #fff; border: 1px solid #d9ece8; border-radius: 10px; overflow: hidden; }
  .task-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #e8f5f1; transition: background 0.1s; }
  .task-row:last-child { border-bottom: none; }
  .task-row:hover { background: #f4faf9; }
  .task-check { width: 17px; height: 17px; border-radius: 4px; border: 1.5px solid #7fcdb9; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; background: transparent; }
  .task-check.done { background: #7fcdb9; border-color: #7fcdb9; }
  .task-text { font-size: 14px; color: #1e5f5a; flex: 1; line-height: 1.4; }
  .task-text.done { text-decoration: line-through; color: #7fb3aa; }
  .task-tag { font-size: 10px; padding: 2px 7px; border-radius: 10px; font-weight: 500; flex-shrink: 0; }
  .tag-routine { background: #e8f5f1; color: #4a7d77; }
  .tag-priority { background: #e3f2e8; color: #2d7a52; }
  .tag-seasonal { background: #d6f0e9; color: #1e6e5c; }
  .task-del { background: none; border: none; cursor: pointer; color: #9fcec4; font-size: 16px; padding: 0 2px; opacity: 0; transition: opacity 0.15s; }
  .task-row:hover .task-del { opacity: 1; }
  .task-del:hover { color: #c0392b; }
  .add-row { padding: 9px 14px; display: flex; align-items: center; gap: 9px; border-top: 1px dashed #d9ece8; }
  .add-input { flex: 1; border: none; background: transparent; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1e5f5a; outline: none; }
  .add-input::placeholder { color: #9fcec4; }
  .add-btn { background: none; border: none; cursor: pointer; color: #7fcdb9; font-size: 20px; line-height: 1; transition: color 0.15s; padding: 0; }
  .add-btn:hover { color: #4a9d8f; }

  /* Meals */
  .meals-grid { display: flex; flex-direction: column; gap: 8px; }
  .meal-card { background: #fff; border: 1px solid #d9ece8; border-radius: 10px; padding: 11px 14px; display: flex; align-items: center; gap: 12px; }
  .meal-day-pill { background: #1e5f5a; color: #f4faf9; font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 12px; flex-shrink: 0; font-family: 'DM Sans', sans-serif; letter-spacing: 0.04em; }
  .meal-info { flex: 1; }
  .meal-name { font-size: 14px; font-weight: 500; color: #1e5f5a; margin-bottom: 1px; }
  .meal-notes { font-size: 12px; color: #7fb3aa; }
  .meal-source { font-size: 11px; color: #7fcdb9; margin-top: 2px; }
  .meal-actions { display: flex; gap: 5px; }
  .meal-btn { font-family: 'DM Sans', sans-serif; font-size: 12px; padding: 5px 10px; border-radius: 6px; border: 1px solid #d9ece8; background: transparent; color: #4a7d77; cursor: pointer; transition: all 0.15s; }
  .meal-btn:hover { border-color: #7fcdb9; color: #1e5f5a; }
  .meal-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .add-meal-btn { width: 100%; background: #fff; border: 1px dashed #7fcdb9; border-radius: 10px; padding: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #7fcdb9; cursor: pointer; transition: all 0.15s; margin-top: 4px; }
  .add-meal-btn:hover { background: #eaf7f3; }
  .add-meal-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Shopping */
  .shop-card { background: #fff; border: 1px solid #d9ece8; border-radius: 10px; padding: 14px; }
  .shop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 18px; }
  .shop-item { display: flex; align-items: center; gap: 7px; padding: 5px 0; font-size: 13px; color: #2d5f59; border-bottom: 0.5px solid #e8f5f1; cursor: pointer; }
  .shop-item:nth-last-child(-n+2) { border-bottom: none; }
  .shop-item.checked { text-decoration: line-through; color: #9fcec4; }
  .shop-dot { width: 5px; height: 5px; border-radius: 50%; background: #7fcdb9; flex-shrink: 0; transition: background 0.15s; }
  .shop-item.checked .shop-dot { background: #9fcec4; }

  /* Chat */
  .chat-bar { margin-top: 16px; background: #fff; border: 1px solid #d9ece8; border-radius: 10px; overflow: hidden; }
  .chat-bar-label { padding: 8px 13px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #7fcdb9; font-weight: 500; }
  .chat-input-row { display: flex; align-items: center; padding: 5px 11px 9px; gap: 7px; }
  .chat-input { flex: 1; border: none; background: transparent; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1e5f5a; outline: none; }
  .chat-input::placeholder { color: #9fcec4; }
  .chat-send { background: #7fcdb9; border: none; border-radius: 6px; padding: 6px 13px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; color: #1e5f5a; cursor: pointer; transition: all 0.15s; }
  .chat-send:hover { background: #5fb3a3; }
  .chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
  .chat-response { padding: 10px 13px; font-size: 13px; line-height: 1.6; color: #2d5f59; border-top: 1px solid #e8f5f1; }

  /* Action bar */
  .action-bar { display: flex; gap: 9px; margin-top: 20px; padding-top: 18px; border-top: 1px solid #d9ece8; }
  .btn-outline { flex: 1; background: #fff; border: 1px solid #a8d4cb; border-radius: 8px; padding: 11px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #2d5f59; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; }
  .btn-outline:hover { border-color: #7fcdb9; color: #1e5f5a; }
  .btn-dark { flex: 2; background: #1e5f5a; border: none; border-radius: 8px; padding: 11px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #f4faf9; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; }
  .btn-dark:hover { background: #287a73; }

  /* Task management extras */
  .task-toolbar { display: flex; gap: 7px; margin-bottom: 9px; flex-wrap: wrap; }
  .task-tool-btn { font-family: 'DM Sans', sans-serif; font-size: 12px; padding: 6px 12px; border-radius: 6px; border: 1px solid #a8d4cb; background: #fff; color: #4a7d77; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 5px; }
  .task-tool-btn:hover { border-color: #7fcdb9; color: #1e5f5a; }
  .task-del { background: none; border: none; cursor: pointer; color: #9fcec4; font-size: 15px; padding: 0 3px; transition: color 0.15s; flex-shrink: 0; }
  .task-del:hover { color: #c0392b; }
  .template-chip { font-family: 'DM Sans', sans-serif; font-size: 12px; padding: 5px 12px; border-radius: 14px; border: 1px solid #a8d4cb; background: #fff; color: #2d5f59; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .template-chip:hover { border-color: #7fcdb9; background: #eaf7f3; }
  .template-chip.del { color: #9fcec4; border-color: #eee; font-size: 11px; padding: 5px 8px; }
  .template-chip.del:hover { color: #c0392b; border-color: #c0392b; background: #fff; }
  .bulk-textarea { width: 100%; border: 1px solid #d9ece8; border-radius: 8px; padding: 10px 12px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1e5f5a; background: #fff; outline: none; resize: vertical; min-height: 110px; }
  .bulk-textarea:focus { border-color: #7fcdb9; }
  .ai-task-input { width: 100%; border: 1px solid #d9ece8; border-radius: 8px; padding: 9px 12px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1e5f5a; background: #fff; outline: none; }
  .ai-task-input:focus { border-color: #7fcdb9; }
  .tag-select { font-family: 'DM Sans', sans-serif; font-size: 11px; border: 1px solid #d9ece8; border-radius: 5px; padding: 2px 5px; color: #4a7d77; background: #fff; cursor: pointer; outline: none; }

  /* Sales tab */
  .sales-input-tabs { display: flex; gap: 0; border-bottom: 1px solid #d9ece8; margin-bottom: 18px; }
  .sales-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; margin-left: 6px; vertical-align: middle; }
  .badge-bogo { background: #7fcdb9; color: #1e5f5a; }
  .badge-sale { background: #d6f0e9; color: #1e6e5c; }
  .badge-markdown { background: #e3f2e8; color: #2d7a52; }
  .sale-match-card { background: #fff; border: 1px solid #d9ece8; border-radius: 10px; padding: 13px 15px; margin-bottom: 10px; }
  .sale-match-header { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
  .sale-item-name { font-size: 14px; font-weight: 500; color: #1e5f5a; flex: 1; }
  .sale-store-pill { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
  .store-publix { background: #1a5e38; color: #fff; }
  .store-walmart { background: #0071ce; color: #fff; }
  .sale-price { font-size: 13px; color: #1e6e5c; font-weight: 500; }
  .sale-recipes { margin-top: 8px; padding-top: 8px; border-top: 1px solid #e8f5f1; }
  .sale-recipes-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #7fb3aa; font-weight: 500; margin-bottom: 5px; }
  .sale-recipe-chip { display: inline-block; font-size: 12px; background: #e8f5f1; color: #2d5f59; padding: 3px 9px; border-radius: 10px; margin: 2px 3px 2px 0; cursor: pointer; transition: all 0.15s; border: none; font-family: 'DM Sans', sans-serif; }
  .sale-recipe-chip:hover { background: #7fcdb9; color: #1e5f5a; }
  .manual-sale-row { display: flex; gap: 7px; margin-bottom: 8px; flex-wrap: wrap; }
  .sale-summary-card { background: linear-gradient(135deg, #1e5f5a 0%, #287a73 100%); border-radius: 10px; padding: 16px 18px; margin-bottom: 18px; color: #f4faf9; }
  .sale-summary-title { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 500; margin-bottom: 4px; }
  .sale-summary-sub { font-size: 12px; color: #7fb3aa; margin-bottom: 12px; }
  .sale-recommended { display: flex; flex-direction: column; gap: 7px; }
  .sale-rec-card { background: rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 13px; }
  .sale-rec-name { font-size: 13px; font-weight: 500; color: #f4faf9; margin-bottom: 2px; }
  .sale-rec-why { font-size: 11px; color: #7fcdb9; }

  /* Recipe Box */
  .recipe-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .search-input { flex: 1; min-width: 160px; border: 1px solid #d9ece8; border-radius: 7px; padding: 8px 12px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1e5f5a; background: #fff; outline: none; }
  .search-input:focus { border-color: #7fcdb9; }
  .filter-select { border: 1px solid #d9ece8; border-radius: 7px; padding: 8px 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1e5f5a; background: #fff; outline: none; cursor: pointer; }
  .recipes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .recipe-card { background: #fff; border: 1px solid #d9ece8; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.15s; position: relative; }
  .recipe-card:hover { border-color: #7fcdb9; box-shadow: 0 2px 8px rgba(201,169,110,0.12); }
  .recipe-card.selected { border-color: #7fcdb9; border-width: 2px; }
  .recipe-cat { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #7fcdb9; font-weight: 500; margin-bottom: 5px; }
  .recipe-name { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 500; color: #1e5f5a; margin-bottom: 5px; line-height: 1.3; }
  .recipe-meta { font-size: 12px; color: #7fb3aa; margin-bottom: 6px; }
  .recipe-notes { font-size: 12px; color: #4a7d77; line-height: 1.4; }
  .recipe-actions { display: flex; gap: 6px; margin-top: 10px; }
  .recipe-action-btn { font-family: 'DM Sans', sans-serif; font-size: 11px; padding: 4px 9px; border-radius: 5px; border: 1px solid #d9ece8; background: transparent; color: #4a7d77; cursor: pointer; transition: all 0.15s; }
  .recipe-action-btn:hover { border-color: #7fcdb9; color: #1e5f5a; }
  .recipe-action-btn.danger:hover { border-color: #c0392b; color: #c0392b; }
  .add-recipe-card { background: #fff; border: 1px dashed #7fcdb9; border-radius: 10px; padding: 14px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 120px; gap: 6px; transition: all 0.15s; }
  .add-recipe-card:hover { background: #eaf7f3; }
  .add-recipe-card span:first-child { font-size: 24px; color: #7fcdb9; }
  .add-recipe-card span:last-child { font-size: 13px; color: #7fcdb9; font-weight: 500; }

  /* Panels / Modals */
  .panel-overlay { position: fixed; inset: 0; background: rgba(42,37,32,0.55); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .panel { background: #f4faf9; border-radius: 12px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; padding: 26px; }
  .panel h2 { font-family: 'Playfair Display', serif; font-size: 19px; font-weight: 500; margin-bottom: 18px; }
  .panel-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: #7fcdb9; font-weight: 500; margin: 18px 0 10px; border-top: 1px solid #d9ece8; padding-top: 14px; }
  .panel-section-title:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
  .field { margin-bottom: 13px; }
  .field label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #4a7d77; font-weight: 500; margin-bottom: 4px; }
  .field input, .field textarea, .field select { width: 100%; border: 1px solid #d9ece8; border-radius: 7px; padding: 8px 11px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1e5f5a; background: #fff; outline: none; transition: border-color 0.15s; resize: vertical; }
  .field input:focus, .field textarea:focus { border-color: #7fcdb9; }
  .field-hint { font-size: 11px; color: #7fb3aa; margin-top: 3px; line-height: 1.4; }
  .panel-actions { display: flex; gap: 9px; margin-top: 18px; }
  .btn-save { flex: 1; background: #7fcdb9; border: none; border-radius: 7px; padding: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #1e5f5a; cursor: pointer; transition: all 0.15s; }
  .btn-save:hover { background: #5fb3a3; }
  .btn-cancel { flex: 1; background: transparent; border: 1px solid #a8d4cb; border-radius: 7px; padding: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #4a7d77; cursor: pointer; transition: all 0.15s; }
  .btn-cancel:hover { border-color: #7fb3aa; }

  /* Print */
  .print-panel { background: #fff; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; padding: 32px; }
  .print-header { border-bottom: 2px solid #1e5f5a; padding-bottom: 12px; margin-bottom: 20px; }
  .print-header h2 { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 600; color: #1e5f5a; }
  .print-header p { font-size: 12px; color: #4a7d77; margin-top: 2px; }
  .print-section { margin-bottom: 20px; }
  .print-section h3 { font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 500; color: #1e5f5a; border-bottom: 1px solid #d9ece8; padding-bottom: 5px; margin-bottom: 9px; }
  .print-task { font-size: 13px; color: #1e5f5a; padding: 4px 0; display: flex; gap: 9px; align-items: flex-start; }
  .print-task::before { content: "☐"; color: #7fcdb9; flex-shrink: 0; }
  .print-meal { font-size: 13px; color: #1e5f5a; padding: 4px 0; display: flex; gap: 9px; }
  .print-meal-day { color: #7fcdb9; font-weight: 500; min-width: 32px; flex-shrink: 0; }
  .print-shop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 18px; }
  .print-shop-item { font-size: 13px; color: #1e5f5a; padding: 4px 0; display: flex; gap: 7px; align-items: center; }
  .print-shop-item::before { content: "○"; color: #7fcdb9; font-size: 10px; }
  .print-note { font-size: 12px; color: #4a7d77; font-style: italic; margin-top: 8px; border-top: 1px solid #e8f5f1; padding-top: 8px; }

  /* Toast */
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1e5f5a; color: #f4faf9; padding: 9px 18px; border-radius: 20px; font-size: 13px; z-index: 200; animation: toastIn 0.2s ease; }
  @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } }

  /* Empty state */
  .empty-state { text-align: center; padding: 40px 20px; color: #7fb3aa; font-size: 14px; }
  .empty-state span { display: block; font-size: 32px; margin-bottom: 10px; }

  /* Import modal */
  .import-tabs { display: flex; border-bottom: 1px solid #d9ece8; margin-bottom: 18px; gap: 0; }
  .import-tab { font-family: 'DM Sans', sans-serif; font-size: 12px; padding: 9px 14px; border: none; background: transparent; color: #4a7d77; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s; white-space: nowrap; }
  .import-tab.active { color: #1e5f5a; border-bottom-color: #7fcdb9; font-weight: 500; }
  .import-tab:hover:not(.active) { color: #1e5f5a; }
  .drop-zone { border: 2px dashed #a8d4cb; border-radius: 10px; padding: 32px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: #fff; }
  .drop-zone:hover, .drop-zone.drag-over { border-color: #7fcdb9; background: #eaf7f3; }
  .drop-zone-icon { font-size: 36px; margin-bottom: 10px; }
  .drop-zone-title { font-size: 14px; font-weight: 500; color: #1e5f5a; margin-bottom: 4px; }
  .drop-zone-sub { font-size: 12px; color: #7fb3aa; }
  .drop-zone input[type=file] { display: none; }
  .import-preview { background: #e8f5f1; border-radius: 8px; padding: 12px 14px; margin-top: 14px; font-size: 13px; color: #2d5f59; line-height: 1.5; }
  .import-preview-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #7fcdb9; font-weight: 500; margin-bottom: 5px; }
  .processing-bar { background: #e8f5f1; border-radius: 8px; padding: 16px; margin-top: 14px; text-align: center; }
  .processing-bar .spinner { margin: 0 auto 8px; border-color: rgba(201,169,110,0.3); border-top-color: #7fcdb9; }
  .processing-bar p { font-size: 13px; color: #4a7d77; }
  .import-results { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
  .import-result-card { background: #fff; border: 1px solid #d9ece8; border-radius: 8px; padding: 11px 13px; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .import-result-card.selected { border-color: #7fcdb9; border-width: 2px; }
  .import-result-name { font-size: 13px; font-weight: 500; color: #1e5f5a; }
  .import-result-meta { font-size: 11px; color: #7fb3aa; margin-top: 2px; }
  .import-select-btn { font-family: 'DM Sans', sans-serif; font-size: 11px; padding: 4px 10px; border-radius: 5px; border: 1px solid #d9ece8; background: transparent; color: #4a7d77; cursor: pointer; flex-shrink: 0; transition: all 0.15s; white-space: nowrap; }
  .import-select-btn:hover, .import-select-btn.on { border-color: #7fcdb9; color: #1e5f5a; background: #eaf7f3; }
  .bulk-count { font-size: 12px; color: #7fcdb9; font-weight: 500; margin-top: 8px; }
`;

// ─── Tag helper ───────────────────────────────────────────────────────────────
function tagClass(tag) {
  if (tag === "priority") return "tag-priority";
  if (tag === "seasonal") return "tag-seasonal";
  return "tag-routine";
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function HousekeeperAgent() {
  const today = new Date();
  const todayName = DAYS[today.getDay()];

  // ── State ──────────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(() => load("hpa_profile", DEFAULT_PROFILE));
  const [recipes, setRecipes] = useState(() => load("hpa_recipes", DEFAULT_RECIPES));
  const [activeTab, setActiveTab] = useState("planner"); // planner | recipes | preferences
  const [activeDay, setActiveDay] = useState(() => (load("hpa_profile", DEFAULT_PROFILE).housekeeperDays || ["Monday"])[0]);
  const [plan, setPlan] = useState(() => load(`hpa_plan_${(load("hpa_profile", DEFAULT_PROFILE).housekeeperDays || ["Monday"])[0]}`, { tasks:[], meals:[], shopping:[], greeting:"" }));
  const [generating, setGenerating] = useState(false);
  const [greeting, setGreeting] = useState(plan.greeting || "");
  const [streamingGreeting, setStreamingGreeting] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [checkedShop, setCheckedShop] = useState({});
  const [swappingMeal, setSwappingMeal] = useState(null);
  const [addingMeal, setAddingMeal] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [toast, setToast] = useState("");

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [draftProfile, setDraftProfile] = useState(profile);

  // Recipe modals
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeFilter, setRecipeFilter] = useState("All");
  const [draftRecipe, setDraftRecipe] = useState({ name:"", category:"Poultry", prepTime:"", cookTime:"", notes:"", ingredients:"" });

  // Print
  const [showPrint, setShowPrint] = useState(false);

  // Persist plan
  useEffect(() => { save(`hpa_plan_${activeDay}`, { ...plan, greeting }); }, [plan, greeting, activeDay]);
  useEffect(() => { save("hpa_profile", profile); }, [profile]);
  useEffect(() => { save("hpa_recipes", recipes); }, [recipes]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2600); };

  const switchDay = (day) => {
    setActiveDay(day);
    const saved = load(`hpa_plan_${day}`, { tasks:[], meals:[], shopping:[], greeting:"" });
    setPlan(saved);
    setGreeting(saved.greeting || "");
    setChatResponse("");
    setCheckedShop({});
  };

  // ── Build recipe context string for AI ────────────────────────────────────
  const recipeContext = () => {
    if (!recipes.length) return "No saved recipes yet.";
    return recipes.map(r =>
      `- ${r.name} (${r.category}, prep: ${r.prepTime}, cook: ${r.cookTime}): ${r.notes}. Ingredients: ${r.ingredients}`
    ).join("\n");
  };

  const prefContext = () =>
    `Family likes: ${profile.likes}. Dislikes/avoid: ${profile.dislikes}. Dietary rules: ${profile.dietary}. Recent meals to avoid repeating: ${profile.mealHistory}.`;

  // ── Generate plan ─────────────────────────────────────────────────────────
  const generatePlan = async () => {
    setGenerating(true);
    setGreeting("");
    setStreamingGreeting(true);
    setCheckedShop({});
    try {
      const planData = await callClaudeJSON(
        `You are a household management assistant. Return ONLY valid JSON, no markdown fences, no explanation.`,
        `Generate a housekeeper visit plan for ${activeDay}.

HOUSEHOLD:
- Family: ${profile.members}
- Housekeeper: ${profile.housekeeperName}
- Today is ${todayName}
- Standard tasks: ${profile.standardTasks}
- Extra notes: ${profile.extraNotes}

FOOD PREFERENCES:
${prefContext()}

FAMILY RECIPE BOX (prefer these recipes when suggesting meals):
${recipeContext()}

Return this exact JSON:
{
  "tasks": [
    { "id": "1", "text": "task description", "tag": "routine", "done": false }
  ],
  "meals": [
    { "id": "1", "day": "Tue", "name": "Meal name", "notes": "brief prep note", "fromRecipeBox": true }
  ],
  "shopping": ["ingredient 1", "ingredient 2"]
}

Rules:
- 5-7 tasks. ${activeDay === "Monday" ? "Monday = full deep clean + laundry + meal prep." : "Thursday = lighter touch-up, bathrooms, restock."}
- 2-3 meals covering Tue-Fri. PRIORITIZE meals from the Recipe Box when possible. Mark fromRecipeBox: true if you use one.
- Avoid meals listed in recent history.
- Respect all dietary notes and preferences.
- Shopping list: 10-14 specific ingredients for the planned meals.
- Tags: routine | priority | seasonal`
      );

      setPlan(planData);

      await callClaude(
        `You are a warm, friendly household assistant. Write a 2-sentence greeting for the homemaker about their upcoming ${activeDay} housekeeper visit. Be specific and personal. Mention one meal by name. No lists, just warm prose.`,
        `Housekeeper: ${profile.housekeeperName}. Family: ${profile.members}. Meals planned: ${planData.meals.map(m=>m.name).join(", ")}. Top tasks: ${planData.tasks.slice(0,2).map(t=>t.text).join(", ")}.`,
        (partial) => setGreeting(partial)
      );
    } catch (e) {
      showToast("Generation failed — please try again");
      console.error(e);
    }
    setStreamingGreeting(false);
    setGenerating(false);
  };

  // ── Task actions ──────────────────────────────────────────────────────────
  const toggleTask = (id) => setPlan(p => ({ ...p, tasks: p.tasks.map(t => t.id===id ? {...t, done:!t.done} : t) }));
  const deleteTask = (id) => setPlan(p => ({ ...p, tasks: p.tasks.filter(t => t.id!==id) }));
  const addTask = () => {
    if (!newTask.trim()) return;
    setPlan(p => ({ ...p, tasks: [...p.tasks, { id: Date.now().toString(), text: newTask.trim(), tag: "routine", done: false }] }));
    setNewTask("");
  };

  // ── Task management extras ────────────────────────────────────────────────
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [taskPanelTab, setTaskPanelTab] = useState("bulk"); // bulk | ai | templates
  const [bulkTaskText, setBulkTaskText] = useState("");
  const [aiTaskPrompt, setAiTaskPrompt] = useState("");
  const [aiTaskBusy, setAiTaskBusy] = useState(false);
  const [templates, setTemplates] = useState(() => load("hpa_templates", [
    { id: "t1", name: "Deep Clean Monday", tasks: ["Full laundry — all bedrooms", "Vacuum all rooms including stairs", "Mop kitchen and bathroom floors", "Clean all bathrooms thoroughly", "Wipe down kitchen counters and appliances", "Prep meals for Tue–Thu"] },
    { id: "t2", name: "Light Thursday", tasks: ["Touch-up vacuum main living areas", "Clean bathrooms", "Restock paper goods and soap", "Fold and put away laundry", "Wipe kitchen counters"] },
    { id: "t3", name: "Summer Extras", tasks: ["Wipe down patio furniture", "Clean ceiling fans", "Wash outdoor cushion covers", "Clean sliding glass doors"] }
  ]));
  const [newTemplateName, setNewTemplateName] = useState("");

  useEffect(() => { save("hpa_templates", templates); }, [templates]);

  const addBulkTasks = () => {
    const lines = bulkTaskText.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const newTasks = lines.map(text => ({ id: Date.now().toString() + Math.random(), text, tag: "routine", done: false }));
    setPlan(p => ({ ...p, tasks: [...p.tasks, ...newTasks] }));
    setBulkTaskText("");
    showToast(`${lines.length} task${lines.length > 1 ? "s" : ""} added ✓`);
    setShowTaskPanel(false);
  };

  const suggestTasksWithAI = async () => {
    if (!aiTaskPrompt.trim()) return;
    setAiTaskBusy(true);
    try {
      const result = await callClaudeJSON(
        `You are a household task assistant. Return ONLY JSON, no markdown.`,
        `Suggest specific housekeeper tasks based on this situation: "${aiTaskPrompt}".
Household: ${profile.members}. Housekeeper: ${profile.housekeeperName}. Visit day: ${activeDay}.
Existing tasks already on list: ${plan.tasks.map(t => t.text).join(", ") || "none"}.
Return: { "tasks": [ { "text": "task description", "tag": "routine|priority|seasonal" } ] }
Return 2-5 specific, actionable tasks. Do not repeat existing tasks.`
      );
      const newTasks = (result.tasks || []).map(t => ({ id: Date.now().toString() + Math.random(), text: t.text, tag: t.tag || "routine", done: false }));
      setPlan(p => ({ ...p, tasks: [...p.tasks, ...newTasks] }));
      showToast(`${newTasks.length} tasks added ✓`);
      setAiTaskPrompt("");
      setShowTaskPanel(false);
    } catch { showToast("Could not generate tasks — try again"); }
    setAiTaskBusy(false);
  };

  const loadTemplate = (template) => {
    const newTasks = template.tasks.map(text => ({ id: Date.now().toString() + Math.random(), text, tag: "routine", done: false }));
    const existing = plan.tasks.map(t => t.text.toLowerCase());
    const toAdd = newTasks.filter(t => !existing.includes(t.text.toLowerCase()));
    setPlan(p => ({ ...p, tasks: [...p.tasks, ...toAdd] }));
    showToast(`Loaded "${template.name}" — ${toAdd.length} tasks added ✓`);
    setShowTaskPanel(false);
  };

  const saveCurrentAsTemplate = () => {
    if (!newTemplateName.trim()) { showToast("Enter a template name first"); return; }
    if (!plan.tasks.length) { showToast("No tasks on the current plan to save"); return; }
    const tmpl = { id: Date.now().toString(), name: newTemplateName.trim(), tasks: plan.tasks.map(t => t.text) };
    setTemplates(ts => [...ts, tmpl]);
    setNewTemplateName("");
    showToast(`Template saved: "${tmpl.name}" ✓`);
  };

  const deleteTemplate = (id) => {
    setTemplates(ts => ts.filter(t => t.id !== id));
    showToast("Template removed");
  };

  const changeTaskTag = (id, tag) => {
    setPlan(p => ({ ...p, tasks: p.tasks.map(t => t.id === id ? { ...t, tag } : t) }));
  };

  // ── Meal actions ──────────────────────────────────────────────────────────
  const swapMeal = async (meal) => {
    setSwappingMeal(meal.id);
    try {
      const result = await callClaudeJSON(
        `You are a meal suggestion assistant. Return ONLY JSON, no markdown.`,
        `Suggest ONE alternative meal for ${meal.day}.
Family: ${profile.members}. ${prefContext()}
Recipe box to draw from:\n${recipeContext()}
Already planned: ${plan.meals.map(m=>m.name).join(", ")}. Do NOT suggest: "${meal.name}".
Return: { "name": "...", "notes": "...", "fromRecipeBox": true/false }`
      );
      setPlan(p => ({ ...p, meals: p.meals.map(m => m.id===meal.id ? {...m, name:result.name, notes:result.notes, fromRecipeBox:result.fromRecipeBox} : m) }));
    } catch { showToast("Swap failed — try again"); }
    setSwappingMeal(null);
  };

  const addSuggestedMeal = async () => {
    setAddingMeal(true);
    try {
      const usedDays = plan.meals.map(m => m.day);
      const result = await callClaudeJSON(
        `You are a meal suggestion assistant. Return ONLY JSON, no markdown.`,
        `Suggest ONE more meal for the week. ${prefContext()} Recipe box:\n${recipeContext()}
Already planned: ${plan.meals.map(m=>m.name).join(", ")}. Days used: ${usedDays.join(", ")}.
Return: { "day": "Mon/Tue/Wed/Thu/Fri/Sat", "name": "...", "notes": "...", "fromRecipeBox": true/false }`
      );
      setPlan(p => ({ ...p, meals: [...p.meals, { id: Date.now().toString(), day: result.day, name: result.name, notes: result.notes, fromRecipeBox: result.fromRecipeBox }] }));
    } catch { showToast("Could not add meal — try again"); }
    setAddingMeal(false);
  };

  const regenerateShopping = async () => {
    if (!plan.meals.length) return;
    try {
      const result = await callClaudeJSON(
        `You are a grocery list assistant. Return ONLY JSON, no markdown.`,
        `Shopping list for: ${plan.meals.map(m=>m.name).join(", ")}. Family: ${profile.members}. Return: { "shopping": ["item 1",...] } with 10-14 specific items.`
      );
      setPlan(p => ({ ...p, shopping: result.shopping }));
      setCheckedShop({});
      showToast("Shopping list refreshed ✓");
    } catch { showToast("Could not refresh — try again"); }
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || chatBusy) return;
    const msg = chatInput;
    setChatInput("");
    setChatBusy(true);
    setChatResponse("");
    try {
      await callClaude(
        `You are a household assistant. Current ${activeDay} plan — tasks: ${plan.tasks.map(t=>t.text).join(", ")}. Meals: ${plan.meals.map(m=>m.name).join(", ")}. Recipe box: ${recipes.map(r=>r.name).join(", ")}. Answer briefly and helpfully.`,
        msg,
        (partial) => setChatResponse(partial)
      );
    } catch { setChatResponse("Something went wrong — please try again."); }
    setChatBusy(false);
  };

  // ── Recipe CRUD ───────────────────────────────────────────────────────────
  const openNewRecipe = () => {
    setDraftRecipe({ name:"", category:"Poultry", prepTime:"", cookTime:"", notes:"", ingredients:"" });
    setEditingRecipe(null);
    setShowRecipeForm(true);
  };
  const openEditRecipe = (r) => {
    setDraftRecipe({ ...r });
    setEditingRecipe(r.id);
    setShowRecipeForm(true);
  };
  const saveRecipe = () => {
    if (!draftRecipe.name.trim()) { showToast("Please enter a recipe name"); return; }
    if (editingRecipe) {
      setRecipes(rs => rs.map(r => r.id===editingRecipe ? {...draftRecipe, id:editingRecipe} : r));
      showToast("Recipe updated ✓");
    } else {
      setRecipes(rs => [...rs, {...draftRecipe, id: Date.now().toString()}]);
      showToast("Recipe added to your box ✓");
    }
    setShowRecipeForm(false);
  };
  const deleteRecipe = (id) => {
    setRecipes(rs => rs.filter(r => r.id!==id));
    showToast("Recipe removed");
  };

  const filteredRecipes = recipes.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(recipeSearch.toLowerCase()) || r.notes.toLowerCase().includes(recipeSearch.toLowerCase());
    const matchCat = recipeFilter === "All" || r.category === recipeFilter;
    return matchSearch && matchCat;
  });

  // ── Standing ingredients (permanent watch list) ───────────────────────────
  const DEFAULT_STANDING = [
    "butter", "eggs", "milk", "olive oil", "chicken broth", "canned tomatoes",
    "paper towels", "dish soap", "laundry detergent", "cheese", "yogurt", "deli meat"
  ];
  const [standingIngredients, setStandingIngredients] = useState(() => load("hpa_standing", DEFAULT_STANDING));
  const [newStandingItem, setNewStandingItem] = useState("");
  const [showManageStanding, setShowManageStanding] = useState(false);
  const [bulkStandingText, setBulkStandingText] = useState("");

  useEffect(() => { save("hpa_standing", standingIngredients); }, [standingIngredients]);

  const addStandingItem = (item) => {
    const clean = item.trim().toLowerCase();
    if (!clean) return;
    if (standingIngredients.includes(clean)) { showToast("Already on your list"); return; }
    setStandingIngredients(s => [...s, clean]);
    setNewStandingItem("");
  };
  const removeStandingItem = (item) => setStandingIngredients(s => s.filter(i => i !== item));
  const addBulkStanding = () => {
    const lines = bulkStandingText.split("\n").map(l => l.trim().toLowerCase()).filter(Boolean);
    const toAdd = lines.filter(l => !standingIngredients.includes(l));
    setStandingIngredients(s => [...s, ...toAdd]);
    setBulkStandingText("");
    showToast(`${toAdd.length} item${toAdd.length!==1?"s":""} added ✓`);
  };

  // ── Sales & savings state ─────────────────────────────────────────────────
  const [salesInputTab, setSalesInputTab] = useState("paste"); // paste | photo | manual
  const [salesText, setSalesText] = useState("");
  const [salesPhoto, setSalesPhoto] = useState(null); // base64 data URL
  const [salesProcessing, setSalesProcessing] = useState(false);
  const [salesMatches, setSalesMatches] = useState(() => load("hpa_sales", []));
  const [salesRecommended, setSalesRecommended] = useState(() => load("hpa_sales_rec", []));
  const [salesWeekOf, setSalesWeekOf] = useState(() => load("hpa_sales_week", ""));
  const [manualSaleItem, setManualSaleItem] = useState("");
  const [manualSalePrice, setManualSalePrice] = useState("");
  const [manualSaleStore, setManualSaleStore] = useState("Publix");
  const [manualSaleType, setManualSaleType] = useState("BOGO");

  useEffect(() => { save("hpa_sales", salesMatches); }, [salesMatches]);
  useEffect(() => { save("hpa_sales_rec", salesRecommended); }, [salesRecommended]);
  useEffect(() => { save("hpa_sales_week", salesWeekOf); }, [salesWeekOf]);

  const allIngredients = recipes.flatMap(r =>
    (r.ingredients || "").split(",").map(i => i.trim().toLowerCase()).filter(Boolean)
  );
  const uniqueIngredients = [...new Set(allIngredients)];

  // Combined list for Flipp searches — recipe ingredients + standing list
  const allFlippIngredients = [...new Set([...uniqueIngredients, ...standingIngredients])];

  const processSalesWithAI = async (contentBlocks, store) => {
    setSalesProcessing(true);
    setSalesMatches([]);
    setSalesRecommended([]);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: `You are a grocery savings assistant. Return ONLY valid JSON, no markdown.`,
          messages: [{ role: "user", content: [
            ...contentBlocks,
            { type: "text", text: `This is a ${store} weekly ad or sale listing.

My family's recipe ingredients include: ${uniqueIngredients.slice(0, 60).join(", ")}.

My recipe box contains: ${recipes.map(r => `"${r.name}" (uses: ${r.ingredients})`).join("; ")}.

Step 1: Find ALL items in this ad that match or are relevant to my ingredient list.
Step 2: For each matched item, identify which of my recipes it would benefit.

Return this exact JSON:
{
  "weekOf": "date range if visible, e.g. Jun 8-14",
  "store": "${store}",
  "matches": [
    {
      "item": "product name as shown in ad",
      "saleType": "BOGO" | "Sale" | "Markdown",
      "saleDetail": "e.g. Buy One Get One Free, or $1.99/lb, or 2 for $5",
      "originalPrice": "if shown, otherwise empty string",
      "relevantRecipes": ["Recipe Name 1", "Recipe Name 2"]
    }
  ],
  "recommended": [
    {
      "recipeName": "Recipe name from my box",
      "reason": "one sentence why this is the best pick this week based on sales"
    }
  ]
}

If no matches are found, return { "weekOf": "", "store": "${store}", "matches": [], "recommended": [] }.
Return up to 3 recommended recipes, ranked by best savings.` }
          ]}]
        })
      });
      const data = await response.json();
      let text = data.content.map(b => b.text || "").join("");
      text = text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
      const result = JSON.parse(text);
      setSalesMatches(result.matches || []);
      setSalesRecommended(result.recommended || []);
      setSalesWeekOf(result.weekOf || "");
      if ((result.matches||[]).length === 0) {
        showToast("No matches found for your ingredients — try a different ad");
      } else {
        showToast(`Found ${result.matches.length} sale item${result.matches.length>1?"s":""} matching your recipes ✓`);
      }
    } catch(e) {
      showToast("Could not read the ad — please try again");
      console.error(e);
    }
    setSalesProcessing(false);
  };

  const handleSalesTextScan = () => {
    if (!salesText.trim()) return;
    processSalesWithAI([{ type: "text", text: `Weekly ad text:\n${salesText}` }], manualSaleStore);
  };

  const handleSalesPhotoScan = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      setSalesPhoto(e.target.result);
      processSalesWithAI([
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }
      ], manualSaleStore);
    };
    reader.readAsDataURL(file);
  };

  const addManualSaleItem = () => {
    if (!manualSaleItem.trim()) return;
    const relevant = recipes.filter(r =>
      r.ingredients.toLowerCase().includes(manualSaleItem.toLowerCase().split(" ")[0])
    ).map(r => r.name);
    const entry = {
      item: manualSaleItem.trim(),
      saleType: manualSaleType,
      saleDetail: manualSalePrice.trim() || manualSaleType,
      originalPrice: "",
      relevantRecipes: relevant,
      store: manualSaleStore,
      manual: true
    };
    setSalesMatches(m => [...m, entry]);
    setManualSaleItem("");
    setManualSalePrice("");
    showToast("Sale item added ✓");
  };

  const removeSaleMatch = (idx) => setSalesMatches(m => m.filter((_,i) => i !== idx));

  const useSaleRecipeInPlanner = (recipeName) => {
    setActiveTab("planner");
    showToast(`Switched to planner — add "${recipeName}" to your meal plan`);
  };

  // ── Import modal state ────────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importTab, setImportTab] = useState("photo"); // photo | paste | name | bulk
  const [importProcessing, setImportProcessing] = useState(false);
  const [importedRecipes, setImportedRecipes] = useState([]); // parsed results
  const [selectedImports, setSelectedImports] = useState({});
  const [pasteText, setPasteText] = useState("");
  const [nameText, setNameText] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null); // base64

  const IMPORT_SYSTEM = `You are a recipe extraction assistant. Extract recipe information and return ONLY valid JSON, no markdown, no explanation.`;

  const parseRecipesFromAI = async (prompt) => {
    setImportProcessing(true);
    setImportedRecipes([]);
    setSelectedImports({});
    try {
      const result = await callClaudeJSON(IMPORT_SYSTEM, prompt);
      const list = Array.isArray(result) ? result : [result];
      setImportedRecipes(list.map((r, i) => ({
        id: `imp_${Date.now()}_${i}`,
        name: r.name || "Untitled Recipe",
        category: r.category || "Other",
        prepTime: r.prepTime || "",
        cookTime: r.cookTime || "",
        notes: r.notes || "",
        ingredients: r.ingredients || ""
      })));
      const sel = {};
      list.forEach((_, i) => { sel[`imp_${Date.now()}_${i}`] = true; });
      // select all by default — use index-based approach
      setSelectedImports("all");
    } catch (e) {
      showToast("Could not read recipe — please try again");
      console.error(e);
    }
    setImportProcessing(false);
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      setPhotoPreview(e.target.result);
      setImportProcessing(true);
      setImportedRecipes([]);
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1500,
            system: IMPORT_SYSTEM,
            messages: [{
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
                { type: "text", text: `Extract the recipe from this image. Return a JSON array with one object per recipe found:
[{ "name": "...", "category": "Poultry|Beef|Pork|Fish|Pasta|Mexican|Vegetarian|Soup|Salad|Other", "prepTime": "...", "cookTime": "...", "notes": "brief description or serving suggestions", "ingredients": "comma-separated main ingredients" }]
If no recipe is visible, return [].` }
              ]
            }]
          })
        });
        const data = await response.json();
        let text = data.content.map(b => b.text || "").join("");
        text = text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
        const list = JSON.parse(text);
        setImportedRecipes(list.map((r, i) => ({ id:`imp_${i}`, name:r.name||"Untitled", category:r.category||"Other", prepTime:r.prepTime||"", cookTime:r.cookTime||"", notes:r.notes||"", ingredients:r.ingredients||"" })));
        setSelectedImports("all");
      } catch(err) { showToast("Could not read image — try a clearer photo"); console.error(err); }
      setImportProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    parseRecipesFromAI(`Extract all recipes from this text. Return a JSON array:
[{ "name":"...", "category":"Poultry|Beef|Pork|Fish|Pasta|Mexican|Vegetarian|Soup|Salad|Other", "prepTime":"...", "cookTime":"...", "notes":"brief note or serving suggestion", "ingredients":"comma-separated ingredients" }]
Text: ${pasteText}`);
  };

  const handleNameImport = () => {
    if (!nameText.trim()) return;
    parseRecipesFromAI(`Generate recipe details for: "${nameText}". Return a JSON array with one item:
[{ "name":"${nameText}", "category":"Poultry|Beef|Pork|Fish|Pasta|Mexican|Vegetarian|Soup|Salad|Other", "prepTime":"estimated prep time", "cookTime":"estimated cook time", "notes":"brief description and serving suggestion", "ingredients":"comma-separated main ingredients" }]`);
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    parseRecipesFromAI(`I have a list of recipe names. For each one, generate recipe details. Return a JSON array, one object per recipe:
[{ "name":"...", "category":"Poultry|Beef|Pork|Fish|Pasta|Mexican|Vegetarian|Soup|Salad|Other", "prepTime":"...", "cookTime":"...", "notes":"brief description", "ingredients":"comma-separated main ingredients" }]
Recipe names: ${bulkText}`);
  };

  const isSelected = (id) => selectedImports === "all" || !!selectedImports[id];
  const toggleImportSelect = (id) => {
    if (selectedImports === "all") {
      const obj = {};
      importedRecipes.forEach(r => { obj[r.id] = r.id !== id; });
      setSelectedImports(obj);
    } else {
      setSelectedImports(s => ({ ...s, [id]: !s[id] }));
    }
  };

  const addSelectedToBox = () => {
    const toAdd = importedRecipes.filter(r => isSelected(r.id));
    if (!toAdd.length) { showToast("Select at least one recipe"); return; }
    setRecipes(rs => [...rs, ...toAdd.map(r => ({ ...r, id: Date.now().toString() + Math.random() }))]);
    showToast(`${toAdd.length} recipe${toAdd.length > 1 ? "s" : ""} added to your box ✓`);
    setShowImport(false);
    setImportedRecipes([]);
    setPasteText("");
    setNameText("");
    setBulkText("");
    setPhotoPreview(null);
  };

  // ── Settings ──────────────────────────────────────────────────────────────
  const saveSettings = () => {
    setProfile(draftProfile);
    setShowSettings(false);
    showToast("Profile saved ✓");
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* ── Header ── */}
        <div className="header">
          <div>
            <h1>House Helper</h1>
            <p>Housekeeper Prep Assistant</p>
          </div>
          <div className="header-actions">
            <button className="btn-ghost" onClick={() => { setDraftProfile({...profile}); setShowSettings(true); }}>
              ⚙ Profile
            </button>
            <button className="btn-gold" onClick={() => setShowPrint(true)} disabled={!plan.tasks.length}>
              Print Sheet
            </button>
          </div>
        </div>

        {/* ── Main nav ── */}
        <div className="main-nav">
          <button className={`nav-tab ${activeTab==="planner"?"active":""}`} onClick={() => setActiveTab("planner")}>📋 Visit Planner</button>
          <button className={`nav-tab ${activeTab==="recipes"?"active":""}`} onClick={() => setActiveTab("recipes")}>🍽 Recipe Box ({recipes.length})</button>
          <button className={`nav-tab ${activeTab==="sales"?"active":""}`} onClick={() => setActiveTab("sales")}>🏷 Weekly Sales{salesMatches.length > 0 ? ` (${salesMatches.length})` : ""}</button>
          <button className={`nav-tab ${activeTab==="preferences"?"active":""}`} onClick={() => setActiveTab("preferences")}>❤️ Preferences</button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: PLANNER */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "planner" && (
          <div className="content">
            {/* Visit day tabs */}
            <div className="visit-bar">
              <div className="visit-tabs">
                {(profile.housekeeperDays || ["Monday","Thursday"]).map(day => (
                  <button key={day} className={`vtab ${activeDay===day?"active":""}`} onClick={() => switchDay(day)}>{day}</button>
                ))}
              </div>
              <span style={{fontSize:12,color:"#7fb3aa"}}>Today is {todayName}</span>
            </div>

            {/* Greeting */}
            <div className="greeting-card">
              <div className="greeting-label">✦ Assistant</div>
              {greeting
                ? <div className={streamingGreeting ? "streaming-cursor" : ""}>{greeting}</div>
                : <div style={{color:"#9fcec4",fontSize:14}}>Generate a plan below — I will use your Recipe Box and food preferences automatically.</div>
              }
            </div>

            {/* Generate */}
            <button className="generate-btn" onClick={generatePlan} disabled={generating}>
              {generating ? <><div className="spinner"/>Generating {activeDay} plan…</> : `✦ Generate ${activeDay} Plan`}
            </button>

            {/* Tasks */}
            {plan.tasks.length > 0 && (
              <div className="section">
                <div className="section-header">
                  <div className="section-title">🧹 Tasks for {profile.housekeeperName}</div>
                  <span className="section-count">{plan.tasks.filter(t=>t.done).length}/{plan.tasks.length} done</span>
                </div>

                {/* Task toolbar */}
                <div className="task-toolbar">
                  <button className="task-tool-btn" onClick={() => { setShowTaskPanel(true); setTaskPanelTab("bulk"); }}>
                    📋 Add multiple
                  </button>
                  <button className="task-tool-btn" onClick={() => { setShowTaskPanel(true); setTaskPanelTab("ai"); }}>
                    ✦ AI suggest
                  </button>
                  <button className="task-tool-btn" onClick={() => { setShowTaskPanel(true); setTaskPanelTab("templates"); }}>
                    📁 Templates
                  </button>
                  <button className="task-tool-btn" style={{marginLeft:"auto",color:"#c0392b",borderColor:"#f0d0cc"}} onClick={() => { if(window.confirm("Remove all tasks from this plan?")) setPlan(p => ({...p, tasks:[]})); }}>
                    🗑 Clear all
                  </button>
                </div>

                <div className="tasks-card">
                  {plan.tasks.map(task => (
                    <div className="task-row" key={task.id}>
                      <div className={`task-check ${task.done?"done":""}`} onClick={() => toggleTask(task.id)}>
                        {task.done && <span style={{color:"#fff",fontSize:10}}>✓</span>}
                      </div>
                      <span className={`task-text ${task.done?"done":""}`}>{task.text}</span>
                      <select className="tag-select" value={task.tag} onChange={e => changeTaskTag(task.id, e.target.value)}>
                        <option value="routine">routine</option>
                        <option value="priority">priority</option>
                        <option value="seasonal">seasonal</option>
                      </select>
                      <button className="task-del" onClick={() => deleteTask(task.id)} title="Remove task">×</button>
                    </div>
                  ))}
                  <div className="add-row">
                    <input className="add-input" placeholder="Type a task and press Enter…" value={newTask}
                      onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key==="Enter" && addTask()} />
                    <button className="add-btn" onClick={addTask}>+</button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state — no tasks yet, show quick-start options */}
            {plan.tasks.length === 0 && !generating && (
              <div style={{marginBottom:18}}>
                <div style={{fontSize:13,color:"#4a7d77",marginBottom:10}}>No tasks yet — generate a plan above, or start quickly:</div>
                <div className="task-toolbar">
                  <button className="task-tool-btn" onClick={() => { setShowTaskPanel(true); setTaskPanelTab("templates"); }}>📁 Load a template</button>
                  <button className="task-tool-btn" onClick={() => { setShowTaskPanel(true); setTaskPanelTab("bulk"); }}>📋 Add tasks manually</button>
                  <button className="task-tool-btn" onClick={() => { setShowTaskPanel(true); setTaskPanelTab("ai"); }}>✦ Let AI suggest tasks</button>
                </div>
              </div>
            )}

            {/* Meals */}
            {plan.meals.length > 0 && (
              <div className="section">
                <div className="section-header">
                  <div className="section-title">🍽 Meals to Prep</div>
                </div>
                <div className="meals-grid">
                  {plan.meals.map(meal => (
                    <div className="meal-card" key={meal.id}>
                      <span className="meal-day-pill">{meal.day}</span>
                      <div className="meal-info">
                        <div className="meal-name">{meal.name}</div>
                        {meal.notes && <div className="meal-notes">{meal.notes}</div>}
                        {meal.fromRecipeBox && <div className="meal-source">★ From your recipe box</div>}
                      </div>
                      <div className="meal-actions">
                        <button className="meal-btn" onClick={() => swapMeal(meal)} disabled={swappingMeal===meal.id}>
                          {swappingMeal===meal.id ? "…" : "Swap"}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button className="add-meal-btn" onClick={addSuggestedMeal} disabled={addingMeal}>
                    {addingMeal ? "Thinking…" : "+ Suggest another meal"}
                  </button>
                </div>
              </div>
            )}

            {/* Shopping */}
            {plan.shopping.length > 0 && (
              <div className="section">
                <div className="section-header">
                  <div className="section-title">🛒 Shopping List</div>
                  <button className="link-btn" onClick={regenerateShopping}>↺ Refresh</button>
                </div>
                <div className="shop-card">
                  <div className="shop-grid">
                    {plan.shopping.map((item,i) => (
                      <div key={i} className={`shop-item ${checkedShop[i]?"checked":""}`} onClick={() => setCheckedShop(c => ({...c,[i]:!c[i]}))}>
                        <span className="shop-dot"/>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat */}
            {plan.tasks.length > 0 && (
              <div className="chat-bar">
                <div className="chat-bar-label">Ask anything about this plan</div>
                <div className="chat-input-row">
                  <input className="chat-input" placeholder="e.g. Add a garage task, or suggest a vegetarian option for Wednesday…"
                    value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==="Enter" && sendChat()} />
                  <button className="chat-send" onClick={sendChat} disabled={chatBusy}>{chatBusy ? "…" : "Ask"}</button>
                </div>
                {chatResponse && <div className="chat-response">{chatResponse}</div>}
              </div>
            )}

            {/* Action bar */}
            {plan.tasks.length > 0 && (
              <div className="action-bar">
                <button className="btn-outline" onClick={() => { setPlan({tasks:[],meals:[],shopping:[]}); setGreeting(""); setCheckedShop({}); }}>
                  🗑 Clear
                </button>
                <button className="btn-dark" onClick={() => setShowPrint(true)}>
                  📋 Preview & Print Instruction Sheet
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: RECIPE BOX */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "recipes" && (
          <div className="content">
            <div style={{marginBottom:14,color:"#4a7d77",fontSize:13,lineHeight:1.5}}>
              Save your family's favorite meals here. When you generate a plan, the AI will pull from this list first. Import from a photo, website, or just type a name and let the AI fill it in.
            </div>
            <div className="recipe-toolbar">
              <input className="search-input" placeholder="Search recipes…" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} />
              <select className="filter-select" value={recipeFilter} onChange={e => setRecipeFilter(e.target.value)}>
                <option value="All">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn-gold" onClick={() => { setShowImport(true); setImportTab("photo"); setImportedRecipes([]); setPhotoPreview(null); setPasteText(""); setNameText(""); setBulkText(""); }}>
                ＋ Import
              </button>
            </div>
            <div className="recipes-grid">
              {filteredRecipes.map(r => (
                <div className="recipe-card" key={r.id}>
                  <div className="recipe-cat">{r.category}</div>
                  <div className="recipe-name">{r.name}</div>
                  <div className="recipe-meta">Prep {r.prepTime} · Cook {r.cookTime}</div>
                  {r.notes && <div className="recipe-notes">{r.notes}</div>}
                  {r.ingredients && <div className="recipe-notes" style={{marginTop:4,color:"#7fb3aa",fontSize:11}}>Ingredients: {r.ingredients}</div>}
                  <div className="recipe-actions">
                    <button className="recipe-action-btn" onClick={() => openEditRecipe(r)}>Edit</button>
                    <button className="recipe-action-btn danger" onClick={() => deleteRecipe(r.id)}>Remove</button>
                  </div>
                </div>
              ))}
              <div className="add-recipe-card" onClick={openNewRecipe}>
                <span>+</span>
                <span>Add a recipe</span>
              </div>
            </div>
            {filteredRecipes.length === 0 && recipes.length > 0 && (
              <div className="empty-state"><span>🔍</span>No recipes match your search.</div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: FOOD PREFERENCES */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "preferences" && (
          <div className="content">
            <div style={{marginBottom:16,color:"#4a7d77",fontSize:13,lineHeight:1.5}}>
              Fill in your family's food preferences below. The more detail you add, the better the meal suggestions will be. This information is sent to the AI every time you generate a plan.
            </div>
            <PreferencesForm profile={profile} setProfile={setProfile} showToast={showToast} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: WEEKLY SALES                                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "sales" && (
          <div className="content">

            {/* Recommended summary — shown when matches exist */}
            {salesRecommended.length > 0 && (
              <div className="sale-summary-card" style={{marginBottom:20}}>
                <div className="sale-summary-title">✦ Best recipes to make this week</div>
                <div className="sale-summary-sub">
                  Based on {salesMatches.length} sale item{salesMatches.length>1?"s":""} matched
                  {salesWeekOf ? ` · Week of ${salesWeekOf}` : ""}
                </div>
                <div className="sale-recommended">
                  {salesRecommended.map((rec,i) => (
                    <div className="sale-rec-card" key={i}>
                      <div className="sale-rec-name">{rec.recipeName}</div>
                      <div className="sale-rec-why">{rec.reason}</div>
                      <button onClick={() => useSaleRecipeInPlanner(rec.recipeName)}
                        style={{marginTop:7,fontSize:11,padding:"4px 10px",borderRadius:5,border:"1px solid rgba(201,169,110,0.4)",background:"transparent",color:"#7fcdb9",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                        Add to planner →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Method selector ── */}
            <div style={{fontSize:13,fontWeight:500,color:"#1e5f5a",marginBottom:10}}>
              {salesMatches.length > 0 ? "Scan again or add more deals:" : "Find this week's deals:"}
            </div>

            <div className="sales-input-tabs">
              {[
                ["flipp",  "⚡ Flipp (easiest)"],
                ["paste",  "📋 Paste Ad Text"],
                ["photo",  "📷 Upload Photo"],
                ["manual", "✏️ Manual Entry"],
              ].map(([k,label]) => (
                <button key={k} className={`import-tab ${salesInputTab===k?"active":""}`}
                  onClick={() => setSalesInputTab(k)}>{label}</button>
              ))}
            </div>

            {/* ══ FLIPP TAB ══════════════════════════════════════════════════ */}
            {salesInputTab === "flipp" && (
              <div>
                {/* Explainer */}
                <div style={{background:"#fff",border:"1px solid #d9ece8",borderLeft:"3px solid #7fcdb9",borderRadius:8,padding:"13px 16px",marginBottom:16,fontSize:13,color:"#2d5f59",lineHeight:1.65}}>
                  <strong style={{display:"block",marginBottom:4}}>⚡ The fastest way — Flipp aggregates Publix & Walmart ads automatically</strong>
                  Click a button below to search Flipp for your ingredients. Flipp opens in a panel alongside your recipe list.
                  Copy any deals you find, paste them back here, and the AI matches them to your recipes instantly.
                  Takes about 60 seconds total — no hunting for the weekly ad yourself.
                </div>

                {/* Store + ingredient quick-launch buttons */}
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                    <button className="btn-gold" style={{fontSize:13,padding:"9px 16px"}}
                      onClick={() => {
                        const terms = allFlippIngredients.slice(0,10).join(" OR ");
                        window.open(`https://flipp.com/search?term=${encodeURIComponent(terms)}&locale=en-US`, "_blank");
                      }}>
                      🔍 Search All My Ingredients on Flipp
                    </button>
                  </div>

                  {/* ── Recipe ingredients ── */}
                  <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"#7fb3aa",fontWeight:500,marginBottom:7}}>
                    From your Recipe Box — click any to search on Flipp:
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
                    {uniqueIngredients.slice(0,24).map((ing,i) => (
                      <button key={i}
                        style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"4px 11px",borderRadius:12,border:"1px solid #a8d4cb",background:"#fff",color:"#2d5f59",cursor:"pointer",transition:"all 0.15s"}}
                        onClick={() => window.open(`https://flipp.com/search?term=${encodeURIComponent(ing)}&locale=en-US`, "_blank")}
                        onMouseOver={e => e.target.style.borderColor="#7fcdb9"}
                        onMouseOut={e => e.target.style.borderColor="#a8d4cb"}
                      >{ing}</button>
                    ))}
                    {uniqueIngredients.length === 0 && (
                      <span style={{fontSize:12,color:"#7fb3aa"}}>Add recipes to your Recipe Box — ingredients appear here automatically.</span>
                    )}
                  </div>

                  {/* ── Standing ingredients ── */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
                    <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"#7fcdb9",fontWeight:500}}>
                      Standing Watch List — staples & household items:
                    </div>
                    <button className="link-btn" onClick={() => setShowManageStanding(true)}>
                      Manage list
                    </button>
                  </div>
                  <div style={{background:"#eaf7f3",border:"1px solid #d4ede5",borderRadius:9,padding:"10px 12px",marginBottom:14}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                      {standingIngredients.map((ing,i) => (
                        <button key={i}
                          style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"4px 11px",borderRadius:12,border:"1px solid #a3d8c9",background:"#fff",color:"#2d7a6f",cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}
                          onClick={() => window.open(`https://flipp.com/search?term=${encodeURIComponent(ing)}&locale=en-US`, "_blank")}
                          onMouseOver={e => e.currentTarget.style.borderColor="#7fcdb9"}
                          onMouseOut={e => e.currentTarget.style.borderColor="#a3d8c9"}
                        >
                          {ing}
                          <span
                            style={{fontSize:13,color:"#9fcec4",marginLeft:2,lineHeight:1}}
                            onClick={e => { e.stopPropagation(); removeStandingItem(ing); }}
                            title="Remove from list"
                          >×</span>
                        </button>
                      ))}
                      {standingIngredients.length === 0 && (
                        <span style={{fontSize:12,color:"#7fb3aa"}}>No standing items yet — click Manage list to add your staples.</span>
                      )}
                    </div>
                    {/* Quick-add row */}
                    <div style={{display:"flex",gap:7,alignItems:"center"}}>
                      <input
                        style={{flex:1,border:"1px solid #a3d8c9",borderRadius:6,padding:"6px 10px",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#1e5f5a",background:"#fff",outline:"none"}}
                        placeholder="Quick-add an item, e.g. butter, paper towels…"
                        value={newStandingItem}
                        onChange={e => setNewStandingItem(e.target.value)}
                        onKeyDown={e => { if(e.key==="Enter"){ addStandingItem(newStandingItem); } }}
                      />
                      <button
                        style={{background:"#7fcdb9",border:"none",borderRadius:6,padding:"6px 12px",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,color:"#1e5f5a",cursor:"pointer"}}
                        onClick={() => addStandingItem(newStandingItem)}
                      >Add</button>
                    </div>
                  </div>

                  {/* Direct store ad links */}
                  <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"#7fb3aa",fontWeight:500,marginBottom:7}}>
                    Or go straight to this week's store circulars on Flipp:
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
                    <button
                      style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"7px 14px",borderRadius:7,border:"none",background:"#1a5e38",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}
                      onClick={() => window.open("https://flipp.com/flyers/publix", "_blank")}>
                      🛒 Publix on Flipp
                    </button>
                    <button
                      style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"7px 14px",borderRadius:7,border:"none",background:"#0071ce",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}
                      onClick={() => window.open("https://flipp.com/flyers/walmart", "_blank")}>
                      🛒 Walmart on Flipp
                    </button>
                    <button
                      style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"7px 14px",borderRadius:7,border:"1px solid #a8d4cb",background:"#fff",color:"#2d5f59",cursor:"pointer"}}
                      onClick={() => window.open("https://flipp.com", "_blank")}>
                      Open Flipp ↗
                    </button>
                  </div>

                  {/* Step 2: Paste results back */}
                  <div style={{background:"#e8f5f1",borderRadius:8,padding:"13px 15px",marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:500,color:"#1e5f5a",marginBottom:6}}>
                      Step 2 — Paste the deals you found back here:
                    </div>
                    <div style={{fontSize:12,color:"#4a7d77",marginBottom:10,lineHeight:1.5}}>
                      On Flipp, when you find a sale or BOGO that catches your eye, copy the item name and deal (e.g. "Chicken thighs BOGO, Pork shoulder $1.49/lb"). Paste everything you found into the box below — the AI will do the rest.
                    </div>
                    <textarea
                      style={{width:"100%",border:"1px solid #d9ece8",borderRadius:7,padding:"9px 11px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none",resize:"vertical",minHeight:90,marginBottom:10}}
                      placeholder={"Paste deals you found on Flipp here, for example:\n\nChicken thighs BOGO\nGround beef $3.99/lb\nPasta sauce 2 for $4\nSalmon fillets 40% off"}
                      value={salesText}
                      onChange={e => setSalesText(e.target.value)}
                    />
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <select
                        style={{border:"1px solid #d9ece8",borderRadius:7,padding:"7px 10px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none",cursor:"pointer"}}
                        value={manualSaleStore} onChange={e => setManualSaleStore(e.target.value)}>
                        <option>Publix</option>
                        <option>Walmart</option>
                        <option>Both</option>
                      </select>
                      <button className="generate-btn" style={{flex:1,margin:0,padding:"10px 16px",fontSize:13}}
                        onClick={handleSalesTextScan}
                        disabled={salesProcessing || !salesText.trim()}>
                        {salesProcessing
                          ? <><div className="spinner"/>Matching to your recipes…</>
                          : "✦ Match Deals to My Recipes"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ PASTE TAB ══════════════════════════════════════════════════ */}
            {salesInputTab === "paste" && (
              <div>
                <p style={{fontSize:13,color:"#4a7d77",marginBottom:10,lineHeight:1.5}}>
                  Go to <strong>publix.com/savings/weekly-ad</strong> or <strong>walmart.com/grocery/savings</strong>, select all the text (Cmd+A on Mac, Ctrl+A on Windows), copy it, and paste below. The AI will extract just the relevant deals.
                </p>
                <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
                  <select style={{border:"1px solid #d9ece8",borderRadius:7,padding:"7px 10px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none",cursor:"pointer"}}
                    value={manualSaleStore} onChange={e => setManualSaleStore(e.target.value)}>
                    <option>Publix</option><option>Walmart</option><option>Both</option>
                  </select>
                  <div style={{display:"flex",gap:6}}>
                    <button style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,padding:"5px 11px",borderRadius:6,border:"none",background:"#1a5e38",color:"#fff",cursor:"pointer"}}
                      onClick={() => window.open("https://www.publix.com/savings/weekly-ad","_blank")}>
                      Open Publix Ad ↗
                    </button>
                    <button style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,padding:"5px 11px",borderRadius:6,border:"none",background:"#0071ce",color:"#fff",cursor:"pointer"}}
                      onClick={() => window.open("https://www.walmart.com/store/finder?location=tampa+fl&distance=50","_blank")}>
                      Open Walmart Ad ↗
                    </button>
                  </div>
                </div>
                <textarea
                  style={{width:"100%",border:"1px solid #d9ece8",borderRadius:8,padding:"10px 12px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none",resize:"vertical",minHeight:130}}
                  placeholder="Paste the full weekly ad text here — it can be messy and long, the AI will sort it out…"
                  value={salesText} onChange={e => setSalesText(e.target.value)}
                />
                <button className="generate-btn" style={{marginTop:10}}
                  onClick={handleSalesTextScan} disabled={salesProcessing || !salesText.trim()}>
                  {salesProcessing ? <><div className="spinner"/>Scanning…</> : "✦ Scan for Sales on My Ingredients"}
                </button>
              </div>
            )}

            {/* ══ PHOTO TAB ══════════════════════════════════════════════════ */}
            {salesInputTab === "photo" && (
              <div>
                <p style={{fontSize:13,color:"#4a7d77",marginBottom:10,lineHeight:1.5}}>
                  Photograph the printed Publix or Walmart circular that comes in the mail, or take a screenshot of the ad on your phone and upload it here.
                </p>
                <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
                  <select style={{border:"1px solid #d9ece8",borderRadius:7,padding:"7px 10px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none",cursor:"pointer"}}
                    value={manualSaleStore} onChange={e => setManualSaleStore(e.target.value)}>
                    <option>Publix</option><option>Walmart</option><option>Both</option>
                  </select>
                </div>
                <label>
                  <div className="drop-zone"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) handleSalesPhotoScan(f); }}>
                    {salesPhoto
                      ? <img src={salesPhoto} alt="ad" style={{maxWidth:"100%",maxHeight:200,borderRadius:6,objectFit:"contain"}} />
                      : <>
                          <div className="drop-zone-icon">📰</div>
                          <div className="drop-zone-title">Tap to upload a photo of the weekly ad</div>
                          <div className="drop-zone-sub">Printed circular, newspaper insert, or screenshot · JPG, PNG</div>
                        </>
                    }
                    <input type="file" accept="image/*" onChange={e => handleSalesPhotoScan(e.target.files[0])} />
                  </div>
                </label>
                {salesProcessing && (
                  <div className="processing-bar" style={{marginTop:12}}>
                    <div className="spinner"/>
                    <p>Scanning the ad for your ingredients…</p>
                  </div>
                )}
              </div>
            )}

            {/* ══ MANUAL TAB ═════════════════════════════════════════════════ */}
            {salesInputTab === "manual" && (
              <div>
                <p style={{fontSize:13,color:"#4a7d77",marginBottom:12,lineHeight:1.5}}>
                  Spotted a deal at the store or heard about one? Add it here — the AI will match it to your recipes automatically.
                </p>
                <div className="manual-sale-row">
                  <input style={{flex:2,minWidth:140,border:"1px solid #d9ece8",borderRadius:7,padding:"8px 11px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none"}}
                    placeholder="Item name, e.g. Chicken thighs"
                    value={manualSaleItem} onChange={e => setManualSaleItem(e.target.value)} />
                  <input style={{flex:1,minWidth:100,border:"1px solid #d9ece8",borderRadius:7,padding:"8px 11px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none"}}
                    placeholder="e.g. BOGO or $1.99/lb"
                    value={manualSalePrice} onChange={e => setManualSalePrice(e.target.value)} />
                </div>
                <div className="manual-sale-row">
                  <select style={{flex:1,border:"1px solid #d9ece8",borderRadius:7,padding:"8px 10px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none",cursor:"pointer"}}
                    value={manualSaleType} onChange={e => setManualSaleType(e.target.value)}>
                    <option>BOGO</option><option>Sale</option><option>Markdown</option>
                  </select>
                  <select style={{flex:1,border:"1px solid #d9ece8",borderRadius:7,padding:"8px 10px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none",cursor:"pointer"}}
                    value={manualSaleStore} onChange={e => setManualSaleStore(e.target.value)}>
                    <option>Publix</option><option>Walmart</option>
                  </select>
                  <button className="btn-gold" style={{flex:1}} onClick={addManualSaleItem} disabled={!manualSaleItem.trim()}>
                    Add Item
                  </button>
                </div>
              </div>
            )}

            {/* ══ Sale match results ══════════════════════════════════════════ */}
            {salesMatches.length > 0 && (
              <div style={{marginTop:24}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontSize:15,fontFamily:"'Playfair Display',serif",fontWeight:500,color:"#1e5f5a"}}>
                    {salesMatches.length} matched sale item{salesMatches.length>1?"s":""}
                    {salesWeekOf && <span style={{fontSize:12,color:"#7fb3aa",fontFamily:"'DM Sans',sans-serif",fontWeight:400,marginLeft:8}}>Week of {salesWeekOf}</span>}
                  </div>
                  <button className="link-btn" onClick={() => { setSalesMatches([]); setSalesRecommended([]); setSalesWeekOf(""); }}>Clear all</button>
                </div>

                {salesMatches.map((match, idx) => (
                  <div className="sale-match-card" key={idx}>
                    <div className="sale-match-header">
                      <span className="sale-item-name">{match.item}</span>
                      <span className={`sales-badge ${match.saleType==="BOGO"?"badge-bogo":match.saleType==="Markdown"?"badge-markdown":"badge-sale"}`}>
                        {match.saleType}
                      </span>
                      <span className={`sale-store-pill ${(match.store||manualSaleStore)==="Walmart"?"store-walmart":"store-publix"}`}>
                        {match.store||manualSaleStore}
                      </span>
                      <button className="task-del" onClick={() => removeSaleMatch(idx)}>×</button>
                    </div>
                    <div className="sale-price">
                      {match.saleDetail}
                      {match.originalPrice && <span style={{color:"#7fb3aa",fontWeight:400,marginLeft:8,textDecoration:"line-through",fontSize:12}}>{match.originalPrice}</span>}
                    </div>
                    {match.relevantRecipes?.length > 0 && (
                      <div className="sale-recipes">
                        <div className="sale-recipes-label">Recipes that use this:</div>
                        {match.relevantRecipes.map((r,i) => (
                          <button key={i} className="sale-recipe-chip" onClick={() => useSaleRecipeInPlanner(r)}>{r} →</button>
                        ))}
                      </div>
                    )}
                    {(!match.relevantRecipes || match.relevantRecipes.length===0) && (
                      <div style={{fontSize:12,color:"#7fb3aa",marginTop:6}}>No matching recipes yet — add recipes using {match.item} to your Recipe Box.</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {salesMatches.length === 0 && !salesProcessing && (
              <div className="empty-state" style={{marginTop:20}}>
                <span>🏷</span>
                <div>No deals scanned yet this week.</div>
                <div style={{fontSize:12,marginTop:6,lineHeight:1.6}}>
                  Use the <strong>⚡ Flipp</strong> tab above for the fastest experience — search your ingredients on Flipp, paste back the deals you find, and the AI matches everything to your recipes automatically.
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="panel-overlay" onClick={e => e.target===e.currentTarget && setShowSettings(false)}>
          <div className="panel">
            <h2>Household Profile</h2>
            <div className="panel-section-title">Household</div>
            <div className="field">
              <label>Housekeeper's Name</label>
              <input value={draftProfile.housekeeperName} onChange={e => setDraftProfile(p=>({...p,housekeeperName:e.target.value}))} />
            </div>
            <div className="field">
              <label>Family Members</label>
              <input value={draftProfile.members} onChange={e => setDraftProfile(p=>({...p,members:e.target.value}))} />
              <div className="field-hint">e.g. Husband, two college-age boys home for summer</div>
            </div>
            <div className="field">
              <label>Visit Days (comma separated)</label>
              <input value={(draftProfile.housekeeperDays||[]).join(", ")} onChange={e => setDraftProfile(p=>({...p,housekeeperDays:e.target.value.split(",").map(d=>d.trim()).filter(Boolean)}))} />
            </div>
            <div className="panel-section-title">Tasks</div>
            <div className="field">
              <label>Standard Tasks (baseline for every visit)</label>
              <textarea rows={3} value={draftProfile.standardTasks} onChange={e => setDraftProfile(p=>({...p,standardTasks:e.target.value}))} />
            </div>
            <div className="field">
              <label>Extra Notes</label>
              <textarea rows={2} value={draftProfile.extraNotes} onChange={e => setDraftProfile(p=>({...p,extraNotes:e.target.value}))} />
              <div className="field-hint">Seasonal situations, recurring reminders, special instructions</div>
            </div>
            <div className="panel-actions">
              <button className="btn-cancel" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="btn-save" onClick={saveSettings}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recipe Form ── */}
      {showRecipeForm && (
        <div className="panel-overlay" onClick={e => e.target===e.currentTarget && setShowRecipeForm(false)}>
          <div className="panel">
            <h2>{editingRecipe ? "Edit Recipe" : "Add a Recipe"}</h2>
            <div className="field">
              <label>Recipe Name</label>
              <input placeholder="e.g. Mom's Pot Roast" value={draftRecipe.name} onChange={e => setDraftRecipe(r=>({...r,name:e.target.value}))} />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={draftRecipe.category} onChange={e => setDraftRecipe(r=>({...r,category:e.target.value}))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div className="field">
                <label>Prep Time</label>
                <input placeholder="e.g. 20 min" value={draftRecipe.prepTime} onChange={e => setDraftRecipe(r=>({...r,prepTime:e.target.value}))} />
              </div>
              <div className="field">
                <label>Cook Time</label>
                <input placeholder="e.g. 1 hr" value={draftRecipe.cookTime} onChange={e => setDraftRecipe(r=>({...r,cookTime:e.target.value}))} />
              </div>
            </div>
            <div className="field">
              <label>Family Notes</label>
              <textarea rows={2} placeholder="e.g. Boys love this. Double the recipe. Good for Sundays." value={draftRecipe.notes} onChange={e => setDraftRecipe(r=>({...r,notes:e.target.value}))} />
              <div className="field-hint">Any tips, preferences, or serving suggestions your housekeeper should know</div>
            </div>
            <div className="field">
              <label>Main Ingredients</label>
              <textarea rows={2} placeholder="e.g. Chicken thighs, garlic, lemon, rosemary, potatoes, olive oil" value={draftRecipe.ingredients} onChange={e => setDraftRecipe(r=>({...r,ingredients:e.target.value}))} />
              <div className="field-hint">Used to build the shopping list automatically</div>
            </div>
            <div className="panel-actions">
              <button className="btn-cancel" onClick={() => setShowRecipeForm(false)}>Cancel</button>
              <button className="btn-save" onClick={saveRecipe}>{editingRecipe ? "Save Changes" : "Add Recipe"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Sheet ── */}
      {showPrint && (
        <div className="panel-overlay" onClick={e => e.target===e.currentTarget && setShowPrint(false)}>
          <div className="print-panel">
            <div className="print-header">
              <h2>Instructions for {profile.housekeeperName} — {activeDay}</h2>
              <p>{today.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
            </div>
            {plan.tasks.length > 0 && (
              <div className="print-section">
                <h3>🧹 Tasks</h3>
                {plan.tasks.map(t => (
                  <div className="print-task" key={t.id}>
                    {t.text}{t.tag!=="routine" && <span style={{fontSize:11,color:"#7fb3aa"}}> ({t.tag})</span>}
                  </div>
                ))}
              </div>
            )}
            {plan.meals.length > 0 && (
              <div className="print-section">
                <h3>🍽 Meals to Prepare</h3>
                {plan.meals.map(m => (
                  <div className="print-meal" key={m.id}>
                    <span className="print-meal-day">{m.day}</span>
                    <span>{m.name}{m.notes ? ` — ${m.notes}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
            {plan.shopping.length > 0 && (
              <div className="print-section">
                <h3>🛒 Shopping List</h3>
                <div className="print-shop-grid">
                  {plan.shopping.map((item,i) => <div className="print-shop-item" key={i}>{item}</div>)}
                </div>
              </div>
            )}
            {greeting && <div className="print-note">{greeting}</div>}
            <div className="panel-actions" style={{marginTop:18,borderTop:"1px solid #d9ece8",paddingTop:14}}>
              <button className="btn-cancel" onClick={() => setShowPrint(false)}>Close</button>
              <button className="btn-save" onClick={() => window.print()}>🖨 Print</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Task Panel Modal ── */}
      {showTaskPanel && (
        <div className="panel-overlay" onClick={e => e.target===e.currentTarget && setShowTaskPanel(false)}>
          <div className="panel" style={{maxWidth:500}}>
            <h2>Add Tasks</h2>

            <div className="import-tabs">
              {[["bulk","📋 Add a List"],["ai","✦ AI Suggest"],["templates","📁 Templates"]].map(([k,label]) => (
                <button key={k} className={`import-tab ${taskPanelTab===k?"active":""}`} onClick={() => setTaskPanelTab(k)}>{label}</button>
              ))}
            </div>

            {/* BULK ADD */}
            {taskPanelTab === "bulk" && (
              <div>
                <p style={{fontSize:13,color:"#4a7d77",marginBottom:12,lineHeight:1.5}}>
                  Type one task per line. All of them will be added to the list at once. Great for pasting in a list from your Notes app or an email.
                </p>
                <textarea
                  className="bulk-textarea"
                  placeholder={"One task per line, for example:\n\nClean all bathrooms\nWash and fold boys' laundry\nVacuum upstairs bedrooms\nWipe down patio furniture\nPrep chicken for Tuesday dinner"}
                  value={bulkTaskText}
                  onChange={e => setBulkTaskText(e.target.value)}
                />
                {bulkTaskText.trim() && (
                  <div style={{fontSize:12,color:"#7fcdb9",marginTop:6,fontWeight:500}}>
                    {bulkTaskText.trim().split("\n").filter(l=>l.trim()).length} tasks to add
                  </div>
                )}
                <div className="panel-actions">
                  <button className="btn-cancel" onClick={() => setShowTaskPanel(false)}>Cancel</button>
                  <button className="btn-save" onClick={addBulkTasks} disabled={!bulkTaskText.trim()}>Add to List</button>
                </div>
              </div>
            )}

            {/* AI SUGGEST */}
            {taskPanelTab === "ai" && (
              <div>
                <p style={{fontSize:13,color:"#4a7d77",marginBottom:12,lineHeight:1.5}}>
                  Describe a situation in plain English and the AI will suggest specific tasks to add. It already knows what's on your list and won't repeat anything.
                </p>
                <input
                  className="ai-task-input"
                  placeholder="e.g. The boys are having friends over Friday night, or It hasn't been deep cleaned in two weeks, or We had a big dinner party last weekend…"
                  value={aiTaskPrompt}
                  onChange={e => setAiTaskPrompt(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && suggestTasksWithAI()}
                />
                <div style={{fontSize:12,color:"#7fb3aa",marginTop:6,marginBottom:14,lineHeight:1.5}}>
                  The AI will suggest 2–5 relevant tasks based on what you describe.
                </div>
                <div className="panel-actions">
                  <button className="btn-cancel" onClick={() => setShowTaskPanel(false)}>Cancel</button>
                  <button className="btn-save" onClick={suggestTasksWithAI} disabled={aiTaskBusy||!aiTaskPrompt.trim()}>
                    {aiTaskBusy ? "Thinking…" : "Suggest Tasks"}
                  </button>
                </div>
              </div>
            )}

            {/* TEMPLATES */}
            {taskPanelTab === "templates" && (
              <div>
                <p style={{fontSize:13,color:"#4a7d77",marginBottom:14,lineHeight:1.5}}>
                  Save your own reusable checklists and load them in one click. The app comes with a few starter templates — edit or delete them as you like.
                </p>

                {templates.map(tmpl => (
                  <div key={tmpl.id} style={{background:"#fff",border:"1px solid #d9ece8",borderRadius:9,padding:"11px 13px",marginBottom:9}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:14,fontWeight:500,color:"#1e5f5a"}}>{tmpl.name}</span>
                      <div style={{display:"flex",gap:6}}>
                        <button className="recipe-action-btn" onClick={() => loadTemplate(tmpl)}>Load</button>
                        <button className="recipe-action-btn danger" onClick={() => deleteTemplate(tmpl.id)}>Remove</button>
                      </div>
                    </div>
                    <div style={{fontSize:12,color:"#7fb3aa",lineHeight:1.5}}>
                      {tmpl.tasks.slice(0,3).join(" · ")}{tmpl.tasks.length > 3 ? ` · +${tmpl.tasks.length - 3} more` : ""}
                    </div>
                  </div>
                ))}

                <div style={{borderTop:"1px dashed #d9ece8",paddingTop:14,marginTop:6}}>
                  <div style={{fontSize:12,color:"#4a7d77",marginBottom:8,fontWeight:500}}>Save current task list as a new template:</div>
                  <div style={{display:"flex",gap:8}}>
                    <input
                      style={{flex:1,border:"1px solid #d9ece8",borderRadius:7,padding:"8px 11px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none"}}
                      placeholder="Template name, e.g. Deep Clean Monday"
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      onKeyDown={e => e.key==="Enter" && saveCurrentAsTemplate()}
                    />
                    <button className="btn-save" style={{flex:"0 0 auto",padding:"8px 14px"}} onClick={saveCurrentAsTemplate}>Save</button>
                  </div>
                  <div style={{fontSize:11,color:"#7fb3aa",marginTop:5}}>Saves all {plan.tasks.length} tasks currently on the {activeDay} plan</div>
                </div>

                <div className="panel-actions" style={{marginTop:16}}>
                  <button className="btn-cancel" onClick={() => setShowTaskPanel(false)}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {showImport && (
        <div className="panel-overlay" onClick={e => e.target===e.currentTarget && setShowImport(false)}>
          <div className="panel" style={{maxWidth:560}}>
            <h2>Import Recipes</h2>

            <div className="import-tabs">
              {[["photo","📷 From Photo"],["paste","📋 Paste Text"],["name","✏️ By Name"],["bulk","📦 Bulk List"]].map(([k,label]) => (
                <button key={k} className={`import-tab ${importTab===k?"active":""}`} onClick={() => { setImportTab(k); setImportedRecipes([]); }}>{label}</button>
              ))}
            </div>

            {/* PHOTO TAB */}
            {importTab === "photo" && (
              <div>
                <p style={{fontSize:13,color:"#4a7d77",marginBottom:12,lineHeight:1.5}}>Take a photo of a recipe card, cookbook page, or printed recipe. The AI will read it and fill everything in automatically.</p>
                <label>
                  <div className={`drop-zone ${dragOver?"drag-over":""}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if(f) handlePhotoUpload(f); }}
                  >
                    {photoPreview
                      ? <img src={photoPreview} alt="recipe" style={{maxWidth:"100%",maxHeight:180,borderRadius:6,objectFit:"contain"}} />
                      : <>
                          <div className="drop-zone-icon">📷</div>
                          <div className="drop-zone-title">Tap to choose a photo</div>
                          <div className="drop-zone-sub">Or drag and drop an image here · JPG, PNG, HEIC</div>
                        </>
                    }
                    <input type="file" accept="image/*" onChange={e => handlePhotoUpload(e.target.files[0])} />
                  </div>
                </label>
                {photoPreview && !importProcessing && !importedRecipes.length && (
                  <button className="btn-save" style={{marginTop:12,width:"100%"}} onClick={() => {}}>Re-scan image</button>
                )}
              </div>
            )}

            {/* PASTE TAB */}
            {importTab === "paste" && (
              <div>
                <p style={{fontSize:13,color:"#4a7d77",marginBottom:12,lineHeight:1.5}}>Copy a recipe from any website, email, or document and paste it below. Works with one recipe or several at once.</p>
                <textarea
                  style={{width:"100%",border:"1px solid #d9ece8",borderRadius:8,padding:"10px 12px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none",resize:"vertical",minHeight:140}}
                  placeholder={"Paste recipe text here...\n\nFor example, copy from AllRecipes, a food blog, an email from a friend, or type out your own."}
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                />
                <button className="btn-save" style={{marginTop:10,width:"100%"}} onClick={handlePasteImport} disabled={importProcessing||!pasteText.trim()}>
                  {importProcessing ? "Reading…" : "Extract Recipe"}
                </button>
              </div>
            )}

            {/* NAME TAB */}
            {importTab === "name" && (
              <div>
                <p style={{fontSize:13,color:"#4a7d77",marginBottom:12,lineHeight:1.5}}>Type the name of any dish — the AI will fill in the category, ingredients, and cook time. You can edit the details before saving.</p>
                <input
                  style={{width:"100%",border:"1px solid #d9ece8",borderRadius:8,padding:"10px 12px",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#1e5f5a",background:"#fff",outline:"none"}}
                  placeholder="e.g. Mom's Chicken Soup, Beef Tacos, Shrimp Scampi…"
                  value={nameText}
                  onChange={e => setNameText(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleNameImport()}
                />
                <button className="btn-save" style={{marginTop:10,width:"100%"}} onClick={handleNameImport} disabled={importProcessing||!nameText.trim()}>
                  {importProcessing ? "Looking up recipe…" : "Fill In Recipe Details"}
                </button>
              </div>
            )}

            {/* BULK TAB */}
            {importTab === "bulk" && (
              <div>
                <p style={{fontSize:13,color:"#4a7d77",marginBottom:12,lineHeight:1.5}}>Type or paste a list of meal names — one per line. The AI will generate details for all of them at once. Great for loading up your recipe box quickly.</p>
                <textarea
                  style={{width:"100%",border:"1px solid #d9ece8",borderRadius:8,padding:"10px 12px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none",resize:"vertical",minHeight:140}}
                  placeholder={"One recipe name per line, for example:\n\nLemon Herb Roasted Chicken\nPasta Bolognese\nBBQ Ribs\nVegetable Stir Fry\nChicken Enchiladas"}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                />
                {bulkText.trim() && <div className="bulk-count">{bulkText.trim().split("\n").filter(l=>l.trim()).length} recipes to import</div>}
                <button className="btn-save" style={{marginTop:10,width:"100%"}} onClick={handleBulkImport} disabled={importProcessing||!bulkText.trim()}>
                  {importProcessing ? "Generating details…" : "Generate All Recipe Details"}
                </button>
              </div>
            )}

            {/* Processing spinner */}
            {importProcessing && (
              <div className="processing-bar">
                <div className="spinner" />
                <p>Reading your recipe{importTab==="bulk"?"s":""}…</p>
              </div>
            )}

            {/* Results */}
            {importedRecipes.length > 0 && (
              <div style={{marginTop:16}}>
                <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"#7fcdb9",fontWeight:500,marginBottom:8}}>
                  {importedRecipes.length} recipe{importedRecipes.length>1?"s":""} found — select which to add:
                </div>
                <div className="import-results">
                  {importedRecipes.map(r => (
                    <div key={r.id} className={`import-result-card ${isSelected(r.id)?"selected":""}`}>
                      <div style={{flex:1}}>
                        <div className="import-result-name">{r.name}</div>
                        <div className="import-result-meta">{r.category} · Prep {r.prepTime||"?"} · Cook {r.cookTime||"?"}</div>
                        {r.ingredients && <div style={{fontSize:11,color:"#7fb3aa",marginTop:3}}>{r.ingredients}</div>}
                        {r.notes && <div style={{fontSize:12,color:"#4a7d77",marginTop:3}}>{r.notes}</div>}
                      </div>
                      <button className={`import-select-btn ${isSelected(r.id)?"on":""}`} onClick={() => toggleImportSelect(r.id)}>
                        {isSelected(r.id) ? "✓ Selected" : "Select"}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="panel-actions" style={{marginTop:14}}>
                  <button className="btn-cancel" onClick={() => setShowImport(false)}>Cancel</button>
                  <button className="btn-save" onClick={addSelectedToBox}>
                    Add {importedRecipes.filter(r=>isSelected(r.id)).length} to Recipe Box
                  </button>
                </div>
              </div>
            )}

            {!importProcessing && !importedRecipes.length && (
              <div className="panel-actions" style={{marginTop:18}}>
                <button className="btn-cancel" onClick={() => setShowImport(false)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Manage Standing Ingredients Modal ── */}
      {showManageStanding && (
        <div className="panel-overlay" onClick={e => e.target===e.currentTarget && setShowManageStanding(false)}>
          <div className="panel" style={{maxWidth:500}}>
            <h2>Standing Watch List</h2>
            <p style={{fontSize:13,color:"#4a7d77",marginBottom:16,lineHeight:1.6}}>
              These are items you always want to watch for deals on — staples, household supplies, bulk items, snacks. They're separate from your recipe ingredients and show up permanently in the Flipp search section every week.
            </p>

            {/* Current list */}
            <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:"#7fcdb9",fontWeight:500,marginBottom:8}}>
              Your current list ({standingIngredients.length} items)
            </div>
            <div style={{background:"#fff",border:"1px solid #d9ece8",borderRadius:9,padding:"10px 12px",marginBottom:16,minHeight:60}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {standingIngredients.map((ing,i) => (
                  <span key={i} style={{display:"inline-flex",alignItems:"center",gap:5,fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"4px 10px",borderRadius:12,border:"1px solid #d9ece8",background:"#f4faf9",color:"#2d5f59"}}>
                    {ing}
                    <button style={{background:"none",border:"none",cursor:"pointer",color:"#9fcec4",fontSize:14,padding:0,lineHeight:1}}
                      onClick={() => removeStandingItem(ing)}>×</button>
                  </span>
                ))}
                {standingIngredients.length === 0 && <span style={{fontSize:12,color:"#7fb3aa"}}>No items yet.</span>}
              </div>
            </div>

            {/* Add one at a time */}
            <div className="panel-section-title" style={{marginTop:0}}>Add items one at a time</div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <input className="field" style={{flex:1,margin:0}}
                placeholder="e.g. butter, paper towels, chicken broth…"
                value={newStandingItem}
                onChange={e => setNewStandingItem(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter"){ addStandingItem(newStandingItem); }}}
              />
              <button className="btn-save" style={{flex:"0 0 auto",padding:"8px 14px"}}
                onClick={() => addStandingItem(newStandingItem)}>Add</button>
            </div>

            {/* Add in bulk */}
            <div className="panel-section-title">Add a whole list at once</div>
            <p style={{fontSize:12,color:"#4a7d77",marginBottom:8,lineHeight:1.5}}>
              Type or paste a list — one item per line. Great for loading up your full staples list in one go.
            </p>
            <textarea
              style={{width:"100%",border:"1px solid #d9ece8",borderRadius:7,padding:"9px 11px",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#1e5f5a",background:"#fff",outline:"none",resize:"vertical",minHeight:110,marginBottom:8}}
              placeholder={"One item per line, for example:\n\nbutter\neggs\nmilk\nolive oil\nchicken broth\ncanned tomatoes\npaper towels\ndish soap\nlaundry detergent\ncheese\nyogurt"}
              value={bulkStandingText}
              onChange={e => setBulkStandingText(e.target.value)}
            />
            {bulkStandingText.trim() && (
              <div style={{fontSize:12,color:"#7fcdb9",marginBottom:8,fontWeight:500}}>
                {bulkStandingText.trim().split("\n").filter(l=>l.trim()).length} items to add
              </div>
            )}
            <button className="btn-save" style={{width:"100%",marginBottom:4}}
              onClick={addBulkStanding} disabled={!bulkStandingText.trim()}>
              Add All to Watch List
            </button>

            {/* Suggested categories */}
            <div className="panel-section-title">Suggested items by category</div>
            {[
              ["Pantry Staples", ["butter","eggs","milk","olive oil","vegetable oil","flour","sugar","salt","black pepper","garlic","onions","chicken broth","canned tomatoes","tomato paste","pasta","rice","dried beans"]],
              ["Proteins to watch", ["chicken thighs","ground beef","pork shoulder","salmon","shrimp","bacon","deli meat","sausage"]],
              ["Dairy & Fridge", ["shredded cheese","parmesan","sour cream","heavy cream","cream cheese","Greek yogurt","butter"]],
              ["Household", ["paper towels","dish soap","laundry detergent","dishwasher pods","trash bags","aluminum foil","zip-lock bags","sponges"]],
              ["Snacks & Extras", ["chips","crackers","peanut butter","jam","granola bars","juice","sports drinks"]],
            ].map(([cat, items]) => (
              <div key={cat} style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#7fb3aa",fontWeight:500,marginBottom:5}}>{cat}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {items.map(item => {
                    const already = standingIngredients.includes(item);
                    return (
                      <button key={item}
                        style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,padding:"3px 9px",borderRadius:10,border:`1px solid ${already?"#7fcdb9":"#d9ece8"}`,background:already?"#eaf7f3":"#fff",color:already?"#7fcdb9":"#4a7d77",cursor:"pointer",transition:"all 0.15s"}}
                        onClick={() => already ? removeStandingItem(item) : addStandingItem(item)}
                      >{already ? "✓ " : "+ "}{item}</button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="panel-actions" style={{marginTop:16}}>
              <button className="btn-cancel" style={{color:"#c0392b",borderColor:"#f0d0cc"}}
                onClick={() => { if(window.confirm("Clear the entire standing list?")) setStandingIngredients([]); }}>
                Clear All
              </button>
              <button className="btn-save" onClick={() => setShowManageStanding(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

// CodeSandbox expects the component to be importable as "App"
export { HousekeeperAgent as App };

function PreferencesForm({ profile, setProfile, showToast }) {
  const [draft, setDraft] = useState({ ...profile });
  const save = () => {
    setProfile(draft);
    showToast("Food preferences saved ✓");
  };
  return (
    <div style={{background:"#fff",border:"1px solid #d9ece8",borderRadius:10,padding:"20px 22px"}}>
      <div className="field">
        <label>Foods the family loves</label>
        <textarea rows={3} placeholder="e.g. Italian food, grilled meats, Mexican food, pasta, hearty stews, anything with cheese…" value={draft.likes} onChange={e => setDraft(d=>({...d,likes:e.target.value}))} />
        <div className="field-hint">The more specific the better — cuisines, ingredients, cooking styles, comfort foods</div>
      </div>
      <div className="field">
        <label>Foods to avoid or dislike</label>
        <textarea rows={2} placeholder="e.g. Shellfish, liver, overly spicy food, Brussels sprouts…" value={draft.dislikes} onChange={e => setDraft(d=>({...d,dislikes:e.target.value}))} />
      </div>
      <div className="field">
        <label>Dietary rules and special needs</label>
        <textarea rows={3} placeholder="e.g. No shellfish allergy for Dad. Boys eat large portions — always double the protein. Husband prefers lighter dinners on weekdays. No pork on Fridays…" value={draft.dietary} onChange={e => setDraft(d=>({...d,dietary:e.target.value}))} />
        <div className="field-hint">Allergies, portion preferences, religious restrictions, health considerations</div>
      </div>
      <div className="field">
        <label>Recent meals (to avoid repeating this week)</label>
        <textarea rows={2} placeholder="e.g. Chicken stir-fry (Monday), Spaghetti bolognese (Thursday), Tacos (last weekend)…" value={draft.mealHistory} onChange={e => setDraft(d=>({...d,mealHistory:e.target.value}))} />
        <div className="field-hint">Update this after each visit so the AI always suggests something fresh</div>
      </div>
      <button className="btn-save" style={{marginTop:6}} onClick={save}>Save Food Preferences</button>
    </div>
  );
}
