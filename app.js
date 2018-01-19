// Web Server
var express = require("express");
var app = express();

var Promise = require('bluebird');

var async = require('async');

/* serves main page */
app.get("/", function (req, res) {
    res.sendFile(__dirname + '/index.html')
});

app.post("/get_users", function (req, res) {
    get_users(req.query.username, res);
});

app.post("/get_followers", function (req, res) {
    get_followers(req.query.accountId, req.query.username, req.query.cursor, res);
    //sandbox();
});

app.post("/get_user_media", function (req, res) {
    get_user_media(req.query.accountId, req.query.username, req.query.cursor, res);
});

/* serves all the static files */
app.get(/^(.+)$/, function (req, res) {
    //     console.log('static file request : ' + req.params);
    res.sendFile(__dirname + req.params[0]);
});

var port = 5001;
app.listen(port, function () {
    console.log("Listening on " + port);
});

// Instagram API
var should = require('should');
var Client = require('./libs/instagram-private-api/client/v1');
var path = require('path');
var _ = require('lodash');
var fs = require('fs');
var rp = require("request-promise");
var dir = './cookies';

// For self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


console.log("Contacting Instagram...");
var device = new Client.Device('nilutpol');
var storage = new Client.CookieFileStorage(__dirname + '/cookies/' + 'nilutpol.json');
var promise = Client.Session.create(device, storage, 'nilutpol', 'instagram@2017');

function get_users(username, res) {
    promise.then(function (session) {
        console.log("Searching instagram user: " + username);
        return [session, Client.Account.search(session, username)];
    })
        .spread(function (session, results) {
            var converted_result = _.map(results, function (account) {
                return {
                    fullName: account.params.fullName,
                    picture: account.params.picture,
                    id: account.params.id,
                    username: account.params.username
                };
            });
            console.log(converted_result.length + ' Users found.')
            res.send(JSON.stringify(converted_result));
        });
};

function sandbox() {
    var count = 0;
    async.whilst(
        function () { return count < 5; },
        function (callback) {
            count++;
            setTimeout(function () {
                callback(null, count);
            }, 1000);
        },
        function (err, n) {
            // 5 seconds have passed, n = 5
            console.log('done')
        }
    );

    console.log('dd')
}

function get_followers(accountId, username, cursor, res) {
    let root = {};
    root.isMoreAvailable = true;
    root.data = [];
    do {
        let op = get_followers_partial(accountId, username, cursor, res);
        cursor = op.cursor;
        root.accountId = op.accountId;
        root.username = op.username;
        root.data.push(op.data);
    } while (res.isMoreAvailable);

    res.send(JSON.stringify(root));
}

function get_followers_partial(accountId, username, cursor, res) {
    promise.then(function (session) {
        console.log("Getting followers of : " + username);
        var feed = new Client.Feed.AccountFollowers(session, accountId);

        if (cursor != 'null') {
            feed.setCursor(cursor);
        }

        feed.get().then(function (results) {
            let root = {};
            var converted_result = _.map(results, function (account) {
                return {
                    id: account.params.id,
                    fullName: account.params.fullName,
                    picture: account.params.picture,
                    username: account.params.username,
                    isVerified: account.params.isVerified
                };
            });

            root.cursor = feed.cursor;
            root.accountId = accountId;
            root.username = username;
            root.isMoreAvailable = feed.isMoreAvailable();
            root.data = converted_result;

            console.log(converted_result.length + ' followers found.')
            return root;
        })
        .then(function(results) {
            console.log('ff')
        });
    });
};

function get_user_media(accountId, username, cursor, res) {
    promise.then(function (session) {
        console.log("Getting instagram user media: " + username);
        var feed = new Client.Feed.UserMedia(session, accountId);

        if (cursor != 'null') {
            feed.setCursor(cursor);
        }

        feed.get().then(function (results) {
            var root = {};
            var converted_result = _.map(results, function (account) {
                var obj = {};
                obj.caption = account.params.caption;
                obj.likeCount = account.params.likeCount;

                if (account.params.images != undefined && account.params.images.length > 1) {
                    obj.images = account.params.images;
                }

                if (account.params.videos != undefined && account.params.videos.length > 1) {
                    obj.videos = account.params.videos;
                }
                return obj;
            });

            root.cursor = feed.cursor;
            root.accountId = accountId;
            root.username = username;
            root.isMoreAvailable = feed.isMoreAvailable();
            root.data = converted_result;

            console.log(converted_result.length + ' media found.')
            res.send(JSON.stringify(root));
        });
    });
};