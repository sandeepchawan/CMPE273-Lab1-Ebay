var mysql = require('mysql');

//Put your mysql configuration settings - user, password, database and port
function getConnection(){
    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : 'sandeep',
        database : 'mydb',
        port	 : 3306
    });
    return connection;
}


function fetchData(callback,sqlQuery){

    console.log("\nSQL Query::"+sqlQuery);

    var connection=getConnection();

    connection.query(sqlQuery, function(err, rows, fields) {
        if(err){
            console.log("ERROR during fetch: " + err.message);
        }
        else
        {	// return err or result
            console.log("DB Results:"+rows);
            callback(err, rows);
        }
    });
    console.log("\nConnection closed..");
    connection.end();
}

//var sqlQuery = "insert into Person (person_first_name, person_last_name, person_zip, person_address, person_state, person_city, person_email, person_pass) values " +
//			   "('q', 'q', '95112', '53S 9th', 'CA', 'San Jose', 'q@gmail.com', 'q')";
//insertData(sqlQuery);
function insertData(callback, sqlQuery){
    console.log("\nSQL Query::" + sqlQuery);

    var connection=getConnection();
    connection.query(sqlQuery, function(err, result){
        if(err) {
            console.log("There is an error in inserting");
        }
        else{
            callback(err, result);
            console.log("Inserted successfully");
            connection.release();
        }
    });
}

//var sqlQuery = "delete from Person where Person_id = 1";
//deleteData(sqlQuery);
function deleteData(callback, sqlQuery){
    console.log("\nSQL Query::" + sqlQuery);
    var connection=getConnection();
        connection.query(sqlQuery, function(err, result){
            if(err)
                console.log("There is an error in deleting");
            else{
                callback(err, result);
                console.log("deleting successfully");
                connection.end();
            }
        });
}

//var sqlQuery = "update category set cName = 'cinema' where categoryID = 2";
//updateData(sqlQuery);
function updateData(callback, sqlQuery){
    console.log("\nSQL Query::" + sqlQuery);
    var connection=getConnection();
        connection.query(sqlQuery, function(err, result){
            if(err)
                console.log("There is an error in updating");
            else{
                callback(err, result);
                console.log("updating successfully");
                connection.end();
            }
        });
}

exports.getConnection=getConnection;
exports.fetchData=fetchData;
exports.insertData=insertData;
exports.deleteData=deleteData;
exports.updateData=updateData;
