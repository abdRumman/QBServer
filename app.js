'use strict';

require('dotenv').config();

/**
 * Require the dependencies
 * @type {*|createApplication}
 */
const express = require('express');

const app = express();
const path = require('path');
const OAuthClient = require('intuit-oauth');
const bodyParser = require('body-parser');
const ngrok = process.env.NGROK_ENABLED === 'true' ? require('ngrok') : null;

const cc = {
  query: `CustomFieldsQuery__qbo_custom_fields_ui_qbo {
  company {
      id,
      ...F1
  }
}
fragment F0 on Company {
  id,
  customFieldDefinitions(first:1000 ) {
      edges {
          node {
              id
              schema {
                  type
                  title
                  format
                  allowedOperations
                  allowedValues {
                      id
                      value
                      deleted
                      order
                  },
                  id
                  __typename
                  metadataProperties
              }
              name
              deleted
              associatedEntityTypes {
                  type
                  deleted
                  allowedOperations
                  entityConditions {
                      subtype
                      deleted
                      allowedOperations
                  }
              }
              customFieldDefinitionMetaModel {
                  suggested
              }
              __typename
          }
          cursor
      }
      pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
      }
  }
} 
fragment F1 on Company {
  customFieldDefinitionsPageInfo:customFieldDefinitions {
      totalCount
  }
  id
  ...F0
}`}
/**
 * Configure View and Handlebars
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/public')));
app.engine('html', require('ejs').renderFile);

app.set('view engine', 'html');
app.use(bodyParser.json());

const urlencodedParser = bodyParser.urlencoded({ extended: false });

/**
 * App Variables
 * @type {null}
 */
let oauth2_token_json = null;
let redirectUri = '';

/**
 * Instantiate new Client
 * @type {OAuthClient}
 */

let oauthClient = null;

/**
 * Home Route
 */
app.get('/', function (req, res) {
  res.render('index');
});

/**
 * Get the AuthorizeUri
 */
app.get('/authUri', urlencodedParser, function (req, res) {
  oauthClient = new OAuthClient({
    clientId: req.query.json.clientId,
    clientSecret: req.query.json.clientSecret,
    environment: req.query.json.environment,
    redirectUri: req.query.json.redirectUri,
  });

  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: 'intuit-test',
  });
  res.send(authUri);
});

/**
 * Handle the callback to extract the `Auth Code` and exchange them for `Bearer-Tokens`
 */
app.get('/callback', function (req, res) {
  oauthClient
    .createToken(req.url)
    .then(function (authResponse) {
      oauth2_token_json = JSON.stringify(authResponse.getJson(), null, 2);
    })
    .catch(function (e) {
      console.error(e);
    });

  res.send('');
});

/**
 * Display the token : CAUTION : JUST for sample purposes
 */
app.get('/retrieveToken', function (req, res) {
  res.send(oauth2_token_json);
});

/**
 * Refresh the access-token
 */
app.get('/refreshAccessToken', function (req, res) {
  oauthClient
    .refresh()
    .then(function (authResponse) {
      console.log(`The Refresh Token is  ${JSON.stringify(authResponse.getJson())}`);
      oauth2_token_json = JSON.stringify(authResponse.getJson(), null, 2);
      res.send(oauth2_token_json);
    })
    .catch(function (e) {
      console.error(e);
    });
});

/**
 * getCompanyInfo ()
 */
app.get('/getCompanyInfo', function (req, res) {
  const companyID = oauthClient.getToken().realmId;

  const url =
    oauthClient.environment == 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  oauthClient
    .makeApiCall({
      url: `${url}v3/company/${companyID}/companyinfo/${companyID}`
    })
    .then(function (authResponse) {
      console.log(`The response for API call is :${JSON.stringify(authResponse)}`);
      res.send(JSON.parse(authResponse.text()));
    })
    .catch(function (e) {
      console.error(e);
    });
});
/**
 * getCustomers ()
 */
app.get('/getCustomers', function (req, res) {
  const companyID = oauthClient.getToken().realmId;

  const url =
    oauthClient.environment == 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  oauthClient
    .makeApiCall({
      url: `${url}/v3/company/${companyID}/query?query=select * from Customer&minorversion=65`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(function (authResponse) {
      console.log(`The response for API call is :${JSON.stringify(authResponse)}`);
      res.send(JSON.parse(authResponse.text()));
    })
    .catch(function (e) {
      console.error(e);
    });
});
/**
 * getMew()
 */
app.get('/getMew', function (req, res) {
  const companyID = oauthClient.getToken().realmId;

  const url =
    oauthClient.environment == 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  oauthClient
    .makeApiCall({
      url: `${url}/v3/company/${companyID}/preferences?minorversion=40`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(function (authResponse) {
      console.log(`The response for API call is :${JSON.stringify(authResponse)}`);
      res.send(JSON.parse(authResponse.text()));
    })
    .catch(function (e) {
      console.error(e);
    });
});
/**
 * getTerms()
 */
app.get('/getTerms', function (req, res) {
  res.send(JSON.parse(`[
        {
            "deleted": false,
            "__typename": "Schema_Schema_AllowedValue",
            "id": "900000000000359066_1",
            "value": "C.O.D",
            "order": 1
        },
        {
            "deleted": false,
            "__typename": "Schema_Schema_AllowedValue",
            "id": "900000000000359066_2",
            "value": "INV TO INV",
            "order": 2
        },
        {
            "deleted": false,
            "__typename": "Schema_Schema_AllowedValue",
            "id": "900000000000359066_3",
            "value": "CALL REP",
            "order": 3
        }
    ]`));
});

/**
 * getSalesRep()
 */
app.get('/getSalesRep', function (req, res) {
  res.send(JSON.parse(`[
    {
        "deleted": true,
        "__typename": "Schema_Schema_AllowedValue",
        "id": "900000000000293072_1",
        "value": "HAMED",
        "order": 1
    },
    {
        "deleted": false,
        "__typename": "Schema_Schema_AllowedValue",
        "id": "900000000000293072_2",
        "value": "SULEIMAN",
        "order": 2
    },
    {
        "deleted": false,
        "__typename": "Schema_Schema_AllowedValue",
        "id": "900000000000293072_3",
        "value": "BACCA",
        "order": 3
    },
    {
        "deleted": false,
        "__typename": "Schema_Schema_AllowedValue",
        "id": "900000000000293072_4",
        "value": "HUSAM",
        "order": 4
    },
    {
        "deleted": false,
        "__typename": "Schema_Schema_AllowedValue",
        "id": "900000000000293072_5",
        "value": "BAHA'A",
        "order": 5
    },
    {
        "deleted": false,
        "__typename": "Schema_Schema_AllowedValue",
        "id": "900000000000293072_6",
        "value": "WAREHOUSE",
        "order": 6
    },
    {
        "deleted": true,
        "__typename": "Schema_Schema_AllowedValue",
        "id": "900000000000293072_7",
        "value": "HH",
        "order": 7
    },
    {
        "deleted": false,
        "__typename": "Schema_Schema_AllowedValue",
        "id": "900000000000293072_8",
        "value": "AHMED",
        "order": 8
    },
    {
        "deleted": false,
        "__typename": "Schema_Schema_AllowedValue",
        "id": "900000000000293072_9",
        "value": "ZAK",
        "order": 9
    },
    {
        "deleted": false,
        "__typename": "Schema_Schema_AllowedValue",
        "id": "900000000000293072_10",
        "value": "OUI",
        "order": 10
    },
    {
        "deleted": false,
        "__typename": "Schema_Schema_AllowedValue",
        "id": "900000000000293072_11",
        "value": "MOE",
        "order": 11
    }
]`));
});


/**
 * getCustomers ()
 */
app.get('/estimate', function (req, res) {
  const companyID = oauthClient.getToken().realmId;

  const url =
    oauthClient.environment == 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  const payload = {
    "CustomerRef": {
      "name": "Cool Cars",
      "value": "3"
    },
    "Line": [
      {
        "Description": "Pest Control Services",
        "DetailType": "SalesItemLineDetail",
        "SalesItemLineDetail": {
          "TaxCodeRef": {
            "value": "NON"
          },
          "Qty": 1,
          "UnitPrice": 35,
          "ItemRef": {
            "name": "Pest Control",
            "value": "10"
          }
        },
        "LineNum": 1,
        "Amount": 35.0,
        "Id": "1"
      },]
  }
  oauthClient
    .makeApiCall({
      url: `${url}/v3/company/${companyID}/estimate`,
      method: 'POST',
      body: payload,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(function (authResponse) {
      console.log(`The response for API call is :${JSON.stringify(authResponse)}`);
      res.send(JSON.parse(authResponse.text()));
    })
    .catch(function (e) {
      console.error(e);
    });
});


/**
 * disconnect ()
 */
app.get('/disconnect', function (req, res) {
  console.log('The disconnect called ');
  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.OpenId, OAuthClient.scopes.Email],
    state: 'intuit-test',
  });
  res.redirect(authUri);
});

/**
 * Start server on HTTP (will use ngrok for HTTPS forwarding)
 */
const server = app.listen(process.env.PORT || 8000, () => {
  console.log(`💻 Server listening on port ${server.address().port}`);
  if (!ngrok) {
    redirectUri = `${server.address().port}` + '/callback';
    console.log(
      `💳  Step 1 : Paste this URL in your browser : ` +
      'http://localhost:' +
      `${server.address().port}`,
    );
    console.log(
      '💳  Step 2 : Copy and Paste the clientId and clientSecret from : https://developer.intuit.com',
    );
    console.log(
      `💳  Step 3 : Copy Paste this callback URL into redirectURI :` +
      'http://localhost:' +
      `${server.address().port}` +
      '/callback',
    );
    console.log(
      `💻  Step 4 : Make Sure this redirect URI is also listed under the Redirect URIs on your app in : https://developer.intuit.com`,
    );
  }
});

/**
 * Optional : If NGROK is enabled
 */
if (ngrok) {
  console.log('NGROK Enabled');
  ngrok
    .connect({ addr: process.env.PORT || 8000 })
    .then((url) => {
      redirectUri = `${url}/callback`;
      console.log(`💳 Step 1 : Paste this URL in your browser :  ${url}`);
      console.log(
        '💳 Step 2 : Copy and Paste the clientId and clientSecret from : https://developer.intuit.com',
      );
      console.log(`💳 Step 3 : Copy Paste this callback URL into redirectURI :  ${redirectUri}`);
      console.log(
        `💻 Step 4 : Make Sure this redirect URI is also listed under the Redirect URIs on your app in : https://developer.intuit.com`,
      );
    })
    .catch(() => {
      process.exit(1);
    });
}
