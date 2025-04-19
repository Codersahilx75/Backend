import express from 'express';
import Stripe from 'stripe';
import Order from '../models/Order.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Raw body parser middleware for Stripe
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const newOrder = new Order({
        userId: session.metadata.userId,
        cart: [], // Add cart data from client if needed
        totalPrice: session.amount_total / 100,
        paymentMethod: 'card',
        paymentStatus: 'completed',
        paymentId: session.id,
      });

      await newOrder.save();
      console.log("✅ Order saved from webhook:", newOrder._id);
    } catch (error) {
      console.error("❌ Order save failed:", error.message);
    }
  }

  res.json({ received: true });
});

export default router;
