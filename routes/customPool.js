/**
 * New node file
 */
var mysql = require('mysql');
var connectionArray = new Array(10);

exports.initializeConnectionPool = function() {
    for (var count = 0; count < 10; count++) {
        var connection = mysql.createConnection({
            host : 'localhost',
            user : 'root',
            password : 'sandeep',
            database : 'my_db',
            port : 3306,
        });
        connectionArray.push(connection);
    }
};

function isConnectionAvailable() {
    if (connectionArray.length > 0) {
        return true;
    }
    return false;
}

exports.getConnection = function() {
    if (isConnectionAvailable()) {
        var con = connectionArray.pop();
        return con;
    }
};

exports.releaseConnection = function(connection) {
    connectionArray.push(connection);
};

