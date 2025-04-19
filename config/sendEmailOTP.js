import nodemailer from "nodemailer";

const sendEmailOTP = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // e.g. smtp.gmail.com
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"SwiftCart Admin" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Your Admin Login OTP",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">SwiftCart Admin Login OTP</h2>
          <p>Your OTP is:</p>
          <div style="font-size: 24px; font-weight: bold; color: #007BFF;">${otp}</div>
          <p>This OTP is valid for 10 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("OTP email sent to:", email);
  } catch (err) {
    console.error("Error sending OTP email:", err);
    throw err;
  }
};

export default sendEmailOTP;
