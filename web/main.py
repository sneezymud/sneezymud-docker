from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = 'mysql+pymysql://{usr}:{passwd}@{host}/{db}'.format(
    usr='sneezy', passwd='password', host='db', db='sneezy')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = True

db = SQLAlchemy(app)

from controller import *
print("Routes:")
print(app.url_map)

import setup
setup.setup(app)

if __name__ == "__main__":
    print("Starting")
    app.run(host="0.0.0.0", debug=True)