/**
  Google Sheets Client
*/
let fs = require('fs');
let log = require('winston');
let readline = require('readline');
let google = require('googleapis');
let googleAuth = require('google-auth-library');

let SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
let TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
  process.env.USERPROFILE) + '/.credentials/';
let TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-crudosbot.json';

/**
 * Init auth client and make GS call
 */
exports.call = function(parameters, callback) {
   return new Promise(function (fulfill, reject) {
      fs.readFile('client_secret.json', function processClientSecrets(err, content) {
         if(err) {
            console.log('Error loading client secret file: ' + err);
            reject(err);
         }

         let credentials = JSON.parse(content);
         let clientSecret = credentials.installed.client_secret;
         let clientId = credentials.installed.client_id;
         let redirectUrl = credentials.installed.redirect_uris[0];
         let auth = new googleAuth();
         let oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

         // Check if we have previously stored a token.
         fs.readFile(TOKEN_PATH, function(err, token) {
            if(err) {
               getNewToken(oauth2Client, callback);
            } else {
               oauth2Client.credentials = JSON.parse(token);
            }

            let params = parameters;
            params['auth'] = oauth2Client;
            callback(params).then(fulfill);
         });
      });
   });
}

/**
  Get
  returns a promise
**/
exports.get = function(params) {
   log.info('GoogleSheets - GET');

   return new Promise(function (fulfill, reject) {
      let sheets = google.sheets('v4');
      sheets.spreadsheets.values.get(params, function(err, result) {
         if(err) {
            log.error(err);
            reject(err);
         } else {
            fulfill(result);
         }
      });
   });
}

/**
  Update
  returns a promise
**/
exports.update = function(params) {
   log.info('GoogleSheets - UPDATE');

   return new Promise(function (fulfill, reject) {
      let sheets = google.sheets('v4');
      sheets.spreadsheets.values.batchUpdate(params, function(err, result) {
         if(err) {
            log.error(err);
            reject(err);
         } else {
            fulfill(result);
         }
      });
   });
}

/** Helper **/

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 */
function getNewToken(oauth2Client) {
   let authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
   });

   console.log('Authorize this app by visiting this url: ', authUrl);
   let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
   });

   rl.question('Enter the code from that page here: ', function(code) {
      rl.close();

      oauth2Client.getToken(code, function(err, token) {
         if(err) {
            console.log('Error while trying to retrieve access token', err);
            return;
         }
         oauth2Client.credentials = token;
         storeToken(token);
      });
   });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
   try {
      fs.mkdirSync(TOKEN_DIR);
   } catch (err) {
      if(err.code != 'EEXIST') {
         throw err;
      }
   }
   fs.writeFile(TOKEN_PATH, JSON.stringify(token));
   console.log('Token stored to ' + TOKEN_PATH);
}



/**
// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
 if(err) {
  console.log('Error loading client secret file: ' + err);
  return;
}
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content), listMajors);
});
**/

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
 function authorize(credentials, callback) {
    let clientSecret = credentials.installed.client_secret;
    let clientId = credentials.installed.client_id;
    let redirectUrl = credentials.installed.redirect_uris[0];
    let auth = new googleAuth();
    let oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
     if(err) {
      getNewToken(oauth2Client, callback);
   } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
   }
});
}

/**
 * Print the names and majors of students in a sample spreadsheet:
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 */
 function listMajors(auth) {
    let sheets = google.sheets('v4');
    sheets.spreadsheets.values.get({
     auth: auth,
     spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
     range: 'Class Data!A2:E',
  }, function(err, response) {
     if(err) {
      console.log('The API returned an error: ' + err);
      return;
   }
   let rows = response.values;
   if(rows.length == 0) {
      console.log('No data found.');
   } else {
      console.log('Name, Major:');
      for (let i = 0; i < rows.length; i++) {
       let row = rows[i];
        // Print columns A and E, which correspond to indices 0 and 4.
        console.log('%s, %s', row[0], row[4]);
     }
  }
});
 }

