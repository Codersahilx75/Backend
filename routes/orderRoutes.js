import express from "express";
import { getAllOrders,getOrdersByUser,cancelOrder ,updateOrderStatus,getRecentOrders,getTotalOrderCount,placeCODOrder,createStripeCheckoutSession,placeOrderAfterPayment,getOrderById} from "../controllers/orderController.js";

const router = express.Router();

router.post("/cod", placeCODOrder);

// For Online Payment
router.post("/create-checkout-session", createStripeCheckoutSession);
router.post("/place-order-after-payment", placeOrderAfterPayment);
router.get("/allorders", getAllOrders); // ✅ Fix route
router.get('/user/:email', getOrdersByUser);
router.put('/:orderId/cancel', cancelOrder);
router.put('/:orderId/status', updateOrderStatus);
router.get("/recent", getRecentOrders);
router.get('/total-count', getTotalOrderCount);
router.get('/:orderId', getOrderById);

export default router;