const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("M-Pesa STK Push API is running 🚀");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server is running");
});
