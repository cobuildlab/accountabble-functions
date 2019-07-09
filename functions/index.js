const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const config = require("./config");


admin.initializeApp();



exports.mainFunction = functions.https.onCall(({data})=>{

  // send email
 _sendEmail({data})

 //stripe
 createPaymentRequest({data})

//  googledrive folder
  googleDrive({data})

  const ref = admin.firestore().collection('subscriptions').doc(data.email);
  ref.set({data})
  

})















const createPaymentRequest = async ({data}) => {
    const token = data.token.token.id;
    console.log(`DEBUG:`,data);
    console.log('Cesar', token)



    // remove
    const stripe = new Stripe(functions.config().stripe.key);
    try {
      let status = await stripe.charges.create({
        amount: 1500,
        currency: "usd",
        description: "Accountabble Membership",
        source: token
      });
      return {
       Payment: status
        
      }
      
    } catch (err) {
      return {
        err: err,
        statusCode: 500,
        details: "Payment Request Failed"
      };
    }
  }





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




const _sendEmail = async({ data }) => {

  // contact@accountabble.com
  const toEmailCompany = 'david_avid1@hotmail.com'
  
  // email message configuration
  const MS = {
    from: `${data.email} <noreply@firebase.com>`,
    to: toEmailCompany, 
    subject:`From ${data.name}`, 
    text: data.comment
  }
    await mailTransport.sendMail(MS);
    console.log(`Email sent to : ${data.email}`);
    return null;

}

exports.sendEmail = functions.https.onCall(({data})=>{
  _sendEmail(data);

})





// google drive

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const googleDrive = ({ data })=>{

    // handler data
    const name = data.name
    const comment = data.comment


  // Load client secrets from a local file.
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    authorize(JSON.parse(content), uploadFile);
    
    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
    function authorize(credentials, callback) {
      const {client_secret, client_id, redirect_uris} = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(
          client_id, client_secret, redirect_uris[0]);
    
      // Check if we have previously stored a token.
      fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
      });
    }
  
    /**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
     * @param {getEventsCallback} callback The callback for the authorized client.
     */
    function getAccessToken(oAuth2Client, callback) {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });

      console.log('Authorize this app by visiting this url:', authUrl);
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return console.error('Error retrieving access token', err);
          oAuth2Client.setCredentials(token);
          // Store the token to disk for later program executions
          fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
            if (err) return console.error(err);
            console.log('Token stored to', TOKEN_PATH);
          });
          callback(oAuth2Client);
        });
      });
    
    
    }
  })

    
  function uploadFile(auth,) {

      const drive = google.drive({ version: 'v3', auth });

      const fileMetadata = {
          'name': name,
          'mimeType': 'application/vnd.google-apps.folder'
        };

        drive.files.create({
          resource: fileMetadata,
          fields: 'id'
        }, function (err, file) {
          if (err) {
            // Handle error
            console.error(err);

          } else {

            // create file
            const folderId = file.data.id
            const fileCreate = {
              'name': name,
              parents : [folderId]
            }


            const fileMedia = {
              mimeType: 'text/plain',
              body : comment
            }

            drive.files.create({
              resource: fileCreate,
              media: fileMedia,
              fields: 'id'
            },function (err) {
              if(err){
                console.log(err)
              }
              else{
                console.log('OK')
              }
            })

          }
        });

  }
    
  };





  


