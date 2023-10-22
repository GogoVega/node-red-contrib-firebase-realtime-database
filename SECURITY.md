# Security Policy

Your credentials are stored in the flow credentials file (`flows_cred.json`).

Your flow credentials file is encrypted using a system-generated key.
If the system-generated key is lost for any reason, your credentials file will not be recoverable, you will have to delete it and re-enter your credentials.
You can set your own key using the 'credentialSecret' option in your settings file. Node-RED will then re-encrypt your credentials file using your chosen key the next time you deploy a change.

## Supported Versions

| Version  | Supported          |
| -------- | ------------------ |
| >= 0.0.1 | :white_check_mark: |

## Reporting a Vulnerability

Please report any potential security issues by clicking on "Report a vulnerability" in the Security tab.
