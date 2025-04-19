import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true }, 
  img: { type: String, required: true },
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

export default Product;
