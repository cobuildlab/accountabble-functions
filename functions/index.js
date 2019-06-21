const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const config = require("./config");

admin.initializeApp();

exports.createPaymentRequest = functions.https.onCall(
  async (data) => {
    const token = data.token;
    console.log(`DEBUG:`, data);
    // const stripe = new Stripe(config.STRIPE_API_KEY);
    // try {
    //   let {status} = await stripe.charges.create({
    //     amount: 1500,
    //     currency: "usd",
    //     description: "Accountabble Membership",
    //     source: token
    //   });
    //   return {
    //     payment: status
    //   };
    // } catch (err) {
    //   return {
    //     err: err,
    //     statusCode: 500,
    //     details: "Payment Request Failed"
    //   };
    // }
  }
);




// send mail with gmail
const nodemailer = require('nodemailer')
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

// send email 
exports.sendEmailWhithGmail = functions.https.onCall(({ data }) => {
  const name = data.name
  const email = data.email
  const comment = data.comment
  
  return sendEmail(name ,email,comment)
  
  
})


async function sendEmail ( name , email , comment ) {
  
  const toEmailCompany = 'contact@accountabble.com'
  
  // email message configuration
  const MS = {
    from: `${email} <noreply@firebase.com>`,
    to: toEmailCompany, 
    subject:`From ${name}`, 
    text: comment
  }
    await mailTransport.sendMail(MS);
    console.log(`Email sent to : ${email}`);
    return null;


} 






