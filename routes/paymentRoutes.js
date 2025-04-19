import express from "express";
import { createCheckoutSession,verifyPayment } from "../controllers/paymentController.js";
import { handleStripeWebhook } from "../controllers/webhookController.js";

const router = express.Router();

router.post("/create-checkout-session", createCheckoutSession);

// Stripe webhook endpoint (must be raw body)
router.post("/webhook", handleStripeWebhook);

router.get("/verify-payment", verifyPayment);

export default router;
