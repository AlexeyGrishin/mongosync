var mongosync = require('./mongosync');
var argv = require('yargs')
    .usage('Usage: $0 -db [connectionUrl] [collection1] [collection2]')
    .demand(['db'])
    .argv;

mongosync('test', argv.db, argv._).on('error', function(e) {
    console.error(e);
}).on('pull', function(col) {
    console.log('Documents downloaded from db: ' + col);
}).on('push', function(col, doc) {
    console.log('Document uploaded to db: ' + doc + " at " + col);
}).on('warning', function(doc) {
    console.warn('Found changes in doc, but cannot parse as json: ' + doc);
});
