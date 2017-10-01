let Discord = require('discord.io');
let log = require('winston');
let auth = require('./auth.json');
let gs_client = require('./gs_client.js');
let discord_formatter = require('./discord_formatter.js');

log.remove(log.transports.Console);
log.add(log.transports.Console, {
   colorize: true
});
log.level = 'debug';

let bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', event => {
   log.info('Logged in as: ');
   log.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', (user, userID, channelID, message, event) => {
   if(message == 'good job') {
      bot.sendMessage({ to: channelID, message: 'thanks' });
   }

   let data = {
      user: user,
      userID: userID,
      channelID: channelID,
      messageID: event.d.id,
      message: message,
   };

   if(message.substring(0, 1) == '.') {
      log.info(user + ' ' + userID + ' ' + channelID + ' ' + message + ' ' + event);
      data.args = message.substring(1).split(' ');
      data.command = data.args[0];

      switch(data.command) {
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
            break;
      }
   }
});

/** GEAR SCORE COMMANDS **/

let GEAR_SCORE_SPREADSHEET_ID = '1BDDFVjVa9S7c-kZd2U9a9tsnPk0otUAuM7p-UoiS-3A';
let GEAR_SCORE_SPREADSHEET_RANGE = 'Gear';

function gearCommand(data) {
   log.debug('gearCommand');
   let userMessage = data.message;
   data.subCommand = data.args[1];

   if (data.subCommand == null) {
      helpCommand(data);
      return;
   }

   data.cmdArgs = userMessage.substring(
      userMessage.indexOf(data.subCommand) + data.subCommand.length);

   switch(data.subCommand) {
      case 'show':
         showGear(data);
         break;
      case 'update':
         updateGear(data);
         break;
      case 'link':
         bot.sendMessage({
            to: data.channelID,
            message: 'https://docs.google.com/spreadsheets/d/' + GEAR_SCORE_SPREADSHEET_ID
         });
         break;
      default:
         helpCommand(data);
         break;
   }
}

function getGear(data, params) {
   log.debug('getGear');
   let getParams = {
      spreadsheetId: GEAR_SCORE_SPREADSHEET_ID,
      range: GEAR_SCORE_SPREADSHEET_RANGE,
   };

   return new Promise((fulfill, reject) => {
      let promise = gs_client.call(getParams, gs_client.get);
      promise.then(result => {
         if (params.findUser) {
            findUser(data, result);
         }

         fulfill(result);
      }, err => {
         log.error('Error in getGear')
         reject(err);
      });
   });
}

function gearMessage(data) {
   let table = discord_formatter.table({ data: data.values, });

   bot.sendMessage({ to: data.channelID, message: table.getMessage() });
}

function findUser(data, result) {
   let sheetArray = result.values;
   let userLowerCase = data.user.toLowerCase();
   let rowNum = 0;

   for (i = 0; i < sheetArray.length; i++) {
      if (sheetArray[i][0].toLowerCase() == userLowerCase) {
         data.userRow = i;
      }
   }

   if (data.userRow == null) {
      log.debug('No user matched');
   } else {
      log.debug('User matched at row ' + data.userRow);
   }

}

function showGear(data) {
   log.debug('showGear');
   let showAll = data.args[2] && data.args[2].indexOf('all') != -1;
   let promise = getGear(data, { findUser: !showAll });

   promise.then(result => {
      log.debug(data);

      data.values = result.values;

      if (!showAll) {
         data.values = [
            result.values[0],
            result.values[data.userRow]
         ];
      }

      gearMessage(data);
   }, err => {
      log.error('getGear failed: ' + err);
   });
}

function updateGear(data) {
   log.debug('updateGear');
   let promise = getGear(data, { findUser: true });

   promise.then(result => {
      if (!result) {
         log.error('Error on updateGear: no sheet data');
         return;
      }

      // no arguments for this command
      if (data.cmdArgs.length == 0) {
         helpCommand(data);
         return;
      }

      let gs_col = {
         player: 'A',
         ap: 'B',
         awk: 'C',
         dp: 'D',
         gs: 'E',
         awkgs: 'F'
      }

      let sheetUpdate = [];
      let userSheetRow = data.userRow + 1;

      // new user to add
      if (data.userRow == null) {
         userSheetRow = result.values.length + 1;
         // gear score functions
         sheetUpdate.push({
            range: GEAR_SCORE_SPREADSHEET_RANGE + '!' + gs_col.gs + userSheetRow + ':' + gs_col.awkgs + userSheetRow,
            values: [[
               '=SUM(' + gs_col.ap + userSheetRow + ',' + gs_col.dp + userSheetRow + ')',
               '=SUM(' + gs_col.awk + userSheetRow + ',' + gs_col.dp + userSheetRow + ')']]
         });
         // player name
         sheetUpdate.push({
            range: GEAR_SCORE_SPREADSHEET_RANGE + '!' + gs_col.player + userSheetRow,
            values: [[data.user]]
         })
      }

      let regex = /(\D+)(\d+)/gi;
      let updateMatch;
      while ((updateMatch = regex.exec(data.cmdArgs)) !== null) {
         let statKey = updateMatch[1];
         let statVal = updateMatch[2];
         let columnToUpdate;

         if (statKey.indexOf('ap') != -1) {
            columnToUpdate = gs_col.ap;
         } else if (statKey.indexOf('awk') != -1) {
            columnToUpdate = gs_col.awk;
         } else if (statKey.indexOf('dp') != -1) {
            columnToUpdate = gs_col.dp;
         }

         if (columnToUpdate) {
            sheetUpdate.push({
               range: GEAR_SCORE_SPREADSHEET_RANGE + '!' + columnToUpdate + userSheetRow,
               values: [[statVal]]
            });
         }
      }

      let updateParams = {
         spreadsheetId: GEAR_SCORE_SPREADSHEET_ID,
         resource: {
            valueInputOption: 'USER_ENTERED',
            data: sheetUpdate
         }
      }

      gs_client.call(updateParams, gs_client.update).then(result => {
         log.debug('succeeded gs update call:');
         log.debug(result);
         bot.addReaction({ channelID: data.channelID, messageID: data.messageID, reaction: '👌' });
      }, err => {
         log.error('failed gs update call:');
         log.error(err);
         bot.addReaction({ channelID: data.channelID, messageID: data.messageID, reaction: '❌' });
      });
   }, err => {
      log.error('failed gs get call:');
      log.error(err);
      bot.addReaction({ channelID: data.channelID, messageID: data.messageID, reaction: '❌' });
   });
}

function helpCommand(data) {
   let helpMessage =
      '```\n'+
      'Usage: .gear <command> <arguments>\n\n' +
      ' Commands:\n' +
      ' show                          Display gear for players, default will only show your own gear\n' +
      '\t all - show all users\n' +
      ' link                          Link to google spreadsheet.\n' +
      ' update [<stat> <value>]...    Update your gear, include all stats to update.\n' +
      '\t ap - AP\n' +
      '\t awk - Awakening AP\n' +
      '\t dp - DP\n' +
      '```';
   bot.sendMessage({ to: data.channelID, message: helpMessage });
}