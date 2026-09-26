const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Home / health check
app.get("/", (req, res) => {
  res.send("M-Pesa STK Push API is running 🚀");
});

// Get M-Pesa access token
async function getAccessToken() {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const response = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${credentials}`
      }
    }
  );

  return response.data.access_token;
}

// STK Push endpoint
app.post("/api/stkpush", async (req, res) => {
  try {
    const { phone, amount, accountReference } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({
        success: false,
        message: "Phone number and amount are required."
      });
    }

    const accessToken = await getAccessToken();

    // Convert phone number to 2547XXXXXXXX format
    let formattedPhone = phone.toString().trim();

    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    }

    if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.substring(1);
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .substring(0, 14);

    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const stkResponse = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Number(amount),
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL:
          "https://mpesa-stk-app-nk9l.onrender.com/api/callback",
        AccountReference: accountReference || "Payment",
        TransactionDesc: "STK Payment"
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      message: "STK Push sent successfully 🚀",
      data: stkResponse.data
    });

  } catch (error) {
    console.error(
      "STK Push Error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "STK Push failed.",
      error: error.response?.data || error.message
    });
  }
});

// M-Pesa callback
app.post("/api/callback", (req, res) => {
  console.log("M-Pesa Callback Received:");
  console.log(JSON.stringify(req.body, null, 2));

  res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

// Test endpoint
app.post("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Payment API is ready 🚀",
    data: req.body
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server is running");
});
