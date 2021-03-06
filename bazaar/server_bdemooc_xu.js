const fs = require('fs');
const path = require('path');
const os = require('os');

var mysql = require('mysql');
var mysql_auth = {
    host: 'nodechat',
    user: 'root',
    password: 'smoot',
    port: 3306
};
var connection;
var bodyParser = require('body-parser');
var localPort = 80;
var localURL = "/bazaar";


// IDSAI_RANDOM_ENTITIES is only for the essay pages and the chatroom pages, NOT FOR CHATBOT. THE CHATBOT PAGE gets its entity from Data folder in runtime.
var IDSAI_RANDOM_ENTITIES =["a monkey", "an office chair", "the New York statue of Liberty",
    "a self-driving car", "Google search engine", "a snake", "a sunflower",
    "a Venus flytrap"];
// var KnowlegdeBase = {
//     "a monkey":{'intelligence':'positive', 'warrant':{'AR':'Monkeys can act rationally.','TR':'Monkeys can think rationally.','AD':'Monkeys can learn and adapt but not like a human.'}},
//     "an office chair":{'intelligence':'negative', 'warrant':{}},
//     "the New York statue of Liberty":{'intelligence':'negative', 'warrant':{}},
//     "a self-driving car":{'intelligence':'positive', 'warrant':{'AR':'Self-driving cars can act rationally.','TR':'Self-driving cars can think rationally.','AD':'Self-driving cars can learn and adapt but not like a human.'}},
//     "Google search engine":{'intelligence':'positive', 'warrant':{'AR':'Google search engine can act rationally.','AD':'Google search engine can learn and adapt but not like a human.'}},
//     "a snake":{'intelligence':'positive', 'warrant':{'AR':'Snakes can act rationally.'}},
//     "a sunflower":{'intelligence':'negative', 'warrant':{}},
//     "a Venus flytrap":{'intelligence':'negative', 'warrant':{}}
// }
// var IDSAI_RANDOM_ENTITIES = Object.keys(KnowlegdeBase);
//const host_url = "http://127.0.0.1";
//const host_url = "http://rebo4ai.know-center.tugraz.at";
function select_a_random_entity() {

    return IDSAI_RANDOM_ENTITIES[Math.floor(Math.random() * IDSAI_RANDOM_ENTITIES.length)];

};

function handleDisconnect() {
    connection = mysql.createConnection(mysql_auth); // Recreate the connection, since
    // the old one cannot be reused.

    connection.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connection.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {
            console.log('unknown db connection error', err)                      // connnection idle timeout (the wait_timeout
            handleDisconnect();
        }
    });
}

handleDisconnect();
var global_group = 1;
var global_room_type = '';
var global_task_number = 0;
var numUsers = {};
var chatroom_locked = false;
var room_usernames = {};
var csv = require('csv');
const exec = require('child_process').exec;

var express = require('express');
var app = express();
app.use(express.static('public'));
var server = require('http').createServer(app);
var io = require('socket.io')(server, { path: '/bazsocket' });

server.listen(localPort);
io.set('log level', 1);
app.use(bodyParser.urlencoded());

app.get('/bazaar/room_status_all', function (req, res) {
    console.log("app.get('/bazaar/room_status_all')");
    var connection = mysql.createConnection(mysql_auth);
    var query = 'SELECT name from nodechat.room';
    //console.log(query);
    connection.query(query, function (err, rows, fields) {
        if (err) {
            console.log(err);
            res.send(500, "<body><h2>Error</h2><p>Couldn't fetch data</p></body>");
        } else {
            var num_list = "";
            for (var i = 0; i < rows.length; i++) num_list += "<p>" + rows[i].name + "</p>";
            res.send("<body>" + num_list + "</body>");
        }
    });
});

//Behzad
// http://rebo4ai.know-center.tugraz.at/bazaar/data/user_room/?username=salam&roomname=WXQmmmmssmddhssss9LvcWVb
app.get('/bazaar/data/user_room/*', function (req, res) {

    console.log(req.url);
    console.log("app.get('/bazaar/data/user_room/')");
    console.log("username is set to " + req.query.username);
    console.log("roomname is set to " + req.query.roomname);
    var connection = mysql.createConnection(mysql_auth);
    var query = 'select m.*, r.name from nodechat.message as m inner join nodechat.room as r ON r.id = m.roomid where m.username=\"' + req.query.username + '\" and r.name=\"' + req.query.roomname + '\";';
    console.log(query);
    connection.query(query, function (err, rows, fields) {
        if (err) {
            console.log(err);
            res.send(500, "<body><h2>Error</h2><p>Couldn't fetch data</p></body>");
        } else {
            var num_list = "";
            for (var i = 0; i < rows.length; i++) num_list += "<p>" + rows[i].name + "</p>";
            res.send("<body>" + num_list + "</body>");
        }
    });
});

app.get('/bazaar/room_status*', function (req, res) {
    console.log("app.get('/bazaar/room_status*')");
    var connection = mysql.createConnection(mysql_auth);
    var query = 'SELECT name from nodechat.room where name=' + mysql.escape(req.query.roomId);
    console.log(query);
    connection.query(query, function (err, rows, fields) {
        if (err) {
            console.log(err);
            res.send(500, "<body><h2>Error</h2><p>Couldn't fetch data</p></body>");
        }
        else if (rows.length == 0) {
            res.send("Has not been used");
        }
        else {
            res.send("Has already been used");
        }
    });
});


app.get('/bazaar/observe/*', function (req, res) {
    res.sendfile('index.html');
});

app.get('/bazaar/data/IDSAI/1a_Introduction.pdf', function (req, res) {

    res.sendfile("1a - IDSAI 2021 Introduction.pdf");
});

app.get('/bazaar/idsai-landing_page', function (req, res) {
    var landing_page = 'landing-page-chatbot';

    if (req.query.html != undefined)
        landing_page = req.query.html;

    res.sendfile(landing_page + '.html');
});


// app.get('/bazaar/landing_page/chatbot_landing_page_temp*', function (req, res) {
//     var landing_page = 'chatbot-landing-page-temp';

//     if (req.query.html != undefined)
//         landing_page = req.query.html;

//     res.sendfile(landing_page + '.html');
// });

app.get('/bazaar/landing_page/IDSAI21_landing_page_1*', function (req, res) {
    var landing_page = 'IDSAI21-landing-page-1';

    if (req.query.html != undefined)
        landing_page = req.query.html;

    res.sendfile(landing_page + '.html');
});

app.get('/bazaar/landing_page/IDSAI21_landing_page_2*', function (req, res) {
    var landing_page = 'IDSAI21-landing-page-2';
    if (req.query.html != undefined)
        landing_page = req.query.html;

    res.sendfile(landing_page + '.html');
});


app.get('/bazaar/landing_page/privacy_landing_page*', function (req, res) {
    var landing_page = 'privacy-landing-page';

    if (req.query.html != undefined)
        landing_page = req.query.html;

    res.sendfile(landing_page + '.html');
});

app.get('/bazaar/landing_page/chatbot_landing_page*', function (req, res) {
    var landing_page = 'chatbot-landing-page';

    if (req.query.html != undefined)
        landing_page = req.query.html;

    res.sendfile(landing_page + '.html');
});

app.get('/bazaar/landing_page/chatroom_landing_page*', function (req, res) {
    var landing_page = 'chatroom-landing-page';

    if (req.query.html != undefined)
        landing_page = req.query.html;

    res.sendfile(landing_page + '.html');
});


app.get('/bazaar/landing_page/essay_landing_page*', function (req, res) {
    var landing_page = 'essay-landing-page';

    if (req.query.html != undefined)
        landing_page = req.query.html;

    res.sendfile(landing_page + '.html');
});


app.get('/bazaar/landing_page/random_landing_page*', function (req, res) {

    var landing_page = 'random-landing-page';

    if (req.query.html != undefined)
        landing_page = req.query.html;

    res.sendfile(landing_page + '.html');
});


app.get('/bazaar/landing_page/general_landing_page*', function (req, res) {
    var landing_page = 'general-landing-page';

    if (req.query.html != undefined)
        landing_page = req.query.html;

    res.sendfile(landing_page + '.html');
});

app.get('/bazaar/landing_page/idsai_assignment_1', function (req, res) {
    var landing_page = 'idsai-assignment-1';

    if (req.query.html != undefined)
        landing_page = req.query.html;

    res.sendfile(landing_page + '.html');
});

app.get('/bazaar/PRIVACY/*', function (req, res) {

    groups = /bazaar\/PRIVACY\/([^\/]+)\/([^\/]+)\/([^\/]+)/.exec(req.url)
    room_name = groups[1];
    room_type = groups[2];
    username = groups[3];

    var html_page = 'privacy-index-' + room_type;

    if (req.query.html != undefined)
        html_page = req.query.html;

    res.sendfile(html_page + '.html');
});

app.get('/bazaar/IDSAI21/*', function (req, res) {

    groups = /bazaar\/IDSAI21\/([^\/]+)\/([^\/]+)\/([^\/]+)/.exec(req.url)
    console.log("SERVER GET A NEW URL req.url: " + req.url)

    room_name = groups[1];
    room_type = groups[2];
    username = groups[3];
    
    global_group = room_name.split("-")[0].split("_")[3];
    global_room_type = room_type;
    global_task_number = room_name.split("-")[3];

    console.log("SERVER global_group:" + global_group);
    console.log("SERVER global_task_type:" + global_room_type);
    console.log("SERVER global_task_number:" + global_task_number);

    // var html_page = "";
    // if (global_group == '1') {
    //     html_page = 'IDSAI21-index-' + room_type;
    // } else {
    //     html_page = 'IDSAI21-index-' + room_type;
    // }
    
    var html_page = 'IDSAI21-index-' + global_room_type + '-' + global_task_number;
    console.log("SERVER ____++++++_____ html_page:  " + html_page);
    // if (room_type == "essay") {
    //     html_page += "-" + global_group;
    // }

    if (req.query.html != undefined)
        html_page = req.query.html;

    res.sendfile(html_page + '.html');
});
app.get('/bazaar/IDSAI/*', function (req, res) {

    groups = /bazaar\/IDSAI\/([^\/]+)\/([^\/]+)\/([^\/]+)/.exec(req.url)
    room_name = groups[1];
    room_type = groups[2];
    username = groups[3];

    var html_page = 'IDSAI-index-' + room_type;

    if (req.query.html != undefined)
        html_page = req.query.html;

    res.sendfile(html_page + '.html');
});

app.get('/bazaar/data/rooms/startwith/*', function (req, res) {
    console.log(req.url);
    console.log("like");

    groups = /\/data\/rooms\/startwith\/([^\/]+)/.exec(req.url)
    room = groups[1];
    var query = "SELECT r.name as room_name, " +
        "r.id as room_id, " +
        "DATE_FORMAT(r.created, '%Y-%m-%d') as room_date, " +
        "DATE_FORMAT(r.created, '%H:%i:%s') as room_time, " +
        "m.id as message_id, " +
        "DATE_FORMAT(m.timestamp, '%Y-%m-%d') as message_date, " +
        "DATE_FORMAT(m.timestamp, '%H:%i:%s') as message_time, " +
        "m.type as message_type, " +
        "m.username as username, " +
        "m.content as message_content "
        + "from nodechat.message as m "
        + "join nodechat.room as r "
        + "on m.roomid=r.id "
        + "where r.name like \"" + room + "%\""
        + " order by room_date, room_time, message_date, message_time, message_id";
    console.log(query);
    exportCSV(room, res, query);
});

app.get('/bazaar/data/room_name/*', function (req, res) {
    // SAMPLE   http://127.0.0.1/bazaar/data/room_name/?roomname=assignment_1_IDSAI_CHATROOM_SIr7s0TjvjQxDtZ
    console.log(req.url);
    //console.log("equal");

    //groups = /\/data\/([^\/]+)/.exec(req.url)	  
    room = req.query.roomname;

    var query = "SELECT r.name as room_name, " +
        "r.id as room_id, " +
        "DATE_FORMAT(r.created, '%Y-%m-%d') as room_date, " +
        "DATE_FORMAT(r.created, '%H:%i:%s') as room_time, " +
        "m.id as message_id, " +
        "DATE_FORMAT(m.timestamp, '%Y-%m-%d') as message_date, " +
        "DATE_FORMAT(m.timestamp, '%H:%i:%s') as message_time, " +
        "m.type as message_type, " +
        "m.username as username, " +
        "m.content as message_content "
        + "from nodechat.message as m "
        + "join nodechat.room as r "
        + "on m.roomid=r.id "
        + "where r.name=\"" + room + "\""
        + " order by room_date, room_time, message_date, message_time, message_id;";
    console.log(query);
    exportCSV(room, res, query);
});

app.get('/bazaar/AllData', function (req, res) {
    var query = "SELECT DATE_FORMAT(m.timestamp, '%Y-%m-%d'), DATE_FORMAT(m.timestamp, '%H:%i:%s'), m.type, m.content, m.username, r.name "
        + "from nodechat.message as m "
        + "join nodechat.room as r "
        + "on m.roomid=r.id "
        + " order by r.name, timestamp";

    exportCSV("AllData", res, query);
});

// sockets by username
var user_sockets = {};

// usernames which are currently connected to each chat room
var usernames = {};

// user_perspectives
var user_perspectives = {};
// rooms which are currently available in chat
var rooms = [];
// Behzad: The keys are realated to the URL of landing page. When Viki said "change the URL" I have to change many things
// const room_order = { 'idsai_assignment_1': ['chatbot', 'essay', 'chatroom', 'chatroom'], 'random_landing_page': ['essay', 'chatbot', 'chatroom', 'chatroom'] }
const room_order = { 'idsai_assignment_1': ['chatbot', 'essay'], 'random_landing_page': ['essay', 'chatbot', 'chatroom', 'chatroom'] }
var room_order_index = { 'idsai_assignment_1': 0, 'random_landing_page': 0 };

function isBlank(str) {
    return !str || /^\s*$/.test(str)
}
var header_stuff = "<head>\n" +
    "\t<link href='http://fonts.googleapis.com/css?family=Oxygen' rel='stylesheet' type='text/css'>\n" +
    "\t<link href='http://ankara.lti.cs.cmu.edu/include/discussion.css' rel='stylesheet' type='text/css'>\n" +
    "</head>";

function exportCSV(room, res, query) {
    var connection = mysql.createConnection(mysql_auth);

    connection.query(query, function (err, rows, fields) {

        if (err) {
            console.log(err);
            res.send(501, header_stuff + "<body><h2>Export Error</h2><p>Couldn't fetch data for room '" + room + "':</p><pre>" + err + "</pre></body>");
        } else if (rows.length == 0) {
            res.send(404, header_stuff + "<body><h2>Empty Room</h2><p>Couldn't fetch data for <strong>empty room</strong> '" + room + "'.</p></body>");
        } else {
            const filename = path.join('output.csv');

            var delimiter = ",";
            var csv = 'room_name' + delimiter + 'room_id' + delimiter + 'room_date' + delimiter + 'room_time' + delimiter + 'message_id' + delimiter + 'message_date' + delimiter + 'message_time' + delimiter + 'message_type' + delimiter + 'username' + delimiter + 'message_content\n';
            rows.forEach(function (d) {
                const row = []; // a new array for each row of data
                row.push(d.room_name);
                row.push(d.room_id);
                row.push(d.room_date);
                row.push(d.room_time);
                row.push(d.message_id);
                row.push(d.message_date);
                row.push(d.message_time);
                row.push(d.message_type);
                // itemDesc = d.username.replace(/(\r\n|\n|\r|\s+|\t|&nbsp;)/gm,' ');
                // itemDesc = itemDesc.replace(/,/g, '\,');
                // itemDesc = itemDesc.replace(/"/g, '\"');
                // itemDesc = itemDesc.replace(/'/g, '\'');
                // itemDesc = itemDesc.replace(/ +(?= )/g,'');
                // row.push('\"' + d.username + '\",');
                row.push(connection.escape(d.username));

                //itemDesc = d.message_content.replace(/(\r\n|\n|\r|\s+|\t|&nbsp;)/gm,' ');
                //itemDesc = itemDesc.replace(/,/g, '\,');
                // itemDesc = itemDesc.replace(/"/g, '\"');
                // itemDesc = itemDesc.replace(/'/g, '\'');
                // itemDesc = itemDesc.replace(/ +(?= )/g,'');
                //console.log(itemDesc);
                //console.log(connection.escape(itemDesc));
                row.push(connection.escape(d.message_content));


                var tmp = row.join(delimiter);

                csv += tmp + "\n";
            });


            fs.writeFileSync(filename, csv);

            res.set('Content-Type', 'text/csv');
            res.header("Content-Disposition", "attachment; filename=output.csv");
            res.sendfile(filename);
        }
    });
}

function loadHistory(socket, secret) {
    console.log('-----------q-----loadHistory------------------');

    console.log(socket.type);
    console.log(socket.username);
    console.log(socket.room);
    console.log(socket.root_page);
    console.log('----------------loadHistory------------------');
    if (!socket.temporary) {
        var id = null;
        if (socket.room in usernames && socket.username in usernames[socket.room]) {
            id = usernames[socket.room][socket.username];
        }

        var perspective = null;
        if (socket.room in user_perspectives && socket.username in user_perspectives[socket.room]) {
            perspective = user_perspectives[socket.room][socket.username];
        }

        connection.query('insert ignore into nodechat.room set name=' + connection.escape(socket.room) + ', created=NOW(), modified=NOW(), comment="auto-created", type=' + connection.escape(socket.type) + ', created_by = ' + connection.escape(socket.root_page) + ';', function (err, rows, fields) {
            //console.log('rows.affectedRows ' + rows.affectedRows);
            //if (rows.affectedRows === 1 && socket.room.substring(0, 15) === 'IDSAI_CHATROOM_') {
            if (rows.affectedRows === 1 && socket.type === 'chatroom') {
                // it is a new room with one user
                connection.query('update nodechat.room set available_for_chatroom = 1 where room.name=' + connection.escape(socket.room) + ';', function (err, results) {
                    if (err)
                        console.log(err);
                });

            }
            else if (rows.affectedRows === 0 && socket.type === 'chatroom') {
                // it is a old room and second user joined

                connection.query('update nodechat.room set available_for_chatroom = 0 where room.name=' + connection.escape(socket.room) + ';', function (err, results) {
                    if (err)
                        console.log(err);
                });

            }
            setTimeout(function (socket) {
                var connection = mysql.createConnection(mysql_auth);

                connection.query('SELECT m.timestamp, m.type, m.content, m.username from nodechat.message '
                    + 'as m join nodechat.room as r on m.roomid=r.id '
                    + 'where r.name=' + connection.escape(socket.room) + ' and not(m.type like "private") order by timestamp', function (err, rows, fields) {
                        if (err)
                            console.log(err);

                        socket.emit('dump_history', rows);

                        if (!secret) {
                            //console.log('367 ---------------');
                            io.sockets.in(socket.room).emit('updatepresence', socket.username, 'join', id, perspective);
                            logMessage(socket, "join", "presence", '');
                            //#region INTRO
                            if (socket.type === 'chatroom') {

                                if (numUsers[socket.room] == 2) {
                                    var rand_entoty = select_a_random_entity();
                                    var tmp = 'In the TUGraz lecture "Introduction to Data Science and Artificial Intelligence (IDSA)", different definitions of intelligence have been discussed. According to different definitions, something or someone would be called intelligent if it <b>thinks humanly</b>, <b>acts humanly</b>, <b>thinks rationally</b>, <b>acts rationally</b>; or if it is able to <b>adapt behaviour to a changing environment</b> in order to achieve its goals. This information is also available <a target="_blank" rel="noopener noreferrer"  href="http://rebo4ai.know-center.tugraz.at/bazaar/data/IDSAI/1a_Introduction.pdf" download="http://rebo4ai.know-center.tugraz.at/bazaar/data/IDSAI/1a_Introduction.pdf">here</a>.';
                                    logMessage(socket, tmp, "INFO", 'INFO');
                                    io.sockets.in(socket.room).emit('updatechat', 'INFO', tmp);

                                    var tmp1 = "Please discuss together in this chat whether <b>" + rand_entoty + "</b> would be considered intelligent or not. In your reflections, use and refer to the above discussions. Please also consider how satisfied you are with your conclusion; and whether you want to change anything in the definition.";
                                    logMessage(socket, tmp1, "INFO", 'INFO');
                                    io.sockets.in(socket.room).emit('updatechat', 'INFO', tmp1);

                                    var tmp2 = "When you are finished, please click 'End of conersation' button. Then, you can have a conversation with our agent, <b>Rebo4AI</b>.";
                                    logMessage(socket, tmp2, "INFO", 'INFO');
                                    io.sockets.in(socket.room).emit('updatechat', 'INFO', tmp2);
                                    //io.sockets.in(socket.room).emit('updatechat', 'INFO', 'Now, you can talk to each other :)');
                                }
                                else if (numUsers[socket.room] == 1) {
                                    logMessage(socket, "Please wait for another user.", "INFO", 'INFO');
                                    io.sockets.in(socket.room).emit('updatechat', 'INFO', 'Please wait for another user.');
                                }
                            }
                            //else if (socket.room.substring(0, 12) === 'IDSAI_ESSAY_') {
                            else if (socket.type === 'essay') {
                                console.log("SERVER ESSAY QUESTION: ");
                                console.log(socket.type);
                                console.log(socket.username);
                                console.log(socket.room);
                                console.log(socket.root_page);
                                console.log(socket.room.includes("IDSAI21"));
                                console.log(socket.room.includes("-essay-2"));
                                console.log(socket.room.includes("IDSAI21") && socket.room.includes("-essay-2"));

                                if (socket.room.includes("IDSAI21") && socket.room.includes("-essay-2")) {
                                    //BEHZAD: Here you send the question of the essay.
                                    // var tmp = "You and your family love the beach and decide to spend a weekend at an isolated beach cabin. Your teenage daughter often gets bored on your getaways, so you make plans to take your niece along. As soon as you arrive, a storm is looming on the horizon and the water looks rough. You tell the girls they can get ready to swim, but to come back and help unload the car. They are so excited, they do not pay attention to the last part of what you say and run down to the beach to swim. <br><br>You do not realize they have done so until you hear your daughter scream. You realize they are both caught in a strong current and might be swept out to sea. You are a good swimmer and know you can save one of them. You have a difficult choice to make. Do you:<br><ul><li>Save your niece first as she is a poor swimmer and will not be able to last as long as your daughter?</li><li>Save your daughter first, because, although she is a strong swimmer and may be able to last long enough for you to come back after saving your niece, you cannot stand the idea of losing her?</li></ul>"
                                    var tmp = "There is a trolley coming down the tracks and ahead, there are five people tied to the tracks and are unable to move. The trolley will continue coming and will kill the five people. There is nothing you can do to rescue the five people EXCEPT that there is a lever. If you pull the lever, the train will be directed to another track, which has ONE person tied to it.<br><br>What do you do? Please, justify your claim.<br>"
                                    logMessage(socket, tmp, "INFO", 'INFO');
                                    io.sockets.in(socket.room).emit('Show_question_of_essay', tmp);
                                } else {
                                    //BEHZAD: Here you send the question of the essay.
                                    //var rand_entity = select_a_random_entity();
                                    var rand_entity = "a self-driving car";
                                    var tmp = "In the TUGraz lecture 'Introduction to Data Science and Artificial Intelligence (IDSA)', different definitions of intelligence have been discussed. According to different definitions, something or someone would be called intelligent if it <strong>thinks humanly, acts humanly, thinks rationally, acts rationally</strong>; or if it is <strong>able to adapt behaviour</strong> to a changing environment in order to achieve its goals. This information is also available <a target='_blank' rel='noopener noreferrer'  href='http://rebo4ai.know-center.tugraz.at/bazaar/data/IDSAI/1a_Introduction.pdf' download='http://rebo4ai.know-center.tugraz.at/bazaar/data/IDSAI/1a_Introduction.pdf'>here</a>.<br><br>Please reflect below on whether <b>" + rand_entity + "</b> would be considered intelligent or not. In your reflections, use and refer to the above discussions. Please also consider how satisfied you are with your conclusion; and whether you want to change anything in the definition. When you are finished press the submit button, please.";
                                    logMessage(socket, tmp, "INFO", 'INFO');
                                    io.sockets.in(socket.room).emit('Show_question_of_essay', tmp);
                                }
                                
                            }
                            //#endregion
                            // console.log('------------------------------------------------------');
                            // console.log(socket.type);
                            // console.log(socket.room);
                            // console.log(socket.username);
                            // console.log('------------------------------------------------------');

                        }
                    });

                connection.end()
            }, 100, socket);

        });
    }
    else if (!secret) {
        console.log('555 ---------------');

        io.sockets.in(socket.room).emit('updatepresence', socket.username, 'join', id, perspective);
    }
}

function logEssay(socket, content, type) {
    if (socket.temporary)
        return;

    connection.query('update nodechat.room set modified=now() where room.name=' + connection.escape(socket.room) + ';', function (err, rows, fields) {
        if (err)
            console.log(err);
    });

    endpoint = "unknown"

    if (socket.handshake)
        endpoint = socket.handshake.address;

    query = 'insert into nodechat.message (roomid, username, useraddress, userid, content, type, timestamp)'
        + 'values ((select id from nodechat.room where name=' + connection.escape(socket.room) + '), '
        + '' + connection.escape(socket.username) + ', ' + connection.escape(endpoint.address + ':' + endpoint.port) + ', '
        + connection.escape(socket.Id) + ', ' + connection.escape(content) + ', ' + connection.escape(type) + ', now());';

    connection.query(query, function (err, rows, fields) {
        if (err)
            console.log(err);
    });
}

function logMessage(socket, content, type, user) {
    //if(chatroom_locked)
    //    return;

    // if(socket.temporary) 
    // 	return;

    connection.query('update nodechat.room set modified=now() where room.name=' + connection.escape(socket.room) + ';', function (err, rows, fields) {
        if (err)
            console.log(err);
    });

    endpoint = "unknown"

    if (socket.handshake)
        endpoint = socket.handshake.address;
    if (user === '')
        u = connection.escape(socket.username);
    else
        u = connection.escape(user);

    query = 'insert into nodechat.message (roomid, username, useraddress, userid, content, type, timestamp)'
        + ' values ((select id from nodechat.room where name=' + connection.escape(socket.room) + '), '
        + '' + u + ', ' + connection.escape(endpoint.address + ':' + endpoint.port) + ', '
        + connection.escape(socket.Id) + ', ' + connection.escape(content) + ', ' + connection.escape(type) + ', now());';

    connection.query(query, function (err, rows, fields) {
        if (err)
            console.log(err);
    });

}

// if it is a chatbotroom Check on join if chatbot already done
// if so then lock the chatroom textarea
function checkChatbotFinished(room, callback) {
    query = 'SELECT * FROM nodechat.message as m JOIN nodechat.room as r on m.roomid=r.id WHERE r.name=' + connection.escape(room)
        + ' AND m.content=\'leave\' AND m.type=\'presence\' AND m.username=\'Rebo4AI\';';

    connection.query(query, function (err, results) {
        if (err)
            console.log(err);

        return callback(results)
    });
}

function checkEssayAlreadyWritten(room, callback) {
    query = 'SELECT * FROM nodechat.message as m JOIN nodechat.room as r on m.roomid=r.id WHERE r.name=' + connection.escape(room)
        + ' AND m.type=' + connection.escape('text') + ';';

    connection.query(query, function (err, results) {
        if (err)
            console.log(err);

        return callback(results)
    });
}


function checkFirstJoin(room, callback) {
    count = 0;

    query = 'SELECT * FROM nodechat.message as m JOIN nodechat.room as r on m.roomid=r.id WHERE r.name=' + connection.escape(room);
    //	+ ' AND m.content=\'join\' AND m.type=\'presence\';';


    connection.query(query, function (err, results) {
        if (err)
            console.log(err);

        return callback(results)
    });
}

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

function find_a_proper_chatroom(room_name, available_for_chatroom, callback) {
    query = "SELECT name FROM nodechat.room where available_for_chatroom = " + available_for_chatroom + " and type = \"chatroom\" and num_users = 1 and name like \"" + room_name + "%\" ORDER BY created ASC LIMIT 1;";
    //console.log(query);
    connection.query(query, function (err, rows, fields) {
        if (err)
            console.log(err);
        return callback(rows)
    });
}

function chatroom_end_of_conversation_button(socket) {

    // var tmp = connection.escape(socket.username) + ' has finished the conversation by clicking the \'End of conversation\' button or closing the chatroom page.';
    // logMessage(socket, tmp, "INFO", 'INFO');
    // io.sockets.in(socket.room).emit('updatechat', 'INFO', tmp);

    if (socket.room in numUsers && numUsers[socket.room] != 0) {
        console.log("numUsers[room] is :" + numUsers[socket.room]);
        
        var tmp = 'The room is locked.';
        logMessage(socket, tmp, "INFO", 'INFO');
        io.sockets.in(socket.room).emit('updatechat', 'INFO', tmp);

        var tmp = 'You can save the conversation by clicking on the "Download Chat Log" button.';
        logMessage(socket, tmp, 'INFO', 'INFO');
        io.sockets.in(socket.room).emit('updatechat', 'INFO', tmp);

        var tmp = 'Many thanks for bearing with us, and first discussing this issue with another student. With many thanks, we now invite you to have a discussion with our chatbot, Rebo4AI. Please, click the link in the hint section.';
        logMessage(socket, tmp, 'INFO', 'INFO');
        io.sockets.in(socket.room).emit('updatechat', 'INFO', tmp);

        io.sockets.in(socket.room).emit('lockTextArea', '');
        io.sockets.in(socket.room).emit('chatroom_end_of_conversation_button_change_view');
    }
    

};


function checking_validity_of_user(sender, prefix_room, suffix_room, password, group_study, callback) {
    //Behzad: Here you need to check the password and also this should be the first try of the user

    // console.log('find_a_proper_room ----> ')
    // console.log(sender);
    // console.log(prefix_room);
    // console.log(suffix_room);
    var connection = mysql.createConnection(mysql_auth);
    var query = 'SELECT * from nodechat.user WHERE user.group = \'' + connection.escape(group_study) +'\' and user.password=' + connection.escape(password);
    console.log('SERVER: IDSAI21 query: ' + query);

    var user_id;
    var user_student_id;
    var user_password;
    var user_login_timestamp;
    var user_group;
    var user_number_of_tries;
    var user_comment; 
    //console.log(query);
    connection.query(query, function (err, rows) {
        if (err) {
            console.log(err);
            res.send(500, "<body><h2>Error</h2><p>Couldn't fetch data</p></body>");
        } else if (rows.length > 0) {
            console.log('SERVER: IDSAI21 rows: ' + rows);
            console.log('SERVER: IDSAI21 row[0]: ' + rows[0]);
            user_id = rows[0].id;
            user_student_id = rows[0].student_id;
            user_password = rows[0].password;
            user_login_timestamp = rows[0].login_timestamp;
            user_group = rows[0].group;
            user_number_of_tries = rows[0].number_of_tries;
            user_comment = rows[0].comment;   
            console.log('SERVER: IDSAI21 id: ' + user_id);
            console.log('SERVER: IDSAI21 password: ' + user_password);
            console.log('SERVER: IDSAI21 tries: ' + user_number_of_tries);
            console.log('SERVER: IDSAI21 user_login_timestamp: ' + user_login_timestamp);
            // console.log(typeof rows);
            if (user_number_of_tries == 0) {
                var query = 'update nodechat.user set number_of_tries = number_of_tries+1, login_timestamp=now() where password=\"' + user_password + '\" and id=' + connection.escape(user_id) + ';'
                console.log('SERVER: IDSAI21 query: ' + query);
                connection.query(query, function (err) {
                    if (err)
                        console.log(err);
                    else
                        console.log('SERVER: IDSAI21 THIS IS THE FIRST TRY');
                });
                var results = {group:user_group, password:user_password};   
                

                callback(results);
            }
            else {
                console.log('SERVER: IDSAI21 user_number_of_tries: ' + user_number_of_tries);
                callback('This password is already used. Please send an email to \"bmirzababaei AT know-center DOT at\" if it\'s not used by you.');
            }
        }
        else {
            console.log('SERVER: IDSAI21 The password is incorrect!');
            callback('The password is incorrect!')
        }
    });
    
}
function find_a_proper_room(sender, prefix_room, suffix_room, manner_or_roomtype, callback) {
    //    location.href = host + "/bazaar/chat/IDSAI_"+makeid(15)+"/chatbot/"+document.getElementById("textbox").value;
    //const room_order = ['chatbot','essay','chatroom','chatroom']; 
    //var room_order_index = 0;
    // console.log('find_a_proper_room ----> ')
    // console.log(sender);
    // console.log(prefix_room);
    // console.log(suffix_room);
    var splitter = '-';
    console.log(manner_or_roomtype);
    if (manner_or_roomtype === 'RANDOM') {
        //switch (room_order[room_order_index]) {
        switch (room_order[sender][room_order_index[sender]]) {
            case 'chatroom':
                const room_name = sender + prefix_room;
                const available_for_chatroom = 1;
                find_a_proper_chatroom(room_name, available_for_chatroom, function (results) {
                    var the_name = ''
                    if (results.length > 0) {
                        console.log('SERVER: Send the name of room to client: ' + results[0].name);

                        the_name = results[0].name + '/chatroom/';
                        //io.sockets.emit('give_me_a_proper_room', results[0].name);
                        //io.sockets.in(id_for_socket).emit('give_me_a_proper_room', results[0].name);
                    }
                    else {
                        console.log('SERVER: Send the name of room to client: NONE');
                        //io.sockets.emit('give_me_a_proper_room', 'NONE');
                        //io.sockets.in(id_for_socket).emit('give_me_a_proper_room', 'NONE');

                        the_name = room_name + splitter + makeid(15) + suffix_room + '/chatroom/';

                    }
                    //console.log('SERVER: After IF-ELSE');
                    callback(the_name);

                });
                break;

            case 'chatbot':
                callback(sender + prefix_room + splitter + makeid(15) + suffix_room + '/chatbot/');
                break;
            case 'essay':
                callback(sender + prefix_room + splitter + makeid(15) + suffix_room + '/essay/')
                break;
        };
        console.log('Incresing the room_index by one');
        room_order_index[sender] = room_order_index[sender] + 1;
        if (room_order_index[sender] > room_order[sender].length - 1) {
            room_order_index[sender] = 0;
        }

    }
    else if (manner_or_roomtype.startsWith("IDSAI21")) {
        var tmp = manner_or_roomtype.split("_");
        var room_name = tmp[2];
        var room_type = tmp[1];
        console.log('SERVER:*****IDSAI21 ROOM******* manner_or_roomtype= ' + manner_or_roomtype);
        console.log('SERVER:*****IDSAI21 ROOM******* sender= ' + sender);
        console.log('SERVER:*****IDSAI21 ROOM******* room_type= ' + room_type);
        console.log('SERVER:*****IDSAI21 ROOM******* prefix_room= ' + prefix_room);
        console.log('SERVER:*****IDSAI21 ROOM******* splitter= ' + splitter);
        console.log('SERVER:*****IDSAI21 ROOM******* suffix_room= ' + suffix_room);
        console.log('SERVER:*****IDSAI21 ROOM******* all= ' + sender + prefix_room + splitter + room_name + suffix_room + '/' + room_type + '/');
        if(Math.random() >= 0.5) {
            callback(sender + prefix_room + splitter + room_name + "-" + room_type + '-1-AN' + suffix_room + '/' + room_type + '/');

        }
        else {
            callback(sender + prefix_room + splitter + room_name + "-" + room_type + '-1-AI' + suffix_room + '/' + room_type + '/');

        }
        

        // callback(sender + prefix_room + splitter + room_name + "-" + room_type + '-1' + suffix_room + '/' + room_type + '/');
    }
    else if (manner_or_roomtype === 'PRIVACY') {
        console.log('SERVER:*****PRIVACY ROOM******* sender= ' + sender);
        console.log('SERVER:*****PRIVACY ROOM******* prefix_room= ' + prefix_room);
        console.log('SERVER:*****PRIVACY ROOM******* splitter= ' + splitter);
        console.log('SERVER:*****PRIVACY ROOM******* suffix_room= ' + suffix_room);
        console.log('SERVER:*****PRIVACY ROOM******* all= ' + sender + prefix_room + splitter + makeid(15) + suffix_room + '/privacy/');
        callback(sender + prefix_room + splitter + makeid(15) + suffix_room + '/chatbot/');
    }
    else if (manner_or_roomtype === 'CHATBOT') {
        callback(sender + prefix_room + splitter + makeid(15) + suffix_room + '/chatbot/');
    }
    else if (manner_or_roomtype === 'ESSAY') {
        callback(sender + prefix_room + splitter + makeid(15) + suffix_room + '/essay/');
    }
    else if (manner_or_roomtype === 'CHATROOM') {
        const room_name = sender + prefix_room;
        const available_for_chatroom = 1;
        find_a_proper_chatroom(room_name, available_for_chatroom, function (results) {
            var the_name = ''
            if (results.length > 0) {
                console.log('SERVER: Send the name of room to client: ' + results[0].name);

                the_name = results[0].name + '/chatroom/';
                //io.sockets.emit('give_me_a_proper_room', results[0].name);
                //io.sockets.in(id_for_socket).emit('give_me_a_proper_room', results[0].name);
            }
            else {
                console.log('SERVER: Send the name of room to client: NONE');
                //io.sockets.emit('give_me_a_proper_room', 'NONE');
                //io.sockets.in(id_for_socket).emit('give_me_a_proper_room', 'NONE');

                the_name = room_name + splitter + makeid(15) + suffix_room + '/chatroom/';

            }
            //console.log('SERVER: After IF-ELSE');
            callback(the_name);

        });
    }


}

io.sockets.on('connection', function (socket) { //This socket parameter is the socket that a clint made and made a connection throught it to the server 
    socket._number_of_users = 0;
    socket._room_name = '';
    socket._users = [];
    socket.on('check_room_is_avalable', function (room, type, callback) {
        // if (type === 'chatroom'){
        //     console.log("type === 'chatroom'");
        //     query = 'SELECT name, num_users, available_for_chatroom FROM nodechat.room WHERE name='+connection.escape(room);
        // }
        // else {
        //     console.log("type !!! 'chatroom'");
        query = 'SELECT name, num_users, available_for_chatroom, type, created_by FROM nodechat.room WHERE name=' + connection.escape(room);
        // }
        connection.query(query, function (err, results) {
            if (err)
                console.log(err);

            var the_name = ''
            if (results.length > 0) {
                console.log('SERVER: the room is already exist: name= ' + results[0].name + ' type= ' + type);
                if (type === 'chatroom' && results[0].available_for_chatroom === 1) {

                    callback(false, 'None');
                }
                else
                    callback(true, results[0]);
            }
            else {
                console.log('SERVER: This is a new room.');
                //io.sockets.emit('give_me_a_proper_room', 'NONE');
                //io.sockets.in(id_for_socket).emit('give_me_a_proper_room', 'NONE');
                callback(false, 'None');

            }
            //console.log('SERVER: After IF-ELSE');
        });

    });


    socket.on('chatroom_end_of_conversation_button', function () {
        chatroom_end_of_conversation_button(socket);
    });

    // when the client emits 'adduser', this listens and executes
    socket.on('adduser', function (room, username, temporary, type, perspective, root_page, agent_name) {


        console.log('room ' + room);
        console.log('username ' + username);
        console.log('temporary ' + temporary);
        console.log('type ' + type);
        console.log('perspective ' + perspective);

        var id = 1;

        //console.log(username);
        socket.root_page = root_page;
        socket.room = room;
        if (isBlank(username)) {
            origin = socket.handshake.address
            username = "Guest " + (origin.address + origin.port).substring(6).replace(/\./g, '');
        }

        if (isBlank(room))
            room = "Limbo"

        //don't log anything to the db if this flag is set
        socket.temporary = temporary;

        // store the username in the socket session for this client
        // console.log("socket.username: " + socket.username);
        // socket.username = username;

        // store the room name in the socket session for this client
        socket.username = username;
        socket.room = room;
        socket.type = type;
        if (!(room in room_usernames)) {
            room_usernames[room] = username
        }
        else if (username === room_usernames[room]) {
            username = username + "(2)";
            socket.username = username;

            io.sockets.in(socket.room).emit('handel_similar_username', username);


        }

        socket.Id = id;
        // add the client's username to the global list
        if (!usernames[room])
            usernames[room] = {};

        //console.log("usernames[room][username] = " + usernames[room][username]);
        usernames[room][username] = id;

        //console.log("usernames[room] = " + usernames[room]);

        if (!user_perspectives[room])
            user_perspectives[room] = {};
        user_perspectives[room][username] = perspective;

        // send client to room 1
        socket.join(room);

        if (!user_sockets[room])
            user_sockets[room] = {};
        user_sockets[room][username] = socket;

        //console.log('+++++++++++++++++++line 824 adduser');        
        loadHistory(socket, false);
        //console.log('usernames[socket.room], ' + usernames[socket.room] + ', user_perspectives[socket.room]: '+ user_perspectives[socket.room])
        if (agent_name == "IDSAI21")
        {
            if (username != "Rebo4AI") {
                if (room in numUsers) {
                    console.log("numUsers[room] is increased by 1");
                    numUsers[room] = numUsers[room] + 1;
                }
                else {
                    console.log("numUsers[room] is set to 1");

                    numUsers[room] = 1;
                }
                console.log("numUsers[room]: " + numUsers[room]);

                connection.query('update nodechat.room set modified=now(), num_users=num_users+1 where room.name=\'' + room + '\';', function (err, results) {
                    //console.log(results.affectedRows + " record(s) updated");
                    if (err)
                        console.log(err);
                });
                if (type == "chatroom") {
                    io.sockets.in(socket.room).emit('chatroomTypeMode');

                    console.log('Username of ' + username + ' is joined to room:' + room + '. The mode is ' + type);
                    console.log('number of users in this room,' + room + ', is ' + numUsers[room] + '. The mode is ' + type);
                    // update the num_users in the room table: num_users++
                    //console.log('update nodechat.room set modified=now(), num_users=num_users+1 where room.name=\''+room+'\';');

                    //connection.query('update nodechat.room set modified=now(), num_users=num_users+1 where room.name= \''+room+'\';', function(err, results)

                    var count = 0;
                    checkFirstJoin(room, function (result) {
                        count = result.length;
                    });

                } else if (type == "chatbot") {
                    io.sockets.in(socket.room).emit('chatbotTypeMode');

                    console.log('Username of ' + username + ' is added to room:' + room + '. The mode is ' + type);
                    var count = 0;
                    console.log('checkFirstJoin(room)-------------- ' + room);
                    console.log('checkFirstJoin(socket.room)-------------- ' + socket.room);
                    checkFirstJoin(room, function (result) {
                        count = result.length;

                        /* const fs = require('fs');
                        fs.writeFile('rebologforcount.log', count, (err) => {
                            if (err) throw err;
                        }); */

                        /* Behzad
                        * For debugging my agent, which is in my local computer, I need to connect my agent to a chatroom in server.
                        * Since the agent on the server will be executed automatically whenever a user join the room, I have to add this condition !room.startsWith("debug")
                        * in order to prevent the server agent from joining the room. 
                        * In other words, if a chatroom's name starts with "debug", the agent located on the server will not execute. Thus, I can connect to the room with my local agent. 
                        */
                        if (count < 2 && !room.startsWith("debug")) {
                            /* Behzad
                            *    You need to change this address whenever you want to run your agent 
                            */
                            var script = 'sh ../IDSAI21Agent/launch_agent.sh ';
                            var command = script.concat(room);
                            console.log("SERVER SH COMMAND -----_-_-_-_------: " + command);
                            exec(command, (error, stdout, stderr) => {
                                if (error) {
                                    console.error(`exec error: ${error}`);
                                    /* console.log('384'); */
                                    return;
                                }
                                /* console.log('387'); */
                                console.log(`stdout: ${stdout}`);
                                console.log(`stderr: ${stderr}`);
                            });
                            console.log("A new instance of our agent will be started. Room:" + room + ' username:' + username);
                        }
                        else {
                            console.log("Entering debugging mode OR more than one entity in a room. Room:" + room + ' username:' + username);
                        }
                    });

                    checkChatbotFinished(room, function (results) {
                        if (results.length > 0 && !room.startsWith("debug")) {
                            io.sockets.in(socket.room).emit('lockTextArea', results);
                            chatroom_locked = true;
                        }
                    });
                } else if (type == "essay") {
                    console.log('Username of ' + username + ' attended to write an essay in this room:' + room + '. The mode is ' + type);
                    checkEssayAlreadyWritten(room, function (results) {
                        if (results.length == null || results.length == 0) {
                            io.sockets.in(socket.room).emit('essayTypeMode', room);
                        } else if (results.length > 0) {
                            io.sockets.in(socket.room).emit('essayFinished', room);
                            chatroom_locked = true;
                        }
                    });
                }


            }
            else {
                console.log('Username of ' + username + ' is added to room:' + room);
            }
        }
        if (agent_name == "IDSAI")
        {
            if (username != "Rebo4AI") {
                if (room in numUsers) {
                    console.log("numUsers[room] is increased by 1");
                    numUsers[room] = numUsers[room] + 1;
                }
                else {
                    console.log("numUsers[room] is set to 1");

                    numUsers[room] = 1;
                }
                console.log("numUsers[room]: " + numUsers[room]);

                connection.query('update nodechat.room set modified=now(), num_users=num_users+1 where room.name=\'' + room + '\';', function (err, results) {
                    //console.log(results.affectedRows + " record(s) updated");
                    if (err)
                        console.log(err);
                });
                if (type == "chatroom") {
                    io.sockets.in(socket.room).emit('chatroomTypeMode');

                    console.log('Username of ' + username + ' is joined to room:' + room + '. The mode is ' + type);
                    console.log('number of users in this room,' + room + ', is ' + numUsers[room] + '. The mode is ' + type);
                    // update the num_users in the room table: num_users++
                    //console.log('update nodechat.room set modified=now(), num_users=num_users+1 where room.name=\''+room+'\';');

                    //connection.query('update nodechat.room set modified=now(), num_users=num_users+1 where room.name= \''+room+'\';', function(err, results)

                    var count = 0;
                    checkFirstJoin(room, function (result) {
                        count = result.length;
                    });

                } else if (type == "chatbot") {
                    io.sockets.in(socket.room).emit('chatbotTypeMode');

                    console.log('Username of ' + username + ' is added to room:' + room + '. The mode is ' + type);
                    var count = 0;
                    console.log('checkFirstJoin(room)-------------- ' + room);
                    console.log('checkFirstJoin(socket.room)-------------- ' + socket.room);
                    checkFirstJoin(room, function (result) {
                        count = result.length;

                        /* const fs = require('fs');
                        fs.writeFile('rebologforcount.log', count, (err) => {
                            if (err) throw err;
                        }); */

                        /* Behzad
                        * For debugging my agent, which is in my local computer, I need to connect my agent to a chatroom in server.
                        * Since the agent on the server will be executed automatically whenever a user join the room, I have to add this condition !room.startsWith("debug")
                        * in order to prevent the server agent from joining the room. 
                        * In other words, if a chatroom's name starts with "debug", the agent located on the server will not execute. Thus, I can connect to the room with my local agent. 
                        */
                        if (count < 2 && !room.startsWith("debug")) {
                            /* Behzad
                            *    You need to change this address whenever you want to run your agent 
                            */
                            var script = 'sh ../Rebo4aiAgent/launch_agent.sh ';
                            var command = script.concat(room);
                            exec(command, (error, stdout, stderr) => {
                                if (error) {
                                    console.error(`exec error: ${error}`);
                                    /* console.log('384'); */
                                    return;
                                }
                                /* console.log('387'); */
                                console.log(`stdout: ${stdout}`);
                                console.log(`stderr: ${stderr}`);
                            });
                            console.log("A new instance of our agent will be started. Room:" + room + ' username:' + username);
                        }
                        else {
                            console.log("Entering debugging mode OR more than one entity in a room. Room:" + room + ' username:' + username);
                        }
                    });

                    checkChatbotFinished(room, function (results) {
                        if (results.length > 0 && !room.startsWith("debug")) {
                            io.sockets.in(socket.room).emit('lockTextArea', results);
                            chatroom_locked = true;
                        }
                    });
                } else if (type == "essay") {
                    console.log('Username of ' + username + ' attended to write an essay in this room:' + room + '. The mode is ' + type);
                    checkEssayAlreadyWritten(room, function (results) {
                        if (results.length == null || results.length == 0) {
                            io.sockets.in(socket.room).emit('essayTypeMode', room);
                        } else if (results.length > 0) {
                            io.sockets.in(socket.room).emit('essayFinished', room);
                            chatroom_locked = true;
                        }
                    });
                }


            }
            else {
                console.log('Username of ' + username + ' is added to room:' + room);
            }
        }
        if (agent_name == "PRIVACY")
        {
            if (username != "Rebo4AI") {
                if (room in numUsers) {
                    console.log("numUsers[room] is increased by 1");
                    numUsers[room] = numUsers[room] + 1;
                }
                else {
                    console.log("numUsers[room] is set to 1");

                    numUsers[room] = 1;
                }
                console.log("numUsers[room]: " + numUsers[room]);

                connection.query('update nodechat.room set modified=now(), num_users=num_users+1 where room.name=\'' + room + '\';', function (err, results) {
                    //console.log(results.affectedRows + " record(s) updated");
                    if (err)
                        console.log(err);
                });
                if (type == "chatbot") {
                    io.sockets.in(socket.room).emit('chatbotTypeMode');

                    console.log('Username of ' + username + ' is added to room:' + room + '. The mode is ' + type);
                    var count = 0;
                    console.log('checkFirstJoin(room)-------------- ' + room);
                    console.log('checkFirstJoin(socket.room)-------------- ' + socket.room);
                    checkFirstJoin(room, function (result) {
                        count = result.length;

                        /* const fs = require('fs');
                        fs.writeFile('rebologforcount.log', count, (err) => {
                            if (err) throw err;
                        }); */

                        /* Behzad
                        * For debugging my agent, which is in my local computer, I need to connect my agent to a chatroom in server.
                        * Since the agent on the server will be executed automatically whenever a user join the room, I have to add this condition !room.startsWith("debug")
                        * in order to prevent the server agent from joining the room. 
                        * In other words, if a chatroom's name starts with "debug", the agent located on the server will not execute. Thus, I can connect to the room with my local agent. 
                        */
                        if (count < 2 && !room.startsWith("debug")) {
                            /* Behzad
                            *    You need to change this address whenever you want to run your agent 
                            */
                            var script = 'sh ../PrivacyAgent/launch_agent.sh ';
                            var command = script.concat(room);
                            exec(command, (error, stdout, stderr) => {
                                if (error) {
                                    console.error(`exec error: ${error}`);
                                    /* console.log('384'); */
                                    return;
                                }
                                /* console.log('387'); */
                                console.log(`stdout: ${stdout}`);
                                console.log(`stderr: ${stderr}`);
                            });
                            console.log("A new instance of our agent will be started. Room:" + room + ' username:' + username);
                        }
                        else {
                            console.log("Entering debugging mode OR more than one entity in a room. Room:" + room + ' username:' + username);
                        }
                    });

                    checkChatbotFinished(room, function (results) {
                        if (results.length > 0 && !room.startsWith("debug")) {
                            io.sockets.in(socket.room).emit('lockTextArea', results);
                            chatroom_locked = true;
                        }
                    });
                } 
            }
            else {
                console.log('Username of ' + username + ' is added to room:' + room);
            }
        }
        io.sockets.in(socket.room).emit('updateusers', usernames[socket.room], user_perspectives[socket.room], "update");
    });
    function pause(x, data) {
        // Oder Schalfen Sleep
        // it is not working
        socket.emit('show_this_in_console', "CLIENT: before PAUSE");
        setTimeout(function(){
            io.sockets.in(socket.room).emit('updatechat', socket.username, data);
                }, 2000);
        socket.emit('show_this_in_console', "CLIENT: after PAUSE");

    }
    socket.on('sendchat', function (data) {
        console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
        console.log(socket.username);
        console.log(socket.Id);
        console.log(socket.room);
        console.log(socket.id);
        console.log(socket.root_page);
        // console.log(data);
        console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');

        logMessage(socket, data, "text", '');
        // console.log('$$$$$$$$$$$$$$$$$BEFORE SLEEP$$$$$$$$$$$$$$$$$$$$$$');
        // pause(5000, data)
        io.sockets.in(socket.room).emit('updatechat', socket.username, data);
        // console.log('$$$$$$$$$$$$$$$$$After SLEEP$$$$$$$$$$$$$$$$$$$$$$');

    });

    socket.on('show_this_in_console', function (data) {
        console.log(data);

    });

    socket.on('change_room_status', function (flag, room_name) {
        console.log('SERVER: Calling change_room_status function');

        connection.query('update nodechat.room set available_for_chatroom = ' + flag + ' where room.name=\'' + room_name + '\';', function (err, results) {
            if (err)
                console.log(err);
        });
    });

    socket.on('find_a_proper_room', function (sender, prefix_room, suffix_room, manner_or_roomtype, callback) {
        find_a_proper_room(sender, prefix_room, suffix_room, manner_or_roomtype, function (results) {
            callback(results);
        });
    });


    socket.on('find_a_proper_chatroom', function (room_name, available_for_chatroom, callback) {
        console.log('SERVER: Calling find_a_proper_chatroom function');

        find_a_proper_chatroom(room_name, available_for_chatroom, function (results) {
            var the_name = ''
            if (results.length > 0) {
                console.log('SERVER: Send the name of room to client: ' + results[0].name);

                the_name = results[0].name;
                //io.sockets.emit('give_me_a_proper_room', results[0].name);
                //io.sockets.in(id_for_socket).emit('give_me_a_proper_room', results[0].name);
            }
            else {
                console.log('SERVER: Send the name of room to client: NONE');
                //io.sockets.emit('give_me_a_proper_room', 'NONE');
                //io.sockets.in(id_for_socket).emit('give_me_a_proper_room', 'NONE');
                the_name = 'NONE';

            }
            //console.log('SERVER: After IF-ELSE');
            callback('error', the_name);

        });
    });

    socket.on('essaySend', function (data) {
        // 	Behzad: I change this ->logEssay(socket, data, "text"); 
        // to this ->logEssay(socket, data, "essay");
        // because the type of a message and an essay should be different.
        // And also we need to descriminate them in the database.

        // BEhzad write the essay in the database
        logEssay(socket, data, "essay");

    });

    socket.on('sendpm', function (data, to_user) {
        logMessage(socket, data, "private", '');
        if (socket.room in user_sockets && to_user in user_sockets[socket.room])
            user_sockets[socket.room][to_user].emit('update_private_chat', socket.username, data);
    });

    socket.on('sendhtml', function (data) {
        logMessage(socket, data, "html", '');
        io.sockets.in(socket.room).emit('updatehtml', socket.username, data);
    });

    socket.on('ready', function (data) {
        logMessage(socket, data, "ready", '');
        io.sockets.in(socket.room).emit('updateready', socket.username, data);
    });

    socket.on('global_ready', function (data) {
        logMessage(socket, "global " + data, "ready", '');
        io.sockets.in(socket.room).emit('update_global_ready', data);
    });

    socket.on('switchRoom', function (newroom) {
        if (socket.room in usernames && socket.username in usernames[socket.room])
            delete usernames[socket.room][socket.username];
        io.sockets.in(socket.room).emit('updateusers', usernames[socket.room]);
        //  console.log('778 ---------------');

        io.sockets.in(socket.room).emit('updatepresence', username, 'leave');

        logMessage(socket, "leave", "presence", '');
        socket.leave(socket.room);
        // join new room, received as function parameter
        socket.join(newroom);
        // sent message to OLD room
        // update socket session room title
        socket.room = newroom;

        usernames[socket.room][socket.username] = username;
        io.sockets.in(socket.room).emit('updateusers', usernames[socket.room]);
        //console.log('790 ---------------');

        io.sockets.in(socket.room).emit('updatepresence', username, 'join');

        socket.emit('updaterooms', [room,], newroom);
        logMessage(socket, "join", "presence", '');
    });


    // when the user disconnects... perform this
    socket.on('disconnect', function () {
        // update the num_users in the room table: num_users--
        if (socket.username != "Rebo4AI" && socket.room in numUsers) {
            //console.log(' num_users=num_users-1 ' + socket.room);
            connection.query('update nodechat.room set modified=now(), num_users=num_users-1, available_for_chatroom=0 where room.name=' + connection.escape(socket.room) + ';', function (err, rows, fields) {
                if (err)
                    console.log(err);
            });
        }


        if (socket.username != "Rebo4AI" && socket.room in numUsers) {
            numUsers[socket.room] = numUsers[socket.room] - 1;
        }

        if (socket.room in usernames && socket.username in usernames[socket.room]) {
            // remove the username from global usernames list
            var id = usernames[socket.room][socket.username];
            var perspective = user_perspectives[socket.room][socket.username];
            delete usernames[socket.room][socket.username];
            if (usernames[socket.room]) {
                // update list of users in chat, client-side
                io.sockets.in(socket.room).emit('updateusers', usernames[socket.room], user_perspectives[socket.room], "update");
                // echo globally that this client has left
                console.log('username : ' + socket.username + ' has disconnected from ' + socket.room);
                io.sockets.in(socket.room).emit('updatepresence', socket.username, 'leave', id, perspective);
                logMessage(socket, "leave", "presence", '');
                //if (socket.room.substring(0, 15) === 'IDSAI_CHATROOM_'){
                if (socket.type === 'chatroom') {
                    chatroom_end_of_conversation_button(socket);
                }

            }
        }

        if (socket.room in user_sockets && socket.username in user_sockets[socket.room]) {
            delete user_sockets[socket.room][socket.username];
        }

        /* Behzad
        Joining and leaving
            You can call join to subscribe the socket to a given channel:

            io.on('connection', function(socket){
            socket.join('some room');
            }); 
            And then simply use to or in (they are the same) when broadcasting or emitting:

            io.to('some room').emit('some event');
            To leave a channel you call leave in the same fashion as join. Both methods are asynchronous and accept a callback argument.
        */

        if (socket.room)
            socket.leave(socket.room);
        //window.location.replace("http://www.w3schools.com");

        // console.log("window.location.href = host_url + '/bazaar/random-landing-page';");
        // document.location.href = host_url + '/bazaar/random-landing-page';
    });

    socket.on('checking_validity_of_user', function (sender, prefix_room, suffix_room, password, group_study, callback) {
        checking_validity_of_user(sender, prefix_room, suffix_room, password, group_study, function (results) {
            callback(results);
        });
    });
});
