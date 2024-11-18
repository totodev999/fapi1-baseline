import express from 'express';
import * as client from 'openid-client';
import cookie from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import axios from 'axios';

import { extractPrivateKeyPem } from './extractPrivateKey.js';
import { generateClientAssertion } from './generateClientAssertion.js';

dotenv.config();
// This project is created as ESM, so we need to use import.meta.dirname to get the __dirname
const __dirname = import.meta.dirname;

// get the private key for private_key_jwt
const privateKeyJWTKeyPath = path.join(__dirname, '../private_key_JWT_key.p12');
const privateKeyJWTKeyPassword = 'password';
console.log('privateKeyJWTKeyPath:', privateKeyJWTKeyPath);
const privateKeyJWTKey = extractPrivateKeyPem(
  privateKeyJWTKeyPath,
  privateKeyJWTKeyPassword
);

// settings
const clientId = 'fapi1-baseline';
const keycloakRealm = 'fapi1_baseline';
const keycloakUrl = 'http://localhost:8080';
const redirectUri = 'https://localhost:4001/api/authRedirect';
const scope = 'openid';
const tokenEndpoint = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/token`;

// PKCE code_verifier
let code_verifier: string = client.randomPKCECodeVerifier();

const app = express();

app.use(cookie());

app.use((req, res, next) => {
  console.log('Request URL:', req.url);
  next();
});

app.get('/api/auth', async (req, res) => {
  // 1. Generating code_challenge. Note)code_verifier is already created when server starts. But this way is just for demonstration.
  const codeChallenge = await client.calculatePKCECodeChallenge(code_verifier);
  const state = Math.random().toString(36).substring(2, 15); // ランダムな状態パラメータ
  const nonce = Math.random().toString(36).substring(2, 15); // ランダムな状態パラメータ

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('redirect_uri', 'https://localhost:4001/api/authRedirect');
  params.append('scope', scope);
  params.append('response_type', 'code');
  params.append('state', state);
  params.append('nonce', nonce);
  params.append('code_challenge', codeChallenge);
  params.append('code_challenge_method', 'S256');

  console.log('params:', params.toString());

  // 3. Redirecting to the authorization endpoint
  res.redirect(
    `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/auth?${params.toString()}`
  );
});

// After authorization, a user will be redirected to this endpoint
app.get('/api/authRedirect', async (req, res): Promise<any> => {
  console.log('req.query:', req.query);
  const { code } = req.query;

  // To-Do: check the state parameter

  // private_key_jwt
  const clientAssertion = generateClientAssertion(
    clientId,
    tokenEndpoint,
    privateKeyJWTKey
  );

  // Exchanging the authorization code for an access token
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('client_id', clientId);
  params.append('redirect_uri', redirectUri); // I'm not sure why this is needed
  params.append('code', code as string);
  params.append('code_verifier', code_verifier);
  params.append(
    'client_assertion_type',
    'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
  );
  params.append('client_assertion', clientAssertion);

  const token = await axios.post(tokenEndpoint, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  console.log('token:', token.data);

  // Get certificate from the JWKS endpoint
  const key = createRemoteJWKSet(
    new URL(
      `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/certs`
    )
  );

  // inject the given_name into the payload of the access_token to test the verification
  // (token.data.access_token as string).replace(/.$/, '@')

  // Verify the access_token and id_token
  const verifyResultOfAccessToken = await jwtVerify(
    token.data.access_token,
    key
  );

  console.log('verifyResultOfAccessToken:', verifyResultOfAccessToken);

  const verifyResultOfIDToken = await jwtVerify(token.data.id_token, key);

  console.log('verifyResultOfIDToken:', verifyResultOfIDToken);

  // To-Do: check the nonce in the id_token
});

export default app;
