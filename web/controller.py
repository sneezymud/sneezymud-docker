import auth
import model
from main import app, db

from flask import render_template


@app.route("/")
@auth.requires_auth
def hello():
    #cursor.execute("SELECT zone_name FROM zone")
    #zones = list(cursor)
    zones = model.Zone.query.all()
    return render_template("home.html", zones=zones)
