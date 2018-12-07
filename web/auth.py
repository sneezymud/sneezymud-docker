from main import db
import model

import crypt
import functools
from flask import request, Response


def check_auth(username, password):
    """This function is called to check if a username /
    password combination is valid.
    """
    sneezy_pw = crypt.crypt(password, username)[:10]
    account = model.Account.query.filter_by(name=username, passwd=sneezy_pw).first()
    return account is not None


def authenticate():
    """Sends a 401 response that enables basic auth"""
    return Response(
    'Please log in using your Sneezy account name and password.', 401,
    {'WWW-Authenticate': 'Basic realm="Sneezy account"'})


def requires_auth(f):
    @functools.wraps(f)

    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated
