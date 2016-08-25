// Open the Mangoes DB and setup for querying against it

var azure = require('azure-storage');
var nconf = require('nconf');
var sprintf = require('sprintf');
var entityGen = azure.TableUtilities.entityGenerator;

module.exports = MangoesDB;

var MangoesList = require('./mangoeslist');
var Mango = require('../models/mango');
var answer = null;

// Capitalizes first letter of every word
String.prototype.capitalize = function(){
    return this.toLowerCase().replace( /\b\w/g, function (m) {
        return m.toUpperCase();
    });
};

function MangoesDB() {
    // Read fromn environment varialbes (for Azure) and mangoes.config.json (for local)
    // NOTE: mangoes.config.jason in directory ".." to avoid replicating to GIT repo
    nconf.env()
        .file({ file: '../mangoes.config.json', search: true });
    this.tableName = nconf.get("TABLE_NAME");
    this.partitionKey = nconf.get("PARTITION_KEY");
    this.accountName = nconf.get("STORAGE_NAME");
    this.accountKey = nconf.get("STORAGE_KEY");
    this.mango = new Mango(azure.createTableService(this.accountName, this.accountKey), this.tableName, this.partitionKey);
    this.mangoesList = new MangoesList(this.mango);
}


MangoesDB.prototype = {
    queryMangoesTable: function(mregion, mtype, mchar) {
        self = this;
        answer = null;
        
        var tQuery = null;
        // hack: to compensate for LUIS setting entities to all lowercase :( 
        // and Azure table search being case sensitive :(
        if (mtype) {
            var mtype2 = mtype.capitalize();
            tQuery = new azure.TableQuery()
                .top(5)
                .where('NAME eq ?', mtype)
                    .or ('NAME eq ?', mtype2)
            ;
        } else if (mregion) {
            if (mregion == "where" || mregion == "state") {}
            else {
                var mregion2 = mregion.capitalize();
                tQuery = new azure.TableQuery()
                    .top(5)
                    .where('Origin eq ?', mregion)
                        .or ('Origin eq ?', mregion2)   
                ;            
            }
        } else if (mchar) {
            var mchar2 = mchar.capitalize();
            tQuery = new azure.TableQuery()
                .top(5)
                .where('Characteristics eq ?', mchar)
                    .or ('Characteristics eq ?', mchar2)
            ;            
        }

        // If no entities were gleaned from user query just get top 10 rows from table
        if (tQuery == null) {
            tQuery = new azure.TableQuery()
                .top(10)
            ;          
        }

        // Query the "mangoes" table
        self.mango.find(tQuery, function itemsFound(error, items) {
            answer=items;
        });
        
        return answer;
//        return sprintf('Mango Type: "%s", Region: "%s", Characteristic: "%s"', mtype, mregion, mchar);
    },
}


// app.get('/', mangoesList.showMangoes.bind(mangoesList));
// app.post('/addMango', mangoesList.addMango.bind(mangoesList));
