// backend/routes/mealplans.js
const express = require("express");
const router = express.Router();
const MealPlan = require("../models/MealPlan");

// Try both possible paths for the middleware so path mismatches don't silently break things
let authMiddleware;
try {
  authMiddleware = require("../middleware/authMiddleware");
  console.log("Using auth middleware: ../middleware/authMiddleware");
} catch (e1) {
  try {
    authMiddleware = require("../middlewares/authMiddleware");
    console.log("Using auth middleware: ../middlewares/authMiddleware");
  } catch (e2) {
    console.error("Could not require auth middleware from either ../middleware/authMiddleware or ../middlewares/authMiddleware");
    // set a noop middleware so the server doesn't crash — but it will log so you can fix path
    authMiddleware = (req, res, next) => {
      console.warn("authMiddleware missing — requests will be unauthenticated. Fix the require path.");
      next();
    };
  }
}

// GET list
router.get("/", authMiddleware, async (req, res) => {
  try {
    console.log("=== GET /api/mealplans hit ===");
    console.log("req.user =", req.user ? req.user : "<no req.user>");

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const plans = await MealPlan.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    console.log("Plans found:", Array.isArray(plans) ? plans.length : 0);
    return res.json({ plans, count: plans.length });
  } catch (err) {
    console.error("MealPlan List Error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Failed to list plans" });
  }
});

// GET single plan
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    console.log("=== GET /api/mealplans/:id hit ===", req.params.id);
    console.log("req.user =", req.user ? req.user : "<no req.user>");

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const plan = await MealPlan.findById(req.params.id).populate("entries.recipe");
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    if (String(plan.user) !== String(req.user.id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({ plan });
  } catch (err) {
    console.error("MealPlan Load Error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Failed to load plan" });
  }
});

// POST create/update
router.post("/", authMiddleware, async (req, res) => {
  try {
    console.log("=== POST /api/mealplans hit ===");
    console.log("req.user =", req.user ? req.user : "<no req.user>");
    try { console.log("body =", JSON.stringify(req.body).slice(0,2000)); } catch(e){}

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized - no user" });
    }

    const userId = req.user.id;
    const { id, title, entries } = req.body;

    if (!title || !Array.isArray(entries)) {
      return res.status(400).json({ error: "Missing required fields: title and entries (array)" });
    }

    let plan;
    if (id) {
      plan = await MealPlan.findOneAndUpdate(
        { _id: id, user: userId },
        { title, entries },
        { new: true }
      ).populate("entries.recipe");

      if (!plan) {
        return res.status(404).json({ error: "Plan not found or you don't have permission to edit it" });
      }
    } else {
      plan = new MealPlan({ user: userId, title, entries });
      await plan.save();
      plan = await plan.populate("entries.recipe");
    }

    console.log("Plan saved id=", plan._id);
    return res.json({ plan });
  } catch (err) {
    console.error("MealPlan Save Error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Failed to save meal plan" });
  }
});

module.exports = router;
