const USER_DISPLAY_NAME_STORAGE_PREFIX = "talk-viewer:user-display-name:";
export const USER_DISPLAY_NAME_UPDATED_EVENT = "user-display-name-updated";

function normalizeEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

export function normalizeDisplayName(name: string) {
  return String(name ?? "").replace(/\s+/g, " ").trim();
}

function storageKeyByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return "";
  }

  return `${USER_DISPLAY_NAME_STORAGE_PREFIX}${normalizedEmail}`;
}

export function readLocalUserDisplayName(email: string | undefined) {
  if (typeof window === "undefined") {
    return "";
  }

  const key = storageKeyByEmail(String(email ?? ""));
  if (!key) {
    return "";
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? normalizeDisplayName(raw) : "";
  } catch {
    return "";
  }
}

export function writeLocalUserDisplayName(email: string | undefined, name: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedEmail = normalizeEmail(String(email ?? ""));
  if (!normalizedEmail) {
    return;
  }

  const key = storageKeyByEmail(normalizedEmail);
  const normalizedName = normalizeDisplayName(name);

  try {
    if (normalizedName) {
      window.localStorage.setItem(key, normalizedName);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(USER_DISPLAY_NAME_UPDATED_EVENT, {
      detail: {
        email: normalizedEmail,
        name: normalizedName,
      },
    }),
  );
}
