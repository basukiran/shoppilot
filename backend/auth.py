import base64
import hashlib
import hmac
import secrets


PASSWORD_HASH_ALGORITHM = "pbkdf2_sha256"
PASSWORD_HASH_ITERATIONS = 600_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_HASH_ITERATIONS,
    )
    encoded_salt = base64.urlsafe_b64encode(salt).decode("ascii")
    return (
        f"{PASSWORD_HASH_ALGORITHM}${PASSWORD_HASH_ITERATIONS}"
        f"${encoded_salt}${password_hash.hex()}"
    )


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, encoded_salt, expected_hash = stored_hash.split("$", 3)
        if algorithm != PASSWORD_HASH_ALGORITHM:
            return False

        salt = base64.urlsafe_b64decode(encoded_salt.encode("ascii"))
        candidate_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            int(iterations),
        ).hex()
        return hmac.compare_digest(candidate_hash, expected_hash)
    except (ValueError, TypeError):
        return False


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()