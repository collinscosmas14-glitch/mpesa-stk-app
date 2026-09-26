const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname)));

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
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

// STK Push
app.post("/api/stkpush", async (req, res) => {
  try {
    const { phone, amount, accountReference } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({
        success: false,
        message: "Phone number and amount are required."
      });
    }

    let formattedPhone = phone.toString().trim();

    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    }

    if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.substring(1);
    }

    if (!/^2547\d{8}$/.test(formattedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Use a valid Kenyan phone number, e.g. 0712345678."
      });
    }

    const accessToken = await getAccessToken();

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .substring(0, 14);

    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const requestBody = {
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
      AccountReference: accountReference || "TEST",
      TransactionDesc: "STK Payment"
    };

    console.log("STK REQUEST:");
    console.log({
      BusinessShortCode: requestBody.BusinessShortCode,
      Timestamp: requestBody.Timestamp,
      TransactionType: requestBody.TransactionType,
      Amount: requestBody.Amount,
      PartyA: requestBody.PartyA,
      PartyB: requestBody.PartyB,
      PhoneNumber: requestBody.PhoneNumber,
      CallBackURL: requestBody.CallBackURL,
      AccountReference: requestBody.AccountReference
    });

    const stkResponse = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("STK SUCCESS:");
    console.log(stkResponse.data);

    res.json({
      success: true,
      message: "STK Push sent successfully 🚀",
      data: stkResponse.data
    });

  } catch (error) {

    console.error("STK PUSH ERROR:");

    console.error("Status:", error.response?.status);

    console.error(
      "Safaricom Response:",
      JSON.stringify(error.response?.data || {}, null, 2)
    );

    console.error("Message:", error.message);

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

// Start server
app.listen(process.env.PORT || 3000, () => {
  console.log("Server is running");
});
