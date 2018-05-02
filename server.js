const logger = require('./lib/logger');
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const mysqlHost = process.env.MYSQL_HOST;
const mysqlPassword = process.env.MYSQL_PASSWORD;
const mysqlUser = process.env.MYSQL_USER;
const mysqlDB = process.env.MYSQL_DB;
const mysqlPort = process.env.MYSQL_PORT || '3306';

console.log("== MYSQL_HOST:", mysqlHost);

const maxMySQLConnections = 10;
const mysqlPool = mysql.createPool({
  host: mysqlHost,
  port: mysqlPort,
  database: mysqlDB,
  user: mysqlUser,
  password: mysqlPassword,
  connectionLimit: maxMySQLConnections
});

const app = express();
const port = process.env.PORT || 8000;

let lodgings = require('./lodgings');

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(logger);

function getLodgingsCount(callback) {
  mysqlPool.query(
    'SELECT COUNT(*) AS count FROM lodgings',
    function (err, results) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, results[0].count);
      }
    }
  );
}

function getLodgingsPage(offset, count, callback) {
  mysqlPool.query(
    'SELECT * FROM lodgings ORDER BY id LIMIT ?,?',
    [ offset, count ],
    function (err, results) {
      callback(err, results);
    }
  );
}

app.get('/lodgings', function (req, res) {

  getLodgingsCount(function (err, count) {
    if (err) {
      res.status(500).json({
        error: "Error fetching lodgings list."
      });
    } else {
      let page = parseInt(req.query.page) || 1;
      const numPerPage = 10;
      const lastPage = Math.ceil(count / numPerPage);
      page = page < 1 ? 1 : page;
      page = page > lastPage ? lastPage : page;
      const start = (page - 1) * numPerPage;

      getLodgingsPage(start, numPerPage, function (err, lodgingsPage) {
        if (err) {
          res.status(500).json({
            error: "Error fetching lodgings list."
          });
        } else {
          let links = {};
          if (page < lastPage) {
            links.nextPage = '/lodgings?page=' + (page + 1);
            links.lastPage = '/lodgings?page=' + lastPage;
          }
          if (page > 1) {
            links.prevPage = '/lodgings?page=' + (page - 1);
            links.firstPage = '/lodgings?page=1';
          }

          res.status(200).json({
            lodgings: lodgingsPage,
            pageNumber: page,
            totalPages: lastPage,
            pageSize: numPerPage,
            totalCount: count,
            links: links
          });
        }
      });
    }
  });

});

function insertNewLodging(lodging, callback) {
  const lodgingValues = {
    id: null,
    name: lodging.name,
    description: lodging.description,
    street: lodging.street,
    city: lodging.city,
    state: lodging.state,
    zip: lodging.zip,
    price: lodging.price,
    ownerid: lodging.ownerID
  };
  mysqlPool.query(
    'INSERT INTO lodgings SET ?',
    lodgingValues,
    function (err, result) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result.insertId);
      }
    }
  );
}

app.post('/lodgings', function (req, res, next) {

  if (req.body && req.body.name && req.body.price && req.body.ownerID) {
    insertNewLodging(req.body, function (err, id) {
      if (err) {
        res.status(500).json({
          error: "Error inserting lodging."
        });
      } else {
        res.status(201).json({
          id: id,
          links: {
            lodging: '/lodgings/' + id
          }
        });
      }
    });
  } else {
    res.status(400).json({
      err: "Request needs a JSON body with a name, a price, and an owner ID"
    });
  }

});

app.get('/lodgings/:lodgingID', function (req, res, next) {
  const lodgingID = parseInt(req.params.lodgingID);
  if (lodgings[lodgingID]) {
    res.status(200).json(lodgings[lodgingID]);
  } else {
    next();
  }
});

app.put('/lodgings/:lodgingID', function (req, res, next) {

  const lodgingID = parseInt(req.params.lodgingID);
  if (lodgings[lodgingID]) {
    if (req.body && req.body.name && req.body.price && req.body.ownerID) {
      lodgings[lodgingID] = {
        name: req.body.name,
        price: req.body.price,
        ownerID: req.body.ownerID,
        description: req.body.description || "No description"
      };
      res.status(200).json({
        links: {
          lodging: '/lodgings/' + lodgingID
        }
      });
    } else {
      res.status(400).json({
        err: "Request needs a JSON body with a name, a price, and an owner ID"
      });
    }
  } else {
    next();
  }

});

app.delete('/lodgings/:lodgingID', function (req, res, next) {
  const lodgingID = parseInt(req.params.lodgingID);
  if (lodgings[lodgingID]) {
    lodgings[lodgingID] = null;
    res.status(204).end();
  } else {
    next();
  }
});

app.get('/users/:userID/lodgings', function (req, res, next) {
  const ownerID = parseInt(req.params.userID);
  const ownerLodgings = lodgings.filter(lodging => lodging.ownerID === ownerID);
  res.status(200).json({
    lodgings: ownerLodgings
  });
});

app.use('*', function (req, res, next) {
  res.status(404).json({
    err: "Path " + req.url + " does not exist"
  });
});

app.listen(port, function() {
  console.log("== Server is running on port", port);
});
