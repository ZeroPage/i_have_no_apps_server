var functions = require('firebase-functions')
var admin = require('firebase-admin')
var request = require('request')
var express = require('express')
var bodyParser = require('body-parser')
var requestPromise = require('request-promise')

var expressApp = express()

expressApp.use(bodyParser.json())
expressApp.use(bodyParser.urlencoded({ extended: true }))
admin.initializeApp(functions.config().firebase)

exports.Authenticate = functions.https.onRequest(function(appRequest, appResponse) {
    var apiUri = 'http://zerobot.herokuapp.com/hubot/otp/' + appRequest.body.username + '/'

    var options = {
        method: 'POST',
        uri: apiUri,
        body: { 
            token: appRequest.body.token
        },
        json: true,
        resolveWithFullResponse: true,
        simple: true
    };

    console.log('Request to "' + apiUri 
        + '" with token = "' + appRequest.body.token + '", user = "' + appRequest.body.username +'"');

    requestPromise(options)
        .then(function (apiResponse) {
            console.log('Response code = ' + apiResponse.statusCode);
            console.log('The API authentication process was successful? = ' + (apiResponse.statusCode == 200));
            appResponse.status(apiResponse.statusCode).end();
        })
        .catch(function (error) {
            console.log('Error happened in the API request.');
            console.log(error);
            appResponse.status(400).end();
        })
})

exports.SetMember = functions.https.onRequest(function (request, response) {
    var dataUri = 'member/' + request.body.username;
    var memberData = {
        name: request.body.username,
        fcmToken: request.body.token
    };

    admin.database().ref(dataUri).set(memberData)
        .then(function (snapshot) {
            console.log('Successfully saved the user. To = "' + dataUri + '"');
            console.log(memberData);
            response.status(200).end();
        })
        .catch(function (error) {
            console.log('Saving the user information failed. To = "' + dataUri + '"');
            console.log(error);
            response.status(400).end();
        });
})