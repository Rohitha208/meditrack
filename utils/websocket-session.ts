import {
  getJwtToken,
  removeClinicId,
  removeClinicName,
  removeJwtToken,
  removeUserId,
} from "@/utils/clientCookie";
import { isTokenExpired } from "@/utils/jwtToken";

let redirectingToLogin = false;

function isPublicAuthPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/login/")
  );
}

export function isAuthSessionInvalid() {
  const token = getJwtToken();
  return !token || isTokenExpired(token);
}

/** Hub closed for good (reconnect stopped or token gone) — send the user to login. */
export function redirectToLoginAfterWsSessionEnd() {
  if (typeof window === "undefined" || redirectingToLogin) return;
  if (isPublicAuthPath(window.location.pathname)) return;

  redirectingToLogin = true;

  try {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("lastVisitedUrls");
  } catch {
    // ignore storage errors during teardown
  }

  removeJwtToken();
  removeUserId();
  removeClinicId();
  removeClinicName();

  window.location.replace("/login");
}
