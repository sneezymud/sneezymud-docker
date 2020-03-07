from main import db
import model

import functools
from flask import request, Response

class AuthResponse(object):
    success = 0
    no_account = 1
    no_block = 2

def check_auth(username, password):
    """This function is called to check if a username /
    password combination is valid.
    """
    account = model.authenticate(username, password)
    if account is None:
        return AuthResponse.no_account
    if not model.hasAssignedBlock(account):
        return AuthResponse.no_block
    return AuthResponse.success


def authenticate():
    """Sends a 401 response that enables basic auth"""
    return Response(
    'Please log in using your Sneezy account name and password.', 401,
    {'WWW-Authenticate': 'Basic realm="Sneezy account"'})


def no_assigned_block():
    """Sends a 401 response that enables basic auth"""
    return Response(
    'You do not have a number block assigned. Ask an admin to give you one.', 401)


def requires_auth(f):
    @functools.wraps(f)

    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth:
            return authenticate()

        auth_result = check_auth(auth.username, auth.password)
        print("auth_result:", auth_result)
        if auth_result == AuthResponse.no_account:
            return authenticate()
        elif auth_result == AuthResponse.no_block:
            return no_assigned_block()

        return f(*args, **kwargs)
    return decorated
