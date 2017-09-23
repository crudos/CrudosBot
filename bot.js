let Discord = require('discord.io');
let log = require('winston');
let auth = require('./auth.json');
let gs_client = require('./gs_client.js');

log.remove(log.transports.Console);
log.add(log.transports.Console, {
   colorize: true
});
log.level = 'debug';

let bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function (evt) {
   log.info('Logged in as: ');
   log.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
   if(message == 'good job') {
      bot.sendMessage({ to: channelID, message: 'thanks' });
   }

   let data = {
      user: user,
      userID: userID,
      channelID: channelID,
      message: message,
      evt: evt
   }

   if(message.substring(0, 1) == '.') {
      data['args'] = message.substring(1).split(' ');
      data['cmd'] = data.args[0];
      let messageData = user + ' ' + userID + ' ' + channelID + ' ' + message + ' ' + evt;
      log.info(messageData)

      switch(data['cmd']) {
         case 'ping':
            if(user == 'crudos')  {
               bot.sendMessage({ to: channelID, message: 'ok' });
            }
            break;
         case 'gear':
            gearCommand(data);
            break;
         case 'help':
            helpCommand(data);
            break;
         default:
            helpCommand(data);
            break;
      }
   }
});

/** GEAR SCORE COMMANDS **/

let GEAR_SCORE_SPREADSHEET_ID = '1BDDFVjVa9S7c-kZd2U9a9tsnPk0otUAuM7p-UoiS-3A'
let GEAR_SCORE_SPREADSHEET_RANGE = 'Gear';

function gearCommand(data) {
   switch(data.args[1]) {
      case 'show':
         getGear(data, true);
         break;
      case 'update':
         updateGear(data);
         break;
      default:
         helpCommand(data);
         break;
   }
}

function getGear(data, print=false) {
   let getParams = {
      spreadsheetId: GEAR_SCORE_SPREADSHEET_ID,
      range: GEAR_SCORE_SPREADSHEET_RANGE,
   };

   return new Promise(function (fulfill, reject) {
      let promise = gs_client.call(getParams, gs_client.get);
      promise.then(function(result) {
         if (print) {
            gearMessage(data, result);
         }
         fulfill(result);
      }, function(err) {
         log.error('Error in getGear')
         reject(err);
      });
   });
}

function gearMessage(data, valueRange) {
   let msg = '';

   valueRange.values.forEach(function(row) {
      let rowMsg = '';
      row.forEach(function(col) {
         rowMsg += col + '\t\t';
      })
      msg += rowMsg.trim() + '\n';
   });

   bot.sendMessage({ to: data.channelID, message: msg.trim() });
}

function updateGear(data) {
   let promise = getGear(data);

   promise.then(function(result) {
      if (!result) {
         log.error('Error on updateGear: no sheet data');
         return;
      }

      let sheetArray = result.values;
      let userLowerCase = data.user.toLowerCase();
      let userRow = null;
      let rowNum = 0;

      for (i = 0; i < sheetArray.length; i++) {
         if (sheetArray[i][0].toLowerCase() == userLowerCase) {
            userRow = i;
         }
      }

      let userMessage = data.message;
      let updateInfo = userMessage.substring(userMessage.indexOf(data['args'][1]) + data['args'][1].length);

      if (updateInfo.length == 0) {
         helpCommand(data);
         return;
      }

      log.info(updateInfo);
      let sheetColumns = {
         ap: 1,
         awk: 2,
         dp: 3
      }

      log.info(sheetColumns.ap);

      let sheetUpdate = result;
      let regex = /(\D+)(\d+)/gi;
      let updateMatch;
      while ((updateMatch = regex.exec(updateInfo)) !== null) {
         let statKey = updateMatch[1];
         let statVal = updateMatch[2];
         let columnToUpdate;

         if (statKey.indexOf('ap') != -1) {
            columnToUpdate = sheetColumns.ap;
         } else if (statKey.indexOf('awk') != -1) {
            columnToUpdate = sheetColumns.awk;
         } else if (statKey.indexOf('dp') != -1) {
            columnToUpdate = sheetColumns.dp;
         }

         if (columnToUpdate) {
            sheetUpdate.values[userRow][columnToUpdate] = statVal;
         }
      }

      log.info('found user at ' + userRow);
      log.info(sheetUpdate.values);

      let updateParams = {
         spreadsheetId: GEAR_SCORE_SPREADSHEET_ID,
         range: GEAR_SCORE_SPREADSHEET_RANGE,
         valueInputOption: 'USER_ENTERED',
         resource: { values: sheetUpdate.values }
      }

      gs_client.call(updateParams, gs_client.update).then(log.info);
   });
}

function helpCommand(data) {
   let helpMessage =
      'Usage: .gear <COMMAND>\n' +
      '\tshow                  Display gear for players\n' +
      '\tupdate                Update your gear\n' +
      '\t\t -ap, --attack Set ap\n' +
      '\t\t -awk, --awakening Set awakening ap\n' +
      '\t\t -dp, --defense Set dp';
   bot.sendMessage({ to: data.channelID, message: helpMessage });
}