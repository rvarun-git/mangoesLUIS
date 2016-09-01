/*-----------------------------------------------------------------------------
Mangoes:

This BOT access the Mangoes database to get data.
It uses LUIS models to convert NLS queries to get entities: mangoregion, mangotype mangocharacteristic.
It queries the table against these entities and returns information.

-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');


// Extract string (and get rid of cruft at beginning and end)
String.prototype.getSentence = function(){
    return this.replace(/(\"([^\w]*)\")/g, "");
};

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server 
var server = restify.createServer();
server.get('/', function(req, res, next) {
    res.send('Hi! Click on http://mangoes.azurewebsites.net for Mangoes List.');
    // res.redirect('http://mangoes.azurewebsites.net', next);
});

// Listen on Port 3978 for local testing, port 80 for Azure testing (or if IIS server not running)
server.listen(process.env.port || 80, function () {
   console.log('%s listening to %s', server.name, server.url); 
}); 


// Create bot add dialogs
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Setup Mangoes DB access 
//     . (route/mangoesDB.js & thru that models/mango.js)
//=========================================================

// Access the Mangoes database
var MangoesDB = require('./routes/mangoesDB');
var mangoesDB = new MangoesDB();

//=========================================================
// Access LUIS Models
//=========================================================

// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Mangoes Bot.
var model = process.env.model || 'https://api.projectoxford.ai/luis/v1/application?id=220d5163-93f1-4fdb-b38e-8e0da28e9767&subscription-key=0e4632f472af40ea9c1e06afd5a53f9d&q=';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', [
    function (session) {
        // Send a greeting and start and wait for user query.
        var card = new builder.HeroCard(session)
            .title("Mangoes BOT")
            .text("Ask me about mangoes: 'where is sweet alphonso from?' OR 'what mangoes are from Tamil Nadu?'")
            .images([
                 builder.CardImage.create(session, "./images/Malgova.png")
            ]);
        var msg = new builder.Message(session).attachments([card]);
        session.send(msg);
        session.beginDialog('/nlquery');
    },
    function (session, results) {
        // Always say goodbye
        session.send("Ok... See you later!");
    }
]);

bot.dialog('/nlquery', dialog);

// Add intent handlers and do the query based on entities extracted
dialog.matches('QueryAboutMangoes', [
    function (session, args, next) {
        // Resolve and store any entities passed from LUIS.
        var mangotype = builder.EntityRecognizer.findEntity(args.entities, 'MangoType');
        var mangoregion = builder.EntityRecognizer.findEntity(args.entities, 'MangoRegion');
        var mangocharacteristic = builder.EntityRecognizer.findEntity(args.entities, 'MangoCharacteristic');
        var query = session.dialogData.query = {
            mangotype: mangotype ? mangotype.entity : null,
            mangoregion: mangoregion ? mangoregion.entity : null,
            mangocharacteristic: mangocharacteristic ? mangocharacteristic.entity: null
        };
//        session.send('Storage: "%s", Table: "%s", Partition: "%s"', mangoesDB.accountName, mangoesDB.tableName, mangoesDB.partitionKey);
        session.send('Query: Mango Type: "%s", Region: "%s", Characteristic:"%s"',
            query.mangotype, query.mangoregion, query.mangocharacteristic);
        mangoesDB.queryMangoesTable(query.mangotype, query.mangoregion, query.mangocharacteristic, function (err, items) {
            // CALLBACK ROUTIINE: chained all the way through other callbacks!!
            // For each item returned display a card
            items.forEach(function (itemElem){
                // Display a card
                var mtype = JSON.stringify(itemElem.NAME).getSentence();
                var mregion = JSON.stringify(itemElem.Origin).getSentence();
                var mchar = JSON.stringify(itemElem.Characteristics).getSentence();
                var q_ans = "Type: " + mtype + " Region: " + mregion + " Characteristic: " + mchar;
                var msg = new builder.Message(session)
                    .textFormat(builder.TextFormat.xml)
                    .attachments([
                        new builder.ThumbnailCard(session)
                            .subtitle("Mango")
                            .text(q_ans)
                    ]); 
                session.send(msg);
                // Type same info in string form
//                session.send('ANSWER: Mango Type: "%s", Region: "%s", Characteristic:"%s"',
//                    JSON.stringify(itemElem.NAME), JSON.stringify(itemElem.Origin), JSON.stringify(itemElem.Characteristics));
               
            });
            session.send('Mangoes BOT: PLEASE TYPE QUERIES LIKE: "where is sweet alphonso from?" or "what mangoes are from Bihar?"');
        });
    }
]);

dialog.onDefault(builder.DialogAction.send("Please type a query like: 'where is sweet alphonso from?' or 'what mangoes are from Tamil Nadu?'"));

