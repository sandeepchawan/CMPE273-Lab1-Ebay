var mysql = require('./mysql');
var ebaylogger = require('./ebaylogger');

exports.listproducts = function(req,res){

    console.log("in list products");
    var cid = req.params.cid;
    ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is listing products in category '+ cid );
    var sqlquery = "select * from product where product_category_id = "+cid;
    console.log("Query is: " + sqlquery);
    mysql.fetchData(function(err, result){
        if(err) {
            console.log("Query failed:", sqlquery);
            throw err;
        }
        else{
            console.log(result);
            res.send(result);
        }
    }, sqlquery);
};

exports.showProduct = function(req, res) {
    if (!req.session.user) {
        res.redirect('/login');
    }
    var product_id = req.params.pid;
    console.log("product_id= ", product_id);
    ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is viewing product '+ product_id) ;
    var getinfo = "SELECT * FROM product, category, seller, user WHERE product.product_category_id = category.category_id AND " +
        "product.product_seller_id = seller.seller_id AND" +
        " product.product_stock >=0 AND user.user_id = seller.user_id AND product_id = "+ product_id;
    var getbid = "SELECT * FROM bidding WHERE bid_price = (SELECT MAX(bid_price) FROM bidding WHERE bid_product_id = "+product_id + ") AND bid_product_id = "+product_id;

    var categories = "SELECT category_name FROM category";
    mysql.fetchData(function(err,result){
        if(err)
            throw err;
        else {
            mysql.fetchData(function(err,bidresult){
                if(err)
                    throw err;
                else {
                    mysql.fetchData(function(err,catresult){
                        if(err)
                            throw err;
                        else {
                            req.session.product= result[0];
                            console.log("bid results are: ", bidresult);
                            res.render('productInfo',{
                                title: result[0].product_name,
                                user: req.session.user,
                                result: result,
                                bresult: bidresult,
                                categories: catresult
                            });
                        }

                    }, categories);
                }
            },getbid);

        }
    },getinfo);
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

exports.sell = function(req, res) {

    var getUser = "SELECT * FROM user, seller WHERE user.user_id = seller.user_id AND user.user_id = "+ req.session.user.user_id;
    ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is trying to sell a product') ;

    console.log("Query is: " + getUser);
    mysql.fetchData(function(err, result) {
		if (err){
		    console.log("Query failed: ", getUser);
			throw err;
		}
		else {
        getCategory(function(result) {
            res.render('sellProduct', {
                title : 'Sell Product',
                show : result,
                user: req.session.user,
                seller: req.session.seller
            });
        }); }
    }, getUser);
};

exports.directSell = function(req,res) {
    if(!req.session.user){
        res.redirect('/login');
    }
    else {
        ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is trying to sell a product directly') ;
        console.log("DIRECT SELL !!!!");
        var name = req.body.productName;
        var quantity = req.body.productQty;
        var desc = req.body.productDesc;
        var category = req.body.productCategory;
        var condition = req.body.productCondition;
        var type = 0;
        var price= req.body.productPrice;
        //var seller = req.session.user.seller_id; //SAND RECHECK
        console.log("User_id is", req.session.user.user_id);

        var seller_id = req.session.user.seller_id;
        console.log("Seller_id is", seller_id);

            //Check if all fields are entered
        var sell = "INSERT INTO product SET ?";
        var value = {product_name: name, product_category_id:category, product_price: price, product_condition: condition, product_type: type,
            product_seller_id:seller_id, product_desc:desc, product_stock: quantity};

        var connection= mysql.getConnection();

        connection.query(sell, value, function(err, result){
                if(err) {
                    console.log("Query failed: ", sell, JSON.stringify(value));
                    throw err;
                }
                else{
                    console.log("Ad posted succesfully");
                    res.redirect('/homepage');
                    connection.end();
                }
        });

    }
};

exports.auctionSell = function(req, res) {
    if(!req.session.user){
        res.redirect('/login');
    }
    else {
        ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is trying to sell a product via auction') ;
        var name = req.body.productName;
        var quantity = 1;
        var desc = req.body.productDesc;
        var category = req.body.productCategory;
        var condition = req.body.productCondition;
        var type = 1; //Auction sell, type == 0 for Direct sell
        var end = new Date();
        var endtime = new Date(end.valueOf() + 4*24*60*60*1000); //4 day end for bidding
        var starttime = new Date();
        console.log("bid start time is", starttime);
        var startprice = req.body.productStartPrice;
        console.log("Session", JSON.stringify(req.session));
        console.log("Seller is",JSON.stringify(req.session.user.seller_id));
        var seller_id = req.session.user.seller_id; //SAND RECHECK

        var sell = "INSERT INTO product SET ?";
        var value = {product_name: name, product_category_id:category, product_condition: condition, product_type: type, product_price: startprice,
            product_seller_id:seller_id, product_desc:desc, product_stock: quantity, product_bid_start_price:startprice, product_bid_end_time:
            endtime, Product_bid_start_time: starttime, product_bid_end: 0};

        var connection= mysql.getConnection();

            connection.query(sell, value, function(err, result){
                if(err) {
                    console.log("Query failed: ", sell, value);
                    throw err;
                }
                else{
                    res.redirect('/homepage');
                    connection.end();
                }
            });
    }
};

//Search Product
exports.search = function(req, res){
    var text = req.param("productName");
    var cat = req.body.cat;
    var categoryQuery = "SELECT * FROM category";

    console.log(text);
    console.log(cat);
    ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is searching for a product in category' + cat) ;
    if(cat > 0 && cat < 11) {
        if (text.length > 0) {
            var getinfo = "select * from product p, category c " +
                "WHERE p.product_category_id= c.category_id  and UPPER(p.product_name)=UPPER('" + text + "') " +
                "and c.category_id = " + cat;
        } else {
            var getinfo = "select * from product p, category c " +
                "WHERE p.product_category_id = c.category_id " +
                "and c.category_id = "+cat+"";
        }

        console.log("getinfo query::"+getinfo);

        mysql.fetchData(function(err,result){
            if(err) {
                throw err;
            }
            else {
                if(result.length == 0) {
                    res.render('failSearch',{
                        title: 'fail search'
                    });
                }else {
                mysql.fetchData(function (err, categories) {
                    if (err)
                        throw err;
                    else {
                        console.log(result[0].product_name);
                        res.render('homepage',{
                            title: result[0].product_name,
                            user: req.session.user,
                            seller: req.session.seller,
                            categories: categories,
                            products: result
                        });
                    }}, categoryQuery);
                }

            }
        },getinfo);
    }else {
        res.render('failSearch',{
            title: 'Search Failed'
        });
    }

};


exports.bid = function(req,res){
    if(!req.session.user){
        res.redirect('/login');
    }
    ebaylogger.bidlogger.log('info', 'User ' + req.session.user.user_firstName + ' is bidding for product ' + req.session.product.product_id) ;
    if(req.body.quantity == 0 ){
        res.send('Sold OUT');
    }
    else {
        var bid = "INSERT INTO bidding SET ? ";
        var time =  new Date().toISOString().slice(0, 19).replace('T', ' ');
        var value = {bid_product_id:req.session.product.product_id, bid_buyer_id:req.session.user.buyer_id, bid_price: req.body.myprice, bid_time: time};
        var connection = mysql.getConnection();
            connection.query(bid, value, function(err, result){
                if(err) {
                    console.log("Query failed", bid, value, err);
                    res.redirect('/login');
                }
                else{
                    ebaylogger.bidlogger.log('info', 'User ' + req.session.user.user_firstName + ' is bidding for product ' + req.session.product.product_id
                    + ' and pitching in $ ' +  req.body.myprice);
                    req.session.product= null;
                    res.redirect('/homepage');
                    connection.end();
                }
            });
    }
};