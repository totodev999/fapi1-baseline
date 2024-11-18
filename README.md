# Summary

This repository is an implementation of FAPI1.0 baseline using private_key_JWT and PKCE.
This repository is composed of following items.

- Key Cloak
- Node server(Express)
- React(used only for initial authentication)

## Features

1. private_key_JWT
2. PKCE（Proof Key for Code Exchange）

## Using HTTPS in local environment

```
npx local-ssl-proxy --source 4001 --target 4000
```

## Start Express server

```
npm run dev
```

## Setting KeyCloak

KeyCloak's setting is also done for FAPI1.0.
You can use `fapi-1-baseline` policy to comply with FAPI1.0 baseline.

1. Setting policies.  
   The name of Client Policy is your choice, such as fapi1-baseline. And simply add `fapi-1-baseline` policy to `Client profiles`
2. Setting Clients
   You can import the settings to your KeyCloak using `keycloak/settings/fapi1-baseline.json`.

3. Creating a key for client-authentication(private_key_JWT)
   Click the Clients tab and select the clientID you created and click it. Then you'll see client settings and click Keys tab. Click the Generate new Keys. Then you'll see "Generate keys?" modal. Select Archive format(I used PKCS12) and enter password. Then the private key automatically download to your browser. And public key is automatically installed into KeyCloak.

4. Creating a user for tests
   Click the Users tab. At the Users screen, click the Add user button. Enter Username and click the Create button.

5. Run KeyCloak using Docker

```
cd keycloak
docker compose up --build
```
