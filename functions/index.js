const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const config = require("./config");
const {google} = require('googleapis');
const nodeMailer = require('nodemailer');
const moment = require('moment-timezone');
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodeMailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});
const googleDrive = require('./google-drive');
admin.initializeApp();


exports.mainFunction = functions.https.onCall(async (data) => {
  console.log('data:', data);
  const {basicInformation} = data;
  console.log('data:basicInformation', basicInformation);
  const FIRESTORE = admin.firestore();
  // send email
  // await _sendEmail({data: basicInformation});
  //stripe
  const {payment} = await createPaymentRequest({data});
  const date = moment(new Date()).tz("America/New_York").format();
  console.log('mainFunction:paymentStripe', payment);
  await FIRESTORE.collection('payments').add({email: basicInformation.email, payment, date});
  // google drive folder
  await createGoogleDriveFolder({data});

  // Registering subscription
  const ref = FIRESTORE.collection('subscriptions').doc(basicInformation.email);
  await ref.set({data}, {merge: true});

  return {}
});


const createPaymentRequest = async ({data}) => {
  const token = data.token.token.id;
  console.log(`createPaymentRequest:data:`, data);
  console.log('createPaymentRequest:token:', token);

  // remove
  const stripe = new Stripe(functions.config().stripe.key);
  try {
    let status = await stripe.charges.create({
      amount: 100,
      currency: "usd",
      description: "Accountabble Membership",
      source: token
    });
    console.log('createPaymentRequest:status:', status);
    return {
      payment: status
    }

  } catch (err) {
    console.log('createPaymentRequest:err:', err);
    return {
      err: err,
      statusCode: 500,
      details: "Payment Request Failed"
    };
  }
};


const _sendEmail = async ({data}) => {
  const toEmailCompany = 'contact@accountabble.com';
  // email message configuration
  const MS = {
    from: `${data.email} <noreply@firebase.com>`,
    to: toEmailCompany,
    subject: `From ${data.name}`,
    text: data.comment
  };
  await mailTransport.sendMail(MS);
  console.log(`Email sent to : ${data.email}`);
  return null;
};

exports.sendEmail = functions.https.onCall(({data}) => {
  _sendEmail(data);
});


// google drive


const createGoogleDriveFolder = ({data}) => {
  console.log(`createGoogleDriveFolder:`, data);
  // handler data
  const name = data.name;
  const comment = data.comment;
  googleDrive((auth) => {
    console.log(`createGoogleDriveFolder:auth`, auth);
    const drive = google.drive({version: 'v3', auth});
    const fileMetadata = {
      'name': `ACCOUNTABBLE: ${name}`,
      'mimeType': 'application/vnd.google-apps.folder'
    };

    drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    }, (err, file) => {
      if (err) {
        // Handle error
        console.error(err);
        console.log(`createGoogleDriveFolder:error`, err);
      } else {
        // create file
        console.log(`createGoogleDriveFolder:folder:`, file);
        const folderId = file.data.id;
        const fileCreate = {'name': name, parents: [folderId]};
        const fileMedia = {mimeType: 'text/plain', body: comment};

        drive.files.create({
          resource: fileCreate,
          media: fileMedia,
          fields: 'id'
        }, (err) => {
          if (err) {
            console.log(`createGoogleDriveFolder:fileError`, err);
            console.log(err)
          } else {
            console.log(`createGoogleDriveFolder:file`, 'OK');
            console.log('OK')
          }
        })
      }
    });
  });
};








