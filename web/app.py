
from flask import Flask
from flask import render_template
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

#import mysql.connector as mariadb
#mariadb_connection = mariadb.connect(host='db', user='sneezy', password='password', database='sneezy')
#cursor = mariadb_connection.cursor()

app.config["SQLALCHEMY_DATABASE_URI"] = 'mysql+pymysql://{usr}:{passwd}@{host}/{db}'.format(
    usr='sneezy', passwd='password', host='db', db='sneezy'
)

db = SQLAlchemy(app)

 #`zone_nr` int(11) NOT NULL,
  #`zone_name` varchar(255) NOT NULL default '',
  #`zone_enabled` int(11) default NULL,
  #`bottom` int(11) default NULL,
  #`top` int(11) default NULL,
  #`reset_mode` int(11) default NULL,
  #`lifespan` int(11) default NULL,
  #`age` int(11) default NULL,
  #`util_flag` int(11) default NULL,
  #PRIMARY KEY  (`zone_nr`)


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
    #cursor.execute("SELECT zone_name FROM zone")
    #zones = list(cursor)
    zones = Zone.query.all()
    return render_template("home.html", zones=zones)

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)