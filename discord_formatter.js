/**
   Discord text formatter
**/
let log = require('winston');

let BUFFER = 5;
let TABLE_SPACING = 3;

/**
   context
      data
*/
exports.table = context => {
   return new Table(context);
}

function Table(context) {
   log.debug("Table construct");
   this.data = context.data;
   this.colWidth = {};

   this.rows = context.data.length;
   this.cols = context.data[0].length; // only checks title row for columns

   // Find longest item in table
   for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
         let cellLen = context.data[i][j].length + TABLE_SPACING;
         if (this.colWidth[j] == null || this.colWidth[j] < cellLen) {
            this.colWidth[j] = cellLen;
         }
      }
   }

   this.getMessage = getMessage;
}

function getMessage() {
   log.debug("getMessage");
   let table = this;

   if (table.message == null) {
      let tableMessage = '```\n';
      table.data.forEach(function(row, i) {
         tableMessage += setupRow(table, row);
      });
      tableMessage += '```';

      table.message = tableMessage;
   }

   return table.message;
}

// Format cells of a row
function setupRow(table, row) {
   log.debug("setupRow");
   let rowMessage = spaces(0);

   row.forEach(function(cell, i) {
      let displayData = '';
      if (cell) {
         displayData = cell;

         if (cell.length > table.colWidth[i]) { // truncate cell data
            displayData = cell.substring(0, table.colWidth[i] - BUFFER) + '...';
         }
      }

      let numSpaces = table.colWidth[i] - displayData.toString().length;
      rowMessage += displayData + spaces(numSpaces);
   });

   return rowMessage.trim() + '\n';
}

function spaces(num) {
   return ' '.repeat(num);
}