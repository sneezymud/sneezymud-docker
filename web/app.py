
from flask import Flask
from flask import render_template

app = Flask(__name__)

import mysql.connector as mariadb

mariadb_connection = mariadb.connect(host='db', user='sneezy', password='password', database='sneezy')
cursor = mariadb_connection.cursor()

for zone_name in cursor:
    print("Zone: {}").format(zone_name)

@app.route("/")
def hello():
    cursor.execute("SELECT zone_name FROM zone")
    zones = list(cursor)
    return render_template("home.html", zones=zones)

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)