const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const {google} = require('googleapis');
const nodeMailer = require('nodemailer');
const moment = require('moment-timezone');
const googleDrive = require('./google-drive');
const emailFunctions = require('./email');
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodeMailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});
admin.initializeApp();

exports.mainFunction = functions.https.onCall(async (data) => {
  console.log('mainFunction:data:', data);
  const {basicInformation, coaching, token: {token}} = data;
  console.log('mainFunction:basicInformation', basicInformation);
  console.log('mainFunction:coaching', coaching);
  console.log('mainFunction:token', token);
  const FIRESTORE = admin.firestore();
  const email = basicInformation.email;
  //stripe
  const customer = await createCustomerId(token.id, email);
  let payment = {};
  // const {payment} = await createPaymentRequest(customer);
  console.log('mainFunction:paymentStripe', payment);
  const date = moment(new Date()).tz("America/New_York").format();
  console.log('mainFunction:date:', date);
  const subscriptionsCollection = FIRESTORE.collection('subscriptions');

  console.log('mainFunction:email:', email);
  const subscription = await subscriptionsCollection.add(Object.assign({}, data, {
    email,
    date,
    active: true,
    customer,
    billingData: token
  }));
  const paymentsCollection = FIRESTORE.collection('payments');
  await paymentsCollection.add({email, payment, date, subscriptionId: subscription.id});
  // google drive folder
  await createGoogleDriveFolder({data});
// send email to Marcus
  await _sendEmail({data: basicInformation, coaching});
  // Send welcome Email
  await emailFunctions.sendWelcomeEmail(email);
  // Registering subscription
  return {}
});


const createCustomerId = async (tokenId, email) => {
  console.log(`createCustomerId:tokenId:`, tokenId, email);
  console.log(`createCustomerId:stripe_key:`, functions.config().stripe.key);
  // remove
  const stripe = new Stripe(functions.config().stripe.key);
  try {
    let customer = await stripe.customers.create({
      email,
      description: `Accountabble Membership: ${email}`,
      source: tokenId
    });
    console.log('createCustomerId:customer:', customer);
    return customer;
  } catch (err) {
    console.log('createCustomerId:err:', err);
    throw err;
  }
};


const createPaymentRequest = async (customer) => {
  console.log(`createPaymentRequest:customer:`, customer);
  console.log(`createPaymentRequest:stripe_key:`, functions.config().stripe.key);
  // remove
  const stripe = new Stripe(functions.config().stripe.key);
  try {
    let status = await stripe.charges.create({
      amount: 6000, // $1
      currency: "usd",
      description: "Accountabble Membership",
      customer: customer.id
    });
    console.log('createPaymentRequest:status:', status);
    return {
      payment: status
    }

  } catch (err) {
    console.log('createPaymentRequest:err:', err);
    throw err;
  }
};


const _sendEmail = async ({data, coaching}) => {
  const toEmailCompany = 'info@accountabble.com';
  // email message configuration
  const MS = {
    from: `${data.email} <noreply@firebase.com>`,
    to: toEmailCompany,
    subject: `From ${data.name}`,
    text: JSON.stringify(data) + `<br>/<br/>` + JSON.stringify(coaching)
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
  const {basicInformation} = data;
  console.log(`createGoogleDriveFolder:`, basicInformation);
  // handler data
  const name = basicInformation.name;
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
        const fileMedia = {mimeType: 'text/plain', body: JSON.stringify(data)};

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

exports.scheduledFunction = functions.pubsub.schedule('1 of month 09:00').onRun(async (context) => {
  console.log('scheduledFunction:context:', context);
  const FIRESTORE = admin.firestore();
  const subscriptionsCollection = FIRESTORE.collection('subscriptions');
  const allSubscriptions = await subscriptionsCollection.where('active', '==', true).get();
  if (allSubscriptions.empty) {
    console.log('scheduledFunction:empty:', 'No subscriptions');
    return;
  }

  allSubscriptions.forEach(async subscriptionDoc => {
    // Subscription Data
    const subscriptionId = subscriptionDoc.id;
    const subscription = subscriptionDoc.data();
    console.log('scheduledFunction:subscription:', subscriptionId, subscription);

    // Payments Data
    const paymentsCollection = FIRESTORE.collection('payments');
    const thisSubscriptionPayments = await paymentsCollection.where('subscriptionId', '==', subscriptionId).get();
    let paymentCounter = 0;
    thisSubscriptionPayments.forEach(() => paymentCounter++);
    let numberOfWeeksForSubscription = 0;
    if (subscription) {
      if (subscription.coaching)
        if (subscription.coaching.weeks)
          numberOfWeeksForSubscription = parseInt(subscription.coaching.weeks);
    }

    //Subscription already completed
    if (paymentCounter >= numberOfWeeksForSubscription) {
      await subscriptionsCollection.doc(subscriptionId).set({active: false}, {merge: true});
      console.log('scheduledFunction: Closing Subscription');
      return;
    }

    let payment = {};
    // const {payment} = await createPaymentRequest(subscription.customer);
    console.log('scheduledFunction:paymentStripe', payment);
    const date = moment(new Date()).tz("America/New_York").format();
    await paymentsCollection.add({email: subscription.email, payment, date, subscriptionId});
  });

});
