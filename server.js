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

function getLodgingsCount() {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT COUNT(*) AS count FROM lodgings',
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results[0].count);
        }
      }
    );
  });
}

function getLodgingsPage(page, count) {
  return new Promise((resolve, reject) => {
    const numPerPage = 10;
    const lastPage = Math.ceil(count / numPerPage);
    page = page < 1 ? 1 : page;
    page = page > lastPage ? lastPage : page;
    const offset = (page - 1) * numPerPage;
    mysqlPool.query(
      'SELECT * FROM lodgings ORDER BY id LIMIT ?,?',
      [ offset, numPerPage ],
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lodgings: results,
            pageNumber: page,
            totalPages: lastPage,
            pageSize: numPerPage,
            totalCount: count
          });
        }
      }
    );
  });
}

app.get('/lodgings', function (req, res) {

  getLodgingsCount()
    .then((count) => {
      return getLodgingsPage(parseInt(req.query.page) || 1, count);
    })
    .then((lodgingsInfo) => {
      lodgingsInfo.links = {};
      let { links, totalPages, pageNumber } = lodgingsInfo;
      if (pageNumber < totalPages) {
        links.nextPage = '/lodgings?page=' + (pageNumber + 1);
        links.lastPage = '/lodgings?page=' + totalPages;
      }
      if (pageNumber > 1) {
        links.prevPage = '/lodgings?page=' + (pageNumber - 1);
        links.firstPage = '/lodgings?page=1';
      }
      res.status(200).json(lodgingsInfo);
    })
    .catch((err) => {
      res.status(500).json({
        error: "Error fetching lodgings list."
      });
    });
});

function insertNewLodging(lodging) {
  return new Promise((resolve, reject) => {
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
          reject(err);
        } else {
          resolve(result.insertId);
        }
      }
    );
  });
}

app.post('/lodgings', function (req, res, next) {

  if (req.body && req.body.name && req.body.price && req.body.ownerID) {
    insertNewLodging(req.body)
      .then((id) => {
        res.status(201).json({
          id: id,
          links: {
            lodging: '/lodgings/' + id
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: "Error inserting lodging."
        });
      });
  } else {
    res.status(400).json({
      error: "Request needs a JSON body with a name, a price, and an owner ID"
    });
  }

});

function getLodgingByID(lodgingID) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM lodgings WHERE id = ?',
      [ lodgingID ],
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results[0]);
        }
      }
    )
  });
}

app.get('/lodgings/:lodgingID', function (req, res, next) {
  const lodgingID = parseInt(req.params.lodgingID);
  getLodgingByID(lodgingID)
    .then((lodging) => {
      if (lodging) {
        res.status(200).json(lodging);
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Error fetching lodging."
      });
    });
});

function updateLodgingByID(lodgingID, lodging) {
  return new Promise((resolve, reject) => {
    const lodgingValues = {
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
      'UPDATE lodgings SET ? WHERE id = ?',
      [ lodgingValues, lodgingID ],
      function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result.affectedRows > 0);
        }
      }
    );
  });
}

app.put('/lodgings/:lodgingID', function (req, res, next) {

  const lodgingID = parseInt(req.params.lodgingID);
  if (req.body && req.body.name && req.body.price && req.body.ownerID) {
    updateLodgingByID(lodgingID, req.body)
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              lodging: `/lodgings/${lodgingID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: "Unable to update lodging."
        });
      });
  } else {
    res.status(400).json({
      error: "Request needs a JSON body with a name, a price, and an owner ID"
    });
  }

});

function deleteLodgingByID(lodgingID) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'DELETE FROM lodgings WHERE id = ?',
      [ lodgingID ],
      function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result.affectedRows > 0);
        }
      }
    );
  });

}

app.delete('/lodgings/:lodgingID', function (req, res, next) {
  const lodgingID = parseInt(req.params.lodgingID);
  deleteLodgingByID(lodgingID)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to delete lodging."
      });
    });
});

function getLodgingsByOwnerID(ownerID) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM lodgings WHERE ownerid = ?',
      [ ownerID ],
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
}

app.get('/users/:userID/lodgings', function (req, res, next) {
  const ownerID = parseInt(req.params.userID);
  getLodgingsByOwnerID(ownerID)
    .then((ownerLodgings) => {
      res.status(200).json({
        lodgings: ownerLodgings
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: `Unable to fetch lodgings for user ${ownerID}`
      });
    });

});

app.use('*', function (req, res, next) {
  res.status(404).json({
    error: "Path " + req.url + " does not exist"
  });
});

app.listen(port, function() {
  console.log("== Server is running on port", port);
});
