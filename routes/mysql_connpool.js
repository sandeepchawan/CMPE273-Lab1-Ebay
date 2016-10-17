var ejs= require('ejs');
var mysql = require('mysql');
var max_conns = 50;
var p = new PoolManager(max_conns);

function createConnection(){

    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : 'sandeep',
        database : 'my_db',
        port : 3306
    });

    return connection;
}

function PoolManager(num_conns)
{
    this.size=numm_conns;
    this.availablePool = [];
    this.connectionQueue   = [];
    for(var j=0; j < num_conns; ++j) {
        this.availablePool.push(createConnection()); // Create a new connection and push into the available pool
    }
}

PoolManager.prototype.getConnection = function (callback)
{
    if(this.availablePool.length > 0) {
       callback(this.availablePool.pop());
        return;
    } else {
        this.enqueueCallback(callback);
        return;
    }

};

PoolManager.prototype.enqueueCallback = function enqueueCallback(callback) {

    this.connectionQueue.push(callback);

};

Pool.prototype.releaseConnection = function releaseConnection(connection) {

    this.availablePool.push(connection);
    if (this.connectionQueue.length) {
        // get connection with next waiting callback
        this.getConnection(this.connectionQueue.shift());
    }
};

//Check  below funcs, may be error prone.
function fetchData(callback,sqlQuery){

    console.log("\nSQL Query::"+sqlQuery);
    var localConnection = p.get();

    p.getConnection().query(sqlQuery, function(err, rows, fields) {
        if(err){
            console.log("ERROR: " + err.message);
        }
        else
        {	// return err or result
            callback(err, rows);
        }
    });
}

function saveData(callback, sqlQuery) {

    console.log("\nSQL Query::" + sqlQuery);

    p.getConnection().query(sqlQuery, function(err, results) {
        if (err) {
            console.log("ERROR: " + err.message);
        } else { // return err or result
            callback(err, results);
        }
    });
    console.log("\nConnection closed..");

}

function insertData(callBack, data, table) {
    console.log("Inside insert data")
    p.getConnection().query('INSERT INTO ' + table + ' SET ?', data, function(err,rows, fields) {
        if (err) {
            console.log("ERROR: " + err.message);
        } else { // return err or result
            callBack(err, rows);
        }
    });
    console.log("\nConnection closed..");
    //connection.end();
}


exports.fetchData=fetchData;
exports.insertData=insertData;
exports.saveData=saveData;
exports.getConnection=getConnection;
