var mysql = require('./mysql');
var ebaylogger = require('./ebaylogger');

function exec(sqlquery, callback){
    var connection =  mysql.getConnection();
        connection.query(sqlquery, function(err,results){
            if(err){
                console.log("failed to run sql query = " + sqlquery);
                return;
            }
            callback(results);
            connection.end();
        });
}

function getProduct(user_id, callback){
    var query = "select * from product p, cart c where p.product_id = c.item_product_id and c.item_user_id = "+ user_id;
    console.log(query);
    exec(query, function(results){
        callback(results);
    });
}

//Get CART details
exports.cart = function(req,res){

    var user_id = req.session.user.user_id;
    ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is checking the items in his cart');

    console.log("user_id = "+user_id);
    getProduct(user_id, function(results){
        console.log(JSON.stringify(results));
        var total = 0;
        for(var i = 0; i < results.length; i++){
            total += results[i].product_price;
        }

        console.log(JSON.stringify(results));
        res.render('cart', {
            title : 'Shopping Cart',
            items : results,
            total:  total,
            user: req.session.user,
            seller: req.session.seller
        });
    });

};

exports.addToCart = function(req, res) {
    var user_id = req.session.user.user_id;

    var product_id = req.body.product_id;
    var seller_id = req.body.seller_id;
    ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is adding product' + product_id + 'to his cart');

    var seller_name = "GOD";
    var getSellerName = "select user.user_firstName, user.user_lastName from user, seller where" +
        " user.user_id = seller.user_id and seller.seller_id = "+seller_id+"";
    exec(getSellerName, function (results){
        console.log("User first and last name result: ",JSON.stringify(results));
        seller_name = results[0].user_firstName + " " + results[0].user_lastName;
    });

    console.log("Seller name for product" + product_id + " is", seller_name);
    var sqlquery = 'insert into cart SET ?';
    var value = {item_product_id:product_id, item_user_id:user_id, item_seller_id:seller_id, item_seller_name: seller_name};
    console.log("Query is: " + sqlquery);

    var connection =  mysql.getConnection();

    connection.query(sqlquery, value, function(err, result){
            if(err){
                console.log("Query failed:", sqlquery);
                throw err;
            }
            else{
                res.redirect('/cart');
                connection.end();
            }
        });

};

exports.payment = function(req, res){
    ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is ready to make a payment');
    res.render("payment",{
        title:"Pay",
        user: req.session.user
    });
};

function removeUserFromCart(user_id, callback){
    console.log("Emypting cart");
    var removeuser = "delete from cart where item_user_id = " + user_id;
    exec(removeuser , function(result){
        callback(result);
    });
}

function decrementProductQuantity(user_id, callback){
    console.log("Decrementing product quantity");
    var sqlquery = "update product set product_stock = product_stock - 1 where product_id in (select item_product_id from cart where item_user_id = "+user_id+")";

    exec(sqlquery, function(result){
        callback(result);
    });
}

exports.checkout = function(req, res){
    ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is trying to do a cart checkout');

    var cardnumber, expirydate, cvv;
    var isCardValid = false;
    cardnumber = req.param("cardnumber");
    expirydate = req.param("expirydate");
    cvv = req.param("cvv");

    var json_responses;

    //Do credit card validation //set isCardValid:

    var regCardNumber = new RegExp("^\\d{16}$");
    var regExpiry = new RegExp("^\\d{4}$");
    var regCvv = new RegExp("^\\d{3}$");

    if (regCardNumber.test(cardnumber) && regExpiry.test(expirydate) && regCvv.test(cvv)) {
        isCardValid = true;
    }

    console.log("card details:", cardnumber, expirydate, cvv);
    console.log("Card is valid? : " , isCardValid);

    if(isCardValid)
    {
        var user_id = req.session.user.user_id;

         addTransaction(user_id,function(result){
         decrementProductQuantity(user_id,function(result){
         removeUserFromCart(user_id,function(result){
             json_responses = {"statusCode" : 200};
             res.send(json_responses);
         });
         });
         });
            console.log("Valid card");

    }
    else
    {
        json_responses = {"statusCode" : 401};
        res.send(json_responses);
    }

};

exports.thankyou = function (req, res) {
    res.render('thankYou', {
        title : 'ThankYou',
        user: req.session.user
    });
};

//Remove item from cart
exports.remove = function (req, res) {

    var product_id = req.params.pid;
    var user_id = req.session.user.user_id;
    ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is removing product ' + product_id + ' from his cart');

    console.log("removing product from cart: ", product_id);
    var sql = "delete from cart where item_product_id = "+product_id+" and item_user_id = "+req.session.user.user_id+" LIMIT 1";
    console.log("Query is:" , sql);
    exec(sql, function(results){
        console.log(results);
    });

     res.redirect('/cart');
};

function addTransaction(user_id, callback){

    console.log("Adding transaction to history");
    var sql= "INSERT INTO transactions (transaction_product_id, transaction_shopper_id, transaction_seller_id, transaction_time, " +
        "transaction_type, transaction_price) SELECT cart.item_product_id, buyer.buyer_id, cart.item_seller_id, now(), 0, product.product_price"
        + " FROM buyer, cart, product where cart.item_product_id = product.product_id AND cart.item_user_id = buyer.user_id AND cart.item_user_id="+user_id;


    console.log("Insert into transaction query is: ", sql);
     var connection =  mysql.getConnection();
     connection.query(sql, function(err,result){
        if(err) {
            throw err;
        }
         var getProductquery = "select product.product_price, cart.item_seller_id from product, cart where cart.item_product_id = product.product_id and " +
             "cart.item_user_id="+user_id+"";
        connection.query(getProductquery, function(err,result1){
            if (err){
                throw err;
            }


            var totalMoneyTransaced = 0;
            for (i=0; i<result1.length; i++) {
                totalMoneyTransaced += result1[i].product_price;
                console.log("Total money involved in transaction: ", totalMoneyTransaced);
            }

            var deductbal = "update user set user_spent = user_spent + "+totalMoneyTransaced+" where user_id = "+user_id+"";
            console.log("Product Price is: $", result1[0].product_price);
            connection.query(deductbal, function(err, result2){
            if (err) {
                throw err;
            }


             var increasebal = "update user user1 JOIN seller seller1 on user1.user_id = seller1.user_id set user_earned = user_earned + "+totalMoneyTransaced+" where seller1.seller_id = "+result1[0].item_seller_id+"";
             connection.query(increasebal, function(err, result3){
               if (err) {
                   throw err;
               }
                callback(result);
                connection.end();
            })
        })
        })

     });

}

function incrementProductQuantity(user_id, product_id, callback){

    var sqlquery = "update product set product_stock = product_stock + 1 where product_id in (select item_product_id from cart where item_user_id = "+user_id+"" +
        " and item_product_id = "+product_id+"  )";

    exec(sqlquery, function(result){
        callback(result);
    });
}