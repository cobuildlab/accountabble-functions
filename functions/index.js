const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const cors = require("cors")("*");

const config = require("./config");

admin.initializeApp();

exports.createPaymentRequest = functions.https.onRequest(
  cors(async (req, res) => {
    const stripe = new Stripe(config.STRIPE_API_KEY);
    try {
      let { status } = await stripe.charges.create({
        amount: 1500,
        currency: "usd",
        description: "Accountabble Membership",
        source: req.body.data
      });
      return res
        .json({ status })
        .status(200)
        .end();
    } catch (err) {
      return res
        .json({
          statusCode: 500,
          details: "Payment Request Failed"
        })
        .end();
    }
  })
);
