var mysql = require('./mysql');
var ebaylogger = require('./ebaylogger');
var ejs = require('ejs');
var sha256 =  require('crypto-js/sha256');

var invalid_login = false;
var invalid_first_name = false;
var invalid_last_name = false;
var invalid_email = false;
var invalid_city = false;
var invalid_state = false;
var invalid_zip = false;
var invalid_phone = false;
var email_already_used = false;

exports.login = function(req, res) {
    res.render('login', {
        title : 'Sign in or Register | eBay',
        invalid_login: invalid_login,
        invalid_first_name: invalid_first_name,
        invalid_last_name: invalid_last_name,
        invalid_email: invalid_email,
        invalid_city:invalid_city,
        invalid_state:invalid_state,
        invalid_zip : invalid_zip,
        invalid_phone : invalid_phone,
        email_already_used : email_already_used
    });
};

function getCategory(callback) {
    var show = "select * from category";
    console.log("Query is: " + show);
    mysql.fetchData(function(err, result) {
        if (err)
            throw err;
        else {
            callback(result);
        }
    }, show);
}

exports.validateUser = function(req, res) {

    var getUser = "select * from user, seller, buyer where (user_email, user_password) = ('"+ req.param("username") + "', '" + sha256(req.param("password")) + "') and user.user_id = seller.user_id and user.user_id = buyer.user_id";
    console.log("Query is: " + getUser);
    ebaylogger.clicklogger.log('info', req.param("username") + ' trying to login');

    mysql.fetchData(function(err, result) {
        if (err){
            throw err;
            ebaylogger.clicklogger.log('info', req.param("username") + ' failed to login');
            invalid_login = true;
        }
        else {
            console.log("result = "+ JSON.stringify(result));
            if (result.length > 0) {
                 req.session.user = result[0];

                ebaylogger.clicklogger.log('info', req.param("username") + ' logged in');
                console.log("valid login!!");
                invalid_login = false;

                var time = new Date();    //update login time
                console.log("login time is: "+time);
                var logintime = "update user set user_loginTime = '"+time+"' where user_email = '"+req.param("username")+"'";
                mysql.updateData(function(err, result) {
                    if (err) {
                        invalid_login = true;
                        throw err;
                    }
                }, logintime);

                res.redirect('/homepage');

            }else {
                invalid_login = true;
                console.log("invalid login");
                res.redirect('/login');
            }
        }
    }, getUser);
};

exports.register = function(req, res){
    var firstname = req.param("firstname");
    var lastname = req.param("lastname");
    var email = req.param("email");
    var password = req.param("password");
    var address = req.param("address");
    var city = req.param("city");
    var state = req.param("state");
    var zip = req.param("zip");
    var phone = req.param("phone");
    var dob = req.param("dob");
    var balance = 1000;
    var handle = email.split("@")[0]; //set handle from email
    console.log("handle is:", handle);
    var sha256_password = sha256(password);

    console.log('Registering new user ' + email);
    ebaylogger.clicklogger.log('info', 'New user ' + email + ' trying to register');

    //Can do some basic checks for ZIP, PHONE, DOB etc.

    var regZip = new RegExp("^\\d{5}(-\\d{4})?$");
    var regPhone = new RegExp("^\\d{10}");
    var regName = new RegExp("[a-zA-Z]+(?:(?:\. |[' ])[a-zA-Z]+)*");

    if (!regName.test(firstname)) {
        console.log("Invalid Firstname");
        invalid_first_name = true;
    }

    if (!regName.test(lastname)) {
        console.log("Invalid last_name");
        invalid_last_name = true;
    }

    if (!regZip.test(zip)) {
        console.log("Invalid zip");
        invalid_zip = true;
    }

    if (!regPhone.test(phone)) {
        console.log("Invalid Phone");
        invalid_phone = true;
    }

    if (!regName.test(city)) {
        console.log("Invalid city");
        invalid_city = true;
    }

    if (!regName.test(state)) {
        console.log("Invalid state");
        invalid_state = true;
    }

// If any of the input validation fails, stop and redirect to login
    if (invalid_first_name || invalid_last_name || invalid_zip || invalid_email || invalid_phone
        || invalid_city || invalid_state) {
        console.log("invalid registration fields! Redirect!");
        ebaylogger.clicklogger.log('info', 'New user ' +firstname + ' entered invalid details while registering');
        res.redirect('/login');
    } else {

        console.log("valid fields");

        //Insert into user DB
        var userInfo = 'insert into user SET ?';
        var value = {
            user_firstName: firstname,
            user_lastName: lastname,
            user_email: email,
            user_password: sha256_password,
            user_address: address,
            user_city: city,
            user_state: state,
            user_zip: zip,
            user_phone: phone,
            user_dob: dob,
            user_handle: handle,
            user_balance: balance,
            user_spent: 0,
            user_earned: 0
        };
        console.log("Query is: " + userInfo + value);


        var connection = mysql.getConnection();
        connection.query(userInfo, value, function (err, result) {

            if (err) {
                email_already_used = true;
                console.log("failed to insert user into table");
                ebaylogger.clicklogger.log('info', 'Registration failed: New user ' + email + ' is already registered');
                res.redirect('/login');
                connection.end();

            }
            else {

                var userIDquery = "select user_id from user where user_email = '" + email + "'";
                console.log("User ID query is: ", userIDquery);
                connection.query(userIDquery, function (err, row) {
                    if (err)
                        throw err;
                    console.log("Query for user_id returned", row);
                    var insertSellerQuery = 'insert into seller SET ?';
                    var setUserID = {user_id: row[0].user_id};
                    connection.query(insertSellerQuery, setUserID, function (err, result) {
                        if (err)
                            throw err;

                        var insertBuyerQuery = 'insert into buyer SET ?';
                        connection.query(insertBuyerQuery, setUserID, function (err, result) {
                            if (err)
                                throw err;
                            res.redirect('/login');
                            console.log('inserted succesfully');
                            connection.end();

                        });
                    });


                });
            }
            });
    }
};


exports.redirectToHomepage = function(req, res) {
    var categoryName = "SELECT * FROM category";
    var productName = "SELECT * FROM product";

    console.log("Redirecting to homepage");

    if (req.session.user) {
        ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is being redirected to homepage');
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        mysql.fetchData(function(err,categories){
            if (err)
                throw err;
            else{
                mysql.fetchData(function(err,products){
                    if (err)
                        throw err;
                    else{
                        res.render('homepage', {
                            title: 'HOMEPAGE',
                            user: req.session.user,
                            categories: categories,
                            products: products
                        });
                    }},productName);
            };
        },categoryName);
    } else {
        res.redirect('/login');
    }


};

exports.logout = function(req, res){
    ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is being logged out');
    req.session.user= null;
    req.session.product = null;
    req.session.destroy();
    res.redirect('/login');
};
