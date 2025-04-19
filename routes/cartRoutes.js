import express from "express";
import Cart from "../models/cartModel.js"; 

const router = express.Router();

// 🛒 Add to Cart API
router.post("/add", async (req, res) => {
  try {
    const { userId, product } = req.body;

    let cart = await Cart.findOne({ userId });

    if (cart) {
      // अगर cart में पहले से product exist है तो qty बढ़ाएं
      const itemIndex = cart.items.findIndex((item) => item.productId === product.productId);

      if (itemIndex > -1) {
        cart.items[itemIndex].qty += 1;
      } else {
        cart.items.push(product);
      }
    } else {
      // नया cart बनाएंगे
      cart = new Cart({ userId, items: [product] });
    }

    await cart.save();
    res.status(200).json({ success: true, cart });

  } catch (error) {
    res.status(500).json({ message: "Error adding to cart", error });
  }
});

// 📦 Get Cart API (Refresh होने पर Data वापस लाने के लिए)
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart is empty" });
    }

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cart", error });
  }
});

// ❌ Remove Item from Cart
router.delete("/:userId/:productId", async (req, res) => {
  try {
    const { userId, productId } = req.params;

    let cart = await Cart.findOne({ userId });

    if (cart) {
      cart.items = cart.items.filter((item) => item.productId !== productId);
      await cart.save();
      return res.status(200).json({ success: true, cart });
    }

    res.status(404).json({ message: "Cart not found" });
  } catch (error) {
    res.status(500).json({ message: "Error removing item", error });
  }
});


// 📦 Update Cart Quantity API
router.put("/update-quantity", async (req, res) => {
    try {
      const { userId, productId, action } = req.body;
      let cart = await Cart.findOne({ userId });
  
      if (!cart) return res.status(404).json({ message: "Cart not found" });
  
      const itemIndex = cart.items.findIndex((item) => item.productId === productId);
  
      if (itemIndex > -1) {
        if (action === "increase") {
          cart.items[itemIndex].qty += 1;
        } else if (action === "decrease" && cart.items[itemIndex].qty > 1) {
          cart.items[itemIndex].qty -= 1;
        }
      }
  
      await cart.save();
      res.status(200).json({ success: true, cart });
  
    } catch (error) {
      res.status(500).json({ message: "Error updating quantity", error });
    }
  });
  

export default router;
