var mysql = require('./mysql');
var ebaylogger = require('./ebaylogger');

exports.show = function(req, res) {

  if (req.session.user.user_id == req.params.id) {
    ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is checking his account') ;
    res.redirect('/myAccount');
  } else {
    res.redirect('/login');
  }

};

exports.account = function(req, res){
  if (!req.session.user) {
    res.redirect('/login');
  }
  ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is checking his account') ;
  var getUserInfo = "SELECT * FROM user, seller WHERE user.user_id = seller.user_id AND user.user_id = " + req.session.user.user_id;
  var getSoldInfo = "SELECT * FROM transactions, product, seller WHERE seller.seller_id = transactions.transaction_seller_id AND transactions.transaction_product_id = product.product_id AND seller.user_id = " + req.session.user.user_id;
  var getPurchaseInfo = "SELECT * FROM transactions, product, buyer WHERE buyer.buyer_id = transactions.transaction_shopper_id AND transactions.transaction_product_id = product.product_id " +
      "AND buyer.user_id = " + req.session.user.user_id;

   //Update user balance
  var updateBal = "update user set user_balance = user_balance + user_earned - user_spent where user_id = "+req.session.user.user_id+"";

  mysql.fetchData(function(err,updateBal){
  mysql.fetchData(function(err,userinfo){
    req.session.user = userinfo[0];
    if (err)
      throw err;
    else{
      mysql.fetchData(function(err,soldinfo){
        if (err)
          throw err;
        else{
          mysql.fetchData(function(err,purchaseinfo){
            if (err)
              throw err;
            else{
              res.render('myAccount', {
                title: 'My Account',
                user: req.session.user,
                userinfo: userinfo,
                soldinfo: soldinfo,
                purchaseinfo: purchaseinfo
              });
            }},getPurchaseInfo);
        }},getSoldInfo);
    }
  },getUserInfo)
  },updateBal);
};

exports.purchaseHistory = function(req, res){
  if (!req.session.user) {
    res.redirect('/login');
  }
  ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is checking his purchase history') ;
  var getUserInfo = "SELECT * FROM user, buyer WHERE user.user_id = buyer.user_id AND user.user_id = " + req.session.user.user_id;

  var getPurchaseInfo = "SELECT * FROM transactions, product, buyer WHERE buyer.buyer_id = transactions.transaction_shopper_id AND transactions.transaction_product_id = product.product_id AND buyer.user_id = "
                        + req.session.user.user_id;

  mysql.fetchData(function(err,userinfo){
    if (err)
      throw err;
    else{
      mysql.fetchData(function(err,purchaseinfo){
        if (err)
          throw err;
        else{
          res.render('purchaseHistory', {
            title: 'Purchase History',
            user: req.session.user,
            userInfo: userinfo,
            purchaseInfo: purchaseinfo
          });
        }},getPurchaseInfo);
    }
  },getUserInfo);
};

exports.sellHistory = function(req, res){
  if (!req.session.user) {
    res.redirect('/login');
  }
  ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is checking his sell history') ;

  var getUserInfo = "SELECT * FROM user, seller WHERE user.user_id = seller.user_id AND user.user_id = " + req.session.user.user_id;
  var getSoldInfo = "SELECT * FROM transactions, product, seller WHERE seller.seller_id = transactions.transaction_seller_id AND transactions.transaction_product_id = product.product_id " +
      "AND seller.user_id = " + req.session.user.user_id;

  mysql.fetchData(function(err,userinfo){
    if (err){
      console.log("SQL error = " +  getUserInfo);
      throw err;
    }
    else{
      mysql.fetchData(function(err,soldinfo){
        if (err){
          console.log("SQL error = " +  getSoldInfo );
          throw err;
        }
        else{
          res.render('sellHistory', {
            title: 'Sell History',
            user: req.session.user,
            userInfo: userinfo,
            soldInfo: soldinfo
          });
        }},getSoldInfo);
    }
  },getUserInfo);
};


exports.bidHistory = function(req, res) {
  if (!req.session.user) {
    res.redirect('/login');
  }
  ebaylogger.clicklogger.log('info', 'User ' + req.session.user.user_firstName + ' is checking his bid history') ;
  var sqlquery = "SELECT * from bidding b, buyer bu, user u, product p where b.bid_buyer_id=bu.buyer_id and bu.user_id=u.user_id and b.bid_product_id=p.product_id and u.user_id= "
            +req.session.user.user_id;

  mysql.fetchData(function(err, result){
    if (err){
      console.log("SQL error = " +  sqlquery );
      throw err;
    }
    else{
      res.render("bidHistory",{
        result: result,
        user: req.session.user
      });
    }
  },sqlquery);

};