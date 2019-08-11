const functions = require("firebase-functions");
const nodeMailer = require('nodemailer');
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodeMailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

const sendWelcomeEmail = async (to = null,) => {
  if (to === null)
    throw new Error(`'to' can't be null`);

  // email message configuration
  const MS = {
    from: `Accountabble <noreply@firebase.com>`,
    to,
    subject: `Welcome to Accountabble!`,
    html: `
    <p>Hey,</p>
    <br/>
    <p>Thank you very much for joining the community. We are excited to work with you.</p>
    <br/>
    <p>Soon you will receive a personalized guide on the behavior you chose and how to upload the videos.</p>
    <br/>
    <p>You are one step closer towards becoming your best self.</p>
    <br/>
    <br/>
    <p>- The Accountabble Team</p>
    `
  };
  await mailTransport.sendMail(MS);
  console.log(`Welcome Email sent to : ${to}`);
  return null;
};

module.exports = {sendWelcomeEmail};
