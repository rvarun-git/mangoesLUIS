var azure = require('azure-storage');
var async = require('async');

module.exports = MangoesList;

function MangoesList(mango) {
  this.mango = mango;
}

MangoesList.prototype = {
  showMangoes: function(req, res) {
    self = this;
    var query = new azure.TableQuery();
    self.mango.find(query, function itemsFound(error, items) {
      res.render('index',{title: 'Mangoes List ', mangoes: items});
    });
  },

  addMango: function(req,res) {
    var self = this;
    var item = req.body.item;
    self.mango.addItem(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
      res.redirect('/');
    });
  },
}
