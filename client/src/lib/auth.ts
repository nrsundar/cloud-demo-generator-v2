import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

const POOL_DATA = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? "us-east-2_sndKJLxLR",
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? "4bm8gt0i2of69v9g0vm5nnh2k0",
};

const userPool = new CognitoUserPool(POOL_DATA);

export interface AuthUser {
  email: string;
  sub: string;
  name?: string;
  token: string;
}

export function getCurrentUser(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) return resolve(null);

    cognitoUser.getSession((err: any, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null);

      cognitoUser.getUserAttributes((err, attrs) => {
        if (err) return resolve(null);
        const get = (name: string) => attrs?.find((a) => a.Name === name)?.Value ?? "";
        resolve({
          email: get("email"),
          sub: get("sub"),
          name: get("name") || get("email"),
          token: session.getIdToken().getJwtToken(),
        });
      });
    });
  });
}

export function signIn(email: string, password: string): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        cognitoUser.getUserAttributes((err, attrs) => {
          if (err) return reject(err);
          const get = (name: string) => attrs?.find((a) => a.Name === name)?.Value ?? "";
          resolve({
            email: get("email"),
            sub: get("sub"),
            name: get("name") || get("email"),
            token: session.getIdToken().getJwtToken(),
          });
        });
      },
      onFailure: (err) => reject(err),
      newPasswordRequired: () => reject(new Error("Password change required. Contact admin.")),
    });
  });
}

export function signUp(email: string, password: string, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const attrs = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
      new CognitoUserAttribute({ Name: "name", Value: name }),
    ];
    userPool.signUp(email, password, attrs, [], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function signOut(): void {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) cognitoUser.signOut();
}
