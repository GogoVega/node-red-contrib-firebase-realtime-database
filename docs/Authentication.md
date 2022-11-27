# Authentication Methods

## Anonymous

This method allows you to authenticate anonymously to your database using a temporary anonymous account. These authentications are visible in the `Authentication` section and will be deactivated automatically after 30 days.

## Email and Password

This method allows you to authenticate using an email address and a password. To use this method you must first create an user. Please note: this user is different from your Google account which allows you to access Firebase. To create an user you have two solutions:

- Go to the `Authentication` section and click on "Add User" then fill in your data in the config node.
- Complete directly in the config node, an email address and a password, the node will create an user for you. This user will also appear in the `Authentication` section.

## Private Key (SDK)

This method allows to authenticate, in an automated way via the unified Admin SDK.
To generate a Private Key, go to Firebase, in the `Project settings` section, click on
`Service Accounts` and then "Generate a new private key". This will download a
JSON file that you will copy and paste into the configuration node.
