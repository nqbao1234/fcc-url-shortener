let express = require('express');
let app = express();

let mongo = require('mongodb').MongoClient;
let db_url = process.env.MONGOLAB_URI; //this needs to be set on heroku

//initial connect to the database
let db = null;
mongo.connect(db_url, function(err, db_temp) {
    if (err) throw err;
    db = db_temp;
});

let validUrl = require('valid-url');

app.set('port', (process.env.PORT || 5000));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('index');
});

app.get('/new/:original_url(*)', function(req, res) {
    if (!validUrl.isUri(req.params.original_url)) {//check whether the URL is valid
        res.end(JSON.stringify({error: "Please enter a valid URL which is to be shortened."}));
        return 0;
    }
    let doc = {original_url: req.params.original_url};
    let json_data = null;
    db.collection("urls").find(doc).toArray(function(err, documents) {
        if (err) throw err;
        if (documents.length != 0){ //original_url already exists in the db
            json_data = {original_url: documents[0].original_url,
                         short_url: documents[0].short_url};
            res.end(JSON.stringify(json_data));
        } else {
            //insert new doc
            db.collection("urls").insert(doc, function(err) {
                if (err) throw err;
                console.log("inserted:\n" + JSON.stringify(doc));
                let id_str = JSON.stringify(doc._id);
                let short_id = id_str.substring(id_str.length-4, id_str.length-1);//last 3 char
                let short_url = req.protocol + '://' + req.get('host') + '/' + short_id;
                json_data = {original_url: doc.original_url,
                             short_url: short_url};
                //update the inserted doc
                console.log("modified:\n" + JSON.stringify(json_data));
                db.collection("urls").update(doc, json_data);
                //send the json to user
                res.end(JSON.stringify(json_data));
            });
        }
    });
});

app.get('/:short_url', function(req, res) {
    let full_url = req.protocol + '://' + req.get('host') + req.url;
    let query = {short_url: full_url};
    db.collection("urls").find(query).toArray(function(err, documents) {
        if (err) throw err;
        console.log(documents);
        if (documents.length == 0){ //not found any docs
            res.end(JSON.stringify({error: "The entered URL is invalid"}));
        } else { //redirect to the found url
            console.log("found:\n" + documents[0].original_url);
            res.redirect(documents[0].original_url);
        }
    });
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});

