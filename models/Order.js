import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  streetAddress: { type: String, required: true },
  townCity: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      qty: { type: Number, required: true },
      img: { type: String, required: true }
    }
  ],
  totalPrice: { type: Number, required: true },

  // ✅ Add these fields:
  paymentMethod: {
    type: String,
    enum: ['cash', 'card'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  refundId: { type: String }, // Add refund ID
  cancelledAt: Date,
  stripePaymentId: {
    type: String
  },

  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['processing', 'shipped', 'delivered', 'cancelled'],
    default: 'processing'
  },
  cancelledAt: Date,
  shippedAt: Date,
  deliveredAt: Date
});

export default mongoose.model("Order", OrderSchema);
