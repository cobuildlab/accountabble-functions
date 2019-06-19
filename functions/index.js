const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const config = require("./config");
const sgMail = require('@sendgrid/mail') 
sgMail.setApiKey(config.SEND_GRID_API_KEY);

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



exports.sendGridEmail = functions.https.onCall(( { data } )=>{
  console.log(data.email)
  console.log(data.comment)
  const msg = {
    to: 'david_avid1@hotmail.com',
    from: data.email,
    subject: 'Email test',
    text:data.comment,
    html: '<strong>and easy to do anywhere, even with Node.js</strong>'
  }

  sgMail.send(msg)

})








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


// Your company name to include in the emails
// TODO: Change this to your app or company name to customize the email sent.
// const APP_NAME = 'Accoutanbble';
const toEmailCompany = 'contact@accountabble.com'

// send email 
exports.sendEmailWhithGmail = functions.https.onCall(({ data }) => {
  const name = data.name
  const email = data.email
  const comment = data.comment

  return sendEmail(name ,email,comment)


})


async function sendEmail ( name , email , comment ) {

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






