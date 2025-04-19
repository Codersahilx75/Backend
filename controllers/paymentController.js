import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const { cart, formData, totalPrice } = req.body;

    const line_items = cart.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: { name: item.name },
        unit_amount: item.price * 100,
      },
      quantity: item.qty,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/profile`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        customer_email: formData.email,
        shipping_name: formData.firstName,
        shipping_address: formData.streetAddress,
        shipping_city: formData.townCity,
        phone: formData.phoneNumber,
        formData: JSON.stringify(formData),
        cart: JSON.stringify(cart),
        totalPrice: totalPrice.toString(),
      },
    });
    
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
};  



export const verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: "Payment not completed" });
    }
    
    // Check if order exists in database
    const order = await Order.findOne({ stripeSessionId: sessionId });
    
    if (!order) {
      return res.status(200).json({ 
        paymentStatus: 'paid',
        message: "Payment verified - order processing"
      });
    }
    
    res.status(200).json({
      paymentStatus: 'paid',
      orderId: order._id,
      customerEmail: order.email
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
};



