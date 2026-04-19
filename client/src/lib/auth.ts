import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

const POOL_DATA = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? "",
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? "",
};

const userPool = new CognitoUserPool(POOL_DATA);

export interface AuthUser {
  email: string;
  sub: string;
  name?: string;
  token: string;
  groups: string[];
  isAdmin: boolean;
}

function parseGroups(session: CognitoUserSession): string[] {
  try {
    const payload = session.getIdToken().decodePayload();
    return payload["cognito:groups"] ?? [];
  } catch {
    return [];
  }
}

function buildUser(session: CognitoUserSession, attrs: CognitoUserAttribute[]): AuthUser {
  const get = (name: string) => attrs.find((a) => a.Name === name)?.Value ?? "";
  const groups = parseGroups(session);
  return {
    email: get("email"),
    sub: get("sub"),
    name: get("name") || get("email"),
    token: session.getIdToken().getJwtToken(),
    groups,
    isAdmin: groups.includes("admin"),
  };
}

export function getCurrentUser(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) return resolve(null);

    cognitoUser.getSession((err: any, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null);

      cognitoUser.getUserAttributes((err, attrs) => {
        if (err || !attrs) return resolve(null);
        resolve(buildUser(session, attrs));
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
          if (err || !attrs) return reject(err);
          resolve(buildUser(session, attrs));
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
