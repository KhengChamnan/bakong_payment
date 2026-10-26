require("dotenv").config();

const express = require("express");
const {BakongKHQR, khqrData, IndividualInfo, MerchantInfo, SourceInfo} = require("bakong-khqr");
const { generateKHQRSVG, svgToDataURI } = require("@manethpak/khqr-sdk/svg");

const app = express();
const khqr = new BakongKHQR();
app.use(express.json({ limit: "16kb" }));

app.get("/khqr/view", async (req, res) => {
    const { result } = await generateKHQRSVG(req.query.payload);
    const image = svgToDataURI(result).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
    res.set("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
    return res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KHQR payment</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; min-height: 100svh; padding: 16px; display: grid; place-items: center; background: #f4f5f7; }
    main { width: min(100%, 442px); }
    img { display: block; width: 100%; height: auto; }
    @media print { body { padding: 0; background: #fff; } }
  </style>
</head>
<body><main><img src="${image}" alt="KHQR payment card"></main></body>
</html>`);
});

app.post("/khqr/generate", (req, res) => {
  const { amount = 0 } = req.body || {};

  const info = new IndividualInfo(
    process.env.BAKONG_ACCOUNT_ID,
    process.env.MERCHANT_NAME,
    process.env.MERCHANT_CITY,
    {
      currency: khqrData.currency.khr,
      expirationTimestamp: Date.now() + 300_000,
      amount
    }
  );
  const { data } = khqr.generateIndividual(info);

  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const qrUrl = new URL(`/khqr/view?payload=${encodeURIComponent(data.qr)}`, base).href;
  return res.json({ success: true, qrUrl, qrPayload: data.qr, qrMd5: data.md5 });
});

app.listen(Number(process.env.PORT || 8000), "0.0.0.0");
