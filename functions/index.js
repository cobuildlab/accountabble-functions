const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");

const config = require("./config");

admin.initializeApp();

exports.createPaymentRequest = functions.https.onCall(
  async (data, contenxt) => {
    const token = data.token;
    const stripe = new Stripe(config.STRIPE_API_KEY);
    try {
      let { status } = await stripe.charges.create({
        amount: 1500,
        currency: "usd",
        description: "Accountabble Membership",
        source: token
      });
      return {
        payment: status
      };
    } catch (err) {
      return {
        err: err,
        statusCode: 500,
        details: "Payment Request Failed"
      };
    }
  }
);
