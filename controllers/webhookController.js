import Stripe from "stripe";
import dotenv from "dotenv";
import Order from "../models/orderModel.js"; // create model if not created

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      // Check if order already exists
      const existingOrder = await Order.findOne({ stripeSessionId: session.id });
      if (existingOrder) {
        console.log("Order already exists:", existingOrder._id);
        return res.status(200).json({ received: true });
      }

      // Create new order
      const formData = JSON.parse(session.metadata.formData);
      const cart = JSON.parse(session.metadata.cart);
      const totalPrice = parseFloat(session.metadata.totalPrice);

      const newOrder = await Order.create({
        firstName: formData.firstName,
        streetAddress: formData.streetAddress,
        townCity: formData.townCity,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        cart: cart.map(item => ({
          productId: item._id,
          name: item.name,
          price: item.price,
          qty: item.qty,
          img: item.img
        })),
        totalPrice,
        stripeSessionId: session.id,
        paymentStatus: "completed",
        paymentMethod: "card",
        status: "processing"
      });

      console.log("✅ Order created via webhook:", newOrder._id);
    } catch (err) {
      console.error("❌ Error saving order:", err);
    }
  }

  res.status(200).json({ received: true });
};
