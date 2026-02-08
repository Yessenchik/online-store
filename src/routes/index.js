const express = require("express");
const authRoutes = require("./authRoutes");
const productRoutes = require("./productRoutes");
const orderRoutes = require("./orderRoutes");
const reviewRoutes = require("./reviewRoutes");
const userRoutes = require("./userRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const viewRoutes = require("./viewRoutes");
const { sendSuccess } = require("../utils/responses");

const router = express.Router();

router.get("/health", (req, res) => {
    return sendSuccess(res, { data: { status: "ok" } });
});

router.use("/api/auth", authRoutes);
router.use("/api/products", productRoutes);
router.use("/api/orders", orderRoutes);
router.use("/api/reviews", reviewRoutes);
router.use("/api/users", userRoutes);
router.use("/api/analytics", analyticsRoutes);

// Mount view routes at root
router.use("/", viewRoutes);

module.exports = router;
