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

exports.SetMember = functions.https.onRequest(function (request, response) {
    var dataUri = 'member/' + request.body.username;
    var memberData = {
        name: request.body.username,
        fcmToken: request.body.token,
        rank: 0
    };

    var dataReference = admin.database().ref(dataUri);
    if (dataReference != null) {
        console.log('Already registered member : memberName = ' + memberData['name']);
        dataReference.child('fcmToken').set(memberData['fcmToken']);
        response.status(200).end();
    }

    dataReference.set(memberData)
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

exports.Notification = functions.https.onRequest(function (request, response) {
    var query = admin.database().ref('member');
    var payload = {
        notification: {
            title: request.body.title,
            body: request.body.content
        }
    };
    
    console.log('Notification : title = ' + request.body.title + ', body = ' + request.body.content);
    
    query.child(request.body.sender)
         .child('admin')
         .once('value')
         .then(function(adminAccessSnapshot) {
             if (adminAccessSnapshot.val() != 2) {
                 console.log('Access denied : sender = ' + request.body.sender);
                 response.status(403).end();
             } else {
                query.once('value')
                .then(function(memberListSnapshot) {
                    var tokens = getAllTokens(memberListSnapshot);

                    admin.messaging().sendToDevice(tokens, payload);
                    console.log('Sending notification is completed.');
                    response.status(200).end();
                })
                .catch(function (error) {
                    console.log('Notification failed.');
                    console.log(error);
                    response.status(400).end();
                });
             }
         });
})

function getAllTokens(memberListSnapshot) {
    var tokens = [];

    memberListSnapshot.forEach(function (childSnapshot) {
        var token = childSnapshot.child('fcmToken').val();
        tokens.push(token);
    });

    return tokens;
}

exports.GetMemberInfo = functions.https.onRequest(function (request, response) {
    var dataUri = admin.database().ref('member/' + request.body.username);

    dataUri.once('value')
        .then(function (infoSnapshot) {
            admin.database().ref('rank').child(infoSnapshot.child('rank').val())
                .once('value')
                .then(function (snapshot) {
                    response.status(200).json({ 
                        name: infoSnapshot.child('name').val(),
                        fcmToken: infoSnapshot.child('fcmToken').val(),
                        rank: snapshot.val()                
                    });
                })
                .catch(function (error) {
                    console.log('bad accessing rank.');
                    response.status(404).end();
                })
        })
        .catch(function (error) {
            console.log('Error happened when querying a member data : memberName => ' + request.body.username);
            response.status(400).end();
        });
}); 