// Use the Azure Search to search Mangoes Azure Table

var azureSearch = require('azure-search');
var nconf = require('nconf');

module.exports = MangoesSearch;

function MangoesSearch() {
    // Read fromn environment varialbes (for Azure) and mangoes.config.json (for local)
    // NOTE: mangoes.config.jason in directory ".." to avoid replicating to GIT repo
    nconf.env()
        .file({ file: '../mangoes.config.json', search: true });
    this.searchKey = nconf.get("SEARCH_KEY");
    this.searchIndex = nconf.get("SEARCH_INDEX");
    // Setup for Azure Search access
    this.searchClient = azureSearch({
        url: "https://mangoes-search.search.windows.net",
        key: this.searchKey
    });
}

MangoesSearch.prototype = {
    searchMangoesTable: function(mtype, mregion, mchar, callback) {
        self = this;

        // Set the search string based on user query
        var searchString = null;
        if (mtype) {
            searchString = mtype;
        } else if (mregion) {
            searchString = mregion;
        } else if (mchar) {
            searchString = mchar;
        }

        // search the index
        self.searchClient.search(self.searchIndex, {search: searchString, $top: 5}, function itemsFound(error, items) {
            if(error) {
                callback(error);
            } else {
                callback(null, items);
            }
        });

        return null;

    },
}

