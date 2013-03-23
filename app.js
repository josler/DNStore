// Libraries
var express = require('express');
var app = express();
var fs = require('fs');
app.use(express.bodyParser());


// Mongo Database setup
var mongo;
app.configure('development', function(){
    mongo = {
        "hostname":"localhost",
        "port":27017,
        "username":"",
        "password":"",
        "name":"",
        "db":"db"
    }
});

// Configure for AppFog & Mongo
app.configure('production', function(){
    var env = JSON.parse(process.env.VCAP_SERVICES);
    mongo = env['mongodb-1.8'][0]['credentials'];
});
var generate_mongo_url = function(obj){
    obj.hostname = (obj.hostname || 'localhost');
    obj.port = (obj.port || 27017);
    obj.db = (obj.db || 'test');
    if(obj.username && obj.password){
        return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }else{
        return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
}
var mongourl = generate_mongo_url(mongo);

// GET request
function getData(req, res) {
	if (req.query["date"]) {
		loadFromDatabaseWithDate(req.query["name"], req.query["date"], res);
	}
    loadFromDatabase(req.query["name"], res);
}

// POST request
function saveData(req, res) {
    var jsonObj = req.body;
    saveToDatabase(jsonObj, res);
}

// Inserts date and saves into mongodb
var saveToDatabase = function(jsonObj, res) {
    res.contentType('application/json');
    jsonObj.date = new Date();
    var db = require("mongojs").connect(mongourl, ["stored"]);
    db.stored.save(jsonObj, function(err, saved) {
        if( err || !saved ) console.log("Not saved");
        else {
            res.send({status:"saved"})
        }
    });
};

// Looks up from mongodb based on name and returns earliest instance
var loadFromDatabase = function(nameIn, res) {
    res.contentType('application/json');
    var db = require("mongojs").connect(mongourl, ["stored"]);
    db.stored.find({name:nameIn}).sort({date:-1}, function(err, users) {
        if( err || !users.length) {
            res.send({error:"not found"})
            return;
        }
        else users.forEach(function(user) {
            res.send(user);
            return; // only return first match
        });  
    });
};

// Looks up from mongodb based on name and date
var loadFromDatabaseWithDate = function(nameIn, dateIn, res) {
    res.contentType('application/json');
    var db = require("mongojs").connect(mongourl, ["stored"]);
    db.stored.find({name:nameIn, date: { $gte : new Date(dateIn) }}).sort({date:1}, function(err, users) {
        if( err || !users.length) {
            res.send({error:"not found"})
            return;
        }
        else users.forEach(function(user) {
            res.send(user);
            return; // only return first match
        });  
    });
}

// Routing
app.get('/', getData);
app.post('/', saveData);
app.listen(process.env.VCAP_APP_PORT || 3000);
