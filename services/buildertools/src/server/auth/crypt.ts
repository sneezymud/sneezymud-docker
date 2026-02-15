import { CString, dlopen, FFIType } from "bun:ffi";

// DES crypt via system libcrypt — same algorithm the C++ game server uses
const lib = dlopen("libcrypt.so.1", {
  crypt: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
});

/**
 * Verify a password against the stored DES crypt hash.
 *
 * The MUD stores passwords as `crypt(password, username)` truncated to 10 chars.
 * The username serves as the 2-character salt for DES crypt.
 */
export function verifyPassword(
  password: string,
  username: string,
  storedHash: string,
): boolean {
  const resultPtr = lib.symbols.crypt(toCString(password), toCString(username));
  if (resultPtr === null) {
    return false;
  }
  const hashed = new CString(resultPtr).toString().slice(0, 10);
  return hashed === storedHash;
}

function toCString(str: string): Buffer {
  return Buffer.from(`${str}\0`, "utf8");
}
