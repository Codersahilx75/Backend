import Order from "../models/Order.js"; 
import transporter from "../config/emailConfig.js";
import nodemailer from "nodemailer";
import Stripe from "stripe";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export const placeCODOrder = async (req, res) => {
  try {
    const { firstName, email, streetAddress, townCity, phoneNumber, cart } = req.body;

    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    const order = new Order({
      firstName,
      email,
      streetAddress,
      townCity,
      phoneNumber,
      cart: cart.map(item => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        img: item.img
      })),
      totalPrice,
      paymentMethod: "cash",
      paymentStatus: "pending",
      status: "processing"
    });

    const savedOrder = await order.save();

    // Email
    const emailHtml = `
      <h1>Order Confirmation #${savedOrder._id}</h1>
      <p>Thank you for your order, ${firstName}!</p>
      <p><strong>Payment Method:</strong> Cash on Delivery</p>
      <h2>Order Details</h2>
      <ul>
        ${cart.map(item => `<li>${item.name} x ${item.qty} - ₹${item.price * item.qty}</li>`).join('')}
      </ul>
      <p><strong>Total:</strong> ₹${totalPrice}</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Order Confirmation #${savedOrder._id}`,
      html: emailHtml
    });

    res.status(201).json({ message: "COD order placed successfully", order: savedOrder });
  } catch (error) {
    console.error("COD order error:", error);
    res.status(500).json({ error: "Failed to place COD order", details: error.message });
  }
};

// 2. Create Stripe Checkout Session
export const createStripeCheckoutSession = async (req, res) => {
  try {
    const { cart, email } = req.body;

    // Validate environment variables
    if (!process.env.CLIENT_URL) {
      throw new Error("CLIENT_URL environment variable is missing");
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is missing");
    }

    // Create absolute URLs for images
    const createValidUrl = (base, path = "") => {
      try {
        const url = new URL(path, base);
        return url.toString();
      } catch (err) {
        throw new Error(`Invalid URL: ${base}${path}`);
      }
    };

    const successUrl = createValidUrl(
      process.env.CLIENT_URL,
      "/success?session_id={CHECKOUT_SESSION_ID}"
    );
    const cancelUrl = createValidUrl(process.env.CLIENT_URL, "/billing");

    // Prepare line items with product images
    const line_items = cart.map((item) => {
      let imageUrl;
      try {
        imageUrl = item.img?.startsWith("http")
          ? item.img
          : createValidUrl(process.env.SERVER_URL || "http://localhost:5000", `/uploads/${item.img}`);
      } catch {
        imageUrl = "https://via.placeholder.com/150"; // Fallback image
      }

      return {
        price_data: {
          currency: "inr",
          product_data: {
            name: item.name.substring(0, 100), // Limit name length
            images: [imageUrl], // Add product image
          },
          unit_amount: Math.max(10, Math.round(item.price * 100)), // Minimum 10 paise
        },
        quantity: Math.min(item.qty, 99), // Limit quantity
      };
    });

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      customer_email: email,
      metadata: {
        cart: JSON.stringify(cart.map((item) => ({
          id: item._id,
          name: item.name,
          price: item.price,
          qty: item.qty,
        }))),
      },
      success_url: successUrl,
      cancel_url: cancelUrl, // Redirect to billing page on cancel
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
    });

    if (!session?.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Error:", error);
    return res.status(500).json({
      error: "Payment gateway error",
      details: error.message,
    });
  }
};
// 3. Place order after Stripe payment
// ... (keep all your existing imports and functions)
export const placeOrderAfterPayment = async (req, res) => {
  try {
    const { sessionId, cart, ...rest } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart data is missing or invalid" });
    }

    // Retrieve Stripe session to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    // Check if the order already exists
    const existingOrder = await Order.findOne({ stripePaymentId: session.payment_intent });
    if (existingOrder) {
      return res.status(200).json({ message: "Order already placed", order: existingOrder });
    }

    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    const order = new Order({
      ...rest,
      cart: cart.map(item => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        img: item.img || "https://via.placeholder.com/150" // Fallback image if img is missing
      })),
      totalPrice,
      paymentMethod: "card",
      paymentStatus: "completed",
      stripePaymentId: session.payment_intent,
      status: "processing"
    });

    const savedOrder = await order.save();

    // Send order confirmation email
    const emailHtml = `
      <h1>Order Confirmation #${savedOrder._id}</h1>
      <p>Thank you for your order!</p>
      <p><strong>Payment Method:</strong> Online Payment (Card)</p>
      <p><strong>Transaction ID:</strong> ${session.payment_intent}</p>
      <h2>Order Details</h2>
      <ul>
        ${cart.map(item => `<li>${item.name} x ${item.qty} - ₹${item.price * item.qty}</li>`).join('')}
      </ul>
      <p><strong>Total:</strong> ₹${totalPrice}</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: rest.email, // Use the email from the request body
      subject: `Order Confirmation #${savedOrder._id}`,
      html: emailHtml
    });

    res.status(201).json({ message: "Order placed successfully", order: savedOrder });
  } catch (error) {
    console.error("Stripe order error:", error);
    res.status(500).json({ error: "Failed to place order", details: error.message });
  }
};


export const getOrdersByUser = async (req, res) => {
  try {
    const { email } = req.params;
    const orders = await Order.find({ email }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "processing") {
      return res.status(400).json({
        error: `Order cannot be cancelled as it's already ${order.status}`,
      });
    }

    let refundDetails = null;

    // If payment was made online, initiate a refund
    if (order.paymentMethod === "card" && order.paymentStatus === "completed") {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: order.stripePaymentId,
        });

        order.paymentStatus = "refunded";
        order.refundId = refund.id;
        refundDetails = {
          id: refund.id,
          amount: refund.amount / 100, // Convert from paise to rupees
          status: refund.status
        };
      } catch (refundError) {
        console.error("Stripe refund error:", refundError);
        return res.status(500).json({
          error: "Failed to process refund",
          details: refundError.message,
        });
      }
    }

    order.status = "cancelled";
    order.cancelledAt = new Date();
    await order.save();

    // Send cancellation email
    const emailHtml = `
      <h1>Order Cancellation #${order._id}</h1>
      <p>Your order has been successfully cancelled.</p>
      ${order.paymentMethod === "card" && refundDetails ? `
        <h2>Refund Details</h2>
        <p><strong>Refund ID:</strong> ${refundDetails.id}</p>
        <p><strong>Amount Refunded:</strong> ₹${refundDetails.amount}</p>
        <p><strong>Status:</strong> ${refundDetails.status}</p>
        <p>The refund will be processed to your original payment method within 5-10 business days.</p>
      ` : `
        <p>This was a Cash on Delivery order, so no payment was processed.</p>
      `}
      <h2>Order Details</h2>
      <ul>
        ${order.cart.map(item => `<li>${item.name} x ${item.qty} - ₹${item.price * item.qty}</li>`).join('')}
      </ul>
      <p><strong>Original Order Total:</strong> ₹${order.totalPrice}</p>
      <p>If you have any questions, please contact our customer support.</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: order.email,
      subject: `Order Cancellation #${order._id}`,
      html: emailHtml
    });

    res.status(200).json({
      message: "Order cancelled successfully",
      order,
      refund: refundDetails
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ error: "Cancelled orders cannot be updated" });
    }

    if (status === 'cancelled' && order.status !== 'processing') {
      return res.status(400).json({ 
        error: `Only processing orders can be cancelled (current status: ${order.status})`
      });
    }

    order.status = status;
    if (status === 'cancelled') {
      order.cancelledAt = new Date();
    }
    if (status === 'shipped') {
      order.shippedAt = new Date();
    }
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    const updatedOrder = await order.save();
    
    res.status(200).json({ 
      message: `Order status updated to ${status}`,
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
}; 


export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};   

export const getRecentOrders = async (req, res) => {
  try {
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(10);
    res.status(200).json(recentOrders);
  } catch (error) {
    console.error("❌ Error fetching recent orders:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};  



export const getTotalOrderCount = async (req, res) => {
  try {
    const count = await Order.countDocuments();
    res.status(200).json({ totalOrders: count });
  } catch (error) {
    console.error("❌ Error getting total order count:", error);
    res.status(500).json({ error: "Failed to get order count" });
  }
};
 

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

