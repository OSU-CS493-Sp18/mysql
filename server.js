const logger = require('./lib/logger');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 8000;

let lodgings = require('./lodgings');

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(logger);

app.get('/lodgings', function (req, res) {

  let page = parseInt(req.query.page) || 1;
  const numPerPage = 10;
  const lastPage = Math.ceil(lodgings.length / numPerPage);
  page = page < 1 ? 1 : page;
  page = page > lastPage ? lastPage : page;

  const start = (page - 1) * numPerPage;
  const end = start + numPerPage;
  const pageLodgings = lodgings.slice(start, end);

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
    lodgings: pageLodgings,
    pageNumber: page,
    totalPages: lastPage,
    pageSize: numPerPage,
    totalCount: lodgings.length,
    links: links
  });

});

app.post('/lodgings', function (req, res, next) {

  if (req.body && req.body.name && req.body.price && req.body.ownerID) {
    const id = lodgings.length;
    lodgings.push({
      id: id,
      name: req.body.name,
      price: req.body.price,
      ownerID: req.body.ownerID,
      description: req.body.description || "No description"
    });
    res.status(201).json({
      id: id,
      links: {
        lodging: '/lodgings/' + id
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
