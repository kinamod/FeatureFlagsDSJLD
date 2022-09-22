// require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const authConfig = require("./src/auth_config.json");
const axios = require('axios');
const qs = require('qs');

const LaunchDarkly = require("launchdarkly-node-server-sdk");

const ldClient = LaunchDarkly.init("sdk-dbfea2c6-bae1-4d9d-931b-e6dd6058d930");
//Replace the line above with the line below once you've inserted your key
// const ldClient = LaunchDarkly.init(<YOUR SDK KEY>); //REPLACE SDK KEY HERE

const app = express();

const port = authConfig.api_port || 3001;
const appPort = authConfig.server_port || 3000;
const issuer = authConfig.authIssuer;
const auth0ClientId = authConfig.AUTH0_M2M_CLIENT_ID;
const auth0ClientSecret = authConfig.AUTH0_M2M_CLIENT_SECRET;
const appOrigin = authConfig.appOrigin || `http://localhost:${appPort}`;
const runningLocally = true;

if (
  !authConfig.domain ||
  !authConfig.audience ||
  authConfig.audience === "YOUR_API_IDENTIFIER"
) {
  console.log(
    "Exiting: Please make sure that auth_config.json is in place and populated with valid domain and audience values"
  );

  process.exit();
}

app.use(morgan("dev"));
app.use(helmet());
app.use(cors({ origin: appOrigin }));

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`,
  }),

  audience: authConfig.audience,
  issuer: `https://${authConfig.domain}/`,
  algorithms: ["RS256"],
});

app.get("/api/external", checkJwt, (req, res) => {
  res.send({
    msg: "Your access token was successfully validated!",
  });
});

app.get("/api/get-full-id/:UserID", checkJwt, (req, res) => {
  //Here we get the user information first...
  //THEN we check if the user is eligible fo rthe feature.
  //This is so we can populate the user's name, rather than 
  //just the "unfriendly" user ID which I send from Auth0

  getFullAuth0ID(req.params.UserID)
    .then(function (response) {
      checkFeature(response.data)
        .then(function (showFeature) {
          if (showFeature == true) {
            testLogging("run for this user");
            response.data.featureflagged = true;
            res.send({ msg: response.data });
          } else {
            testLogging("dont run for this user");
            res.send({ msg: "User ID - " + response.data.user_id + " == == " + "E-Mail - " + response.data.email });
          }
        })
    })
    .catch(function (error) {
      testLogging(error);
      return error;
    });

});

app.listen(port, () => console.log(`API Server listening on port ${port}`));


//Helper functions

async function checkFeature(userprofile) {
  const user = {
    firstName: userprofile.nickname,
    key: userprofile.user_id
  };
  const answer = await ldClient.variation("ExtendedProfile", user, false);

  testLogging(userprofile.user_id + " will get the variation - " + answer);
  return answer;
}

async function getManagamentApiToken() {
  try {
    const data = qs.stringify({
      'grant_type': 'client_credentials',
      'client_id': auth0ClientId,
      'client_secret': auth0ClientSecret,
      'audience': `${issuer}api/v2/`  //This is the issuer because this is the audience as far as GOOGLE is concerned
    });

    const config = {
      method: 'post',
      url: `${issuer}oauth/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: data,
    };

    const bearerToken = await axios(config);
    return bearerToken.data.access_token;
  } catch (e) {
    testLogging(e);
  }
}


function testLogging(message) {
  if (runningLocally) console.log(message);
}

async function getFullAuth0ID(UserID) {
  const url = `${issuer}api/v2/users/${UserID}`;
  testLogging("get full id - url: " + url);

  try {
    //getting token to call auth0
    const bearerToken = await getManagamentApiToken();

    //using auth0 token to get the token auth0 has for googleAPI
    testLogging("api token: " + bearerToken)
    const config = {
      url: url,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + bearerToken,
      }
    };

    const response = await axios(config);
    testLogging("getFullAuth0ID: response data: " + response.data);
    return response;

  } catch (err) {
    testLogging("getFullAuth0ID: " + err)
  }
}