/*-----------------------------------------------------------------------------
Mangoes:

This BOT access the Mangoes database to get data.
It uses LUIS models to convert NLS queries to get entities: mangoregion, mangotype mangocharacteristic.
It queries the table against these entities and returns information.

-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create bot add dialogs
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Access the Mangoes database
var MangoesDB = require('./routes/mangoesDB');
var mangoesDB = new MangoesDB();

// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Mangoes Bot.
var model = process.env.model || 'https://api.projectoxford.ai/luis/v1/application?id=220d5163-93f1-4fdb-b38e-8e0da28e9767&subscription-key=0e4632f472af40ea9c1e06afd5a53f9d&q=';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

// Add intent handlers and do the query based on entities extracted
dialog.matches('QueryAboutMangoes', [
    function (session, args, next) {
        // Resolve and store any entities passed from LUIS.
        var mangoregion = builder.EntityRecognizer.findEntity(args.entities, 'MangoRegion');
        var mangotype = builder.EntityRecognizer.findEntity(args.entities, 'MangoType');
        var mangocharacteristic = builder.EntityRecognizer.findEntity(args.entities, 'MangoCharacteristic');
        var query = session.dialogData.query = {
            mangoregion: mangoregion ? mangoregion.entity : null,
            mangotype: mangotype ? mangotype.entity : null,
            mangocharacteristic: mangocharacteristic ? mangocharacteristic.entity: null
        };
        session.send('Storage: "%s", Table: "%s", Partition: "%s"', mangoesDB.accountName, mangoesDB.tableName, mangoesDB.partitionKey);
        session.send('Query: Mango region: "%s", Mango Type: "%s", Mango Characteristic:"%s"',
            query.mangoregion, query.mangotype, query.mangocharacteristic);
        session.send('Answer: "%s"', mangoesDB.queryMangoesTable(query.mangoregion, query.mangotype, query.mangocharacteristic));
    }
]);

dialog.onDefault(builder.DialogAction.send("Plase type a query like: 'where is alphonso from?'"));

