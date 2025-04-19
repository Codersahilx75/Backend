import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  cart: Array,
  formData: Object,
  totalPrice: Number,
  stripeSessionId: String,
  paymentStatus: String,
}, { timestamps: true });

const Order = mongoose.model("Orders", orderSchema);

export default Order;
