# LaunchDarkly Demo

## Set Up the Environment
1. Clone the repository
2. From the terminal, inside the base folder of the repo install the application...
3. `npm install`
4. `npm start`
5. Typically your browser will launch to the homepage

## Create Accounts
Username | Pass | Show Feature
--------|----|---
Timmy   |1234|yes
Billy   |1234|no

Feel free to use these or to create your own using the Sign Up button in the top right.

## Test Functionality
My flag triggers for several users:
- Bob Loblaw,
- Kinamod Gorman,
- But also for anyone who'se name begins with a T.

1. Create an account and log in
2. Navigate to the **External Api** tab

**Ping Api** simply authenticates an `Access Token`.

**Get User** will send a request to Auth0 for the User Information.
- For the _selected_ users, this will show an *Extended* profile of the user.
- For anyone else, it's a very basic profile.