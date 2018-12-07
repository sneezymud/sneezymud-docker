
from flask import Flask
from flask import render_template
from flask_sqlalchemy import SQLAlchemy
#from flask_login import LoginManager
import crypt


app = Flask(__name__)



#import mysql.connector as mariadb
#mariadb_connection = mariadb.connect(host='db', user='sneezy', password='password', database='sneezy')
#cursor = mariadb_connection.cursor()

app.config["SQLALCHEMY_DATABASE_URI"] = 'mysql+pymysql://{usr}:{passwd}@{host}/{db}'.format(
    usr='sneezy', passwd='password', host='db', db='sneezy'
)

db = SQLAlchemy(app)

#login = LoginManager(app)
#class User(UserMixin, db.Model):


class Account(db.Model):
    account_id = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    email = db.Column(db.String(80))
    name = db.Column(db.String(80))
    passwd = db.Column(db.String(13))
    birth = db.Column(db.Integer)
    term = db.Column(db.Integer)
    time_adjust = db.Column(db.Integer)
    flags = db.Column(db.Integer)
    last_logon = db.Column(db.Integer)

    def __repr__(self):
        return "<Name: {}>".format(self.name)

class Zone(db.Model):
    zone_nr = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    zone_name = db.Column(db.String(255), unique=True, nullable=False)
    zone_enabled = db.Column(db.Integer)
    bottom = db.Column(db.Integer)
    top = db.Column(db.Integer)
    reset_mode = db.Column(db.Integer)
    lifespan = db.Column(db.Integer)
    age = db.Column(db.Integer)
    util_flag = db.Column(db.Integer)

    def __repr__(self):
        return "<Name: {}>".format(self.zone_name)

@app.route("/")
def hello():
    zones = Zone.query.all()
    accounts = Account.query.all()
    return render_template("home.html", zones= zones, accounts=accounts)

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)