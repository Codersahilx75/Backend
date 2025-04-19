
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import bodyParser from "body-parser";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from'./routes/orderRoutes.js';

import transporter from './config/emailConfig.js';
import authRoutes from './routes/authRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import nodemailer from "nodemailer";
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Ensure "uploads" folder exists
const uploadDir = path.join("uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes); 
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.post("/api/payment/webhook", express.raw({ type: "application/json" }));


// Email test endpoint
app.get('/test-email', async (req, res) => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('Test account created:', testAccount);

    const mailOptions = {
      from: `"Test Sender" <${testAccount.user}>`,
      to: 'test@example.com',
      subject: 'Test Email',
      text: 'This is a test email'
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      message: 'Email sent successfully',
      previewUrl: nodemailer.getTestMessageUrl(info),
      env: process.env.NODE_ENV,
      user: process.env.SMTP_USER || process.env.DEV_EMAIL_USER
    });
  } catch (error) {
    console.error('Full error:', error);
    res.status(500).json({ 
      error: error.message,
      env: process.env.NODE_ENV,
      config: transporter.options
    });
  }
});

app.get("/", (req, res) => {
  res.send("Backend is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));  