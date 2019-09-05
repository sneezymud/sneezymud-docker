import auth
from model import Player, Wizdata, Account, Room, Zone, Obj, Mob
from main import app, db

from flask import render_template, request, flash
from sqlalchemy.sql import text

from flask_wtf import FlaskForm
from wtforms import StringField
from wtforms.validators import DataRequired
from wtforms.ext.sqlalchemy.orm import model_form

@app.route("/")
@auth.requires_auth
def home():
    return render_template("home.html")


@app.route("/zones")
@auth.requires_auth
def zones():
    zones = Zone.query.all()
    return render_template("zones.html", zones=zones)


@app.route("/rooms")
@auth.requires_auth
def rooms():
    return render_template("list.html", type='room', things=Room.getMy(request.authorization.username))

@app.route("/objs")
@auth.requires_auth
def objects():
    return render_template("list.html", type='obj', things=Obj.getMy(request.authorization.username))

@app.route("/mobs")
@auth.requires_auth
def mobs():
    return render_template("list.html", type='mob', things=Mob.getMy(request.authorization.username))

@app.route('/room/<int:vnum>', methods=['GET', 'POST'])
@auth.requires_auth
def room(vnum):
    return edit(vnum, Room, 'room.html', request.authorization.username)

@app.route('/obj/<int:vnum>', methods=['GET', 'POST'])
@auth.requires_auth
def obj(vnum):
    return edit(vnum, Obj, 'obj.html', request.authorization.username)


@app.route('/mob/<int:vnum>', methods=['GET', 'POST'])
@auth.requires_auth
def mob(vnum):
    return edit(vnum, Mob, 'mob.html', request.authorization.username)


def edit(vnum, Thing, template, name):
    if not Thing.canAccess(vnum, name):
        return render_template("badaccess.html")

    thing = Thing.query.filter_by(vnum=vnum).first()
    Form = model_form(Thing, base_class=FlaskForm, db_session=db.session)
    form = Form(obj=thing)

    if form.validate_on_submit():
        form.populate_obj(thing)
        db.session.commit()
        flash("Saved!")

    return render_template(template, form=form, thing=thing)
