import auth
from model import Player, Wizdata, Account, Room, Zone
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
    # I very much dislike ORMs just for this reason -- you need to learn a new
    # language for doing something you already necessarily know how to do --
    # and then it's still harder to do than in SQL.
    # res = (Account.queryV
    #         .join(Player, Account.account_id == Player.account_id)
    #         .join(Wizdata, Wizdata.player_id == Player.id)
    #         .join(Room, Room.vnum )
    #         .filter(Room.vnum >= Wizdata.blockastart and Room.vnum <= Wizdata.blockaend
    #             or Room.vnum >= Wizdata.blockbstart and Room.vnum <= Wizdata.blockbend)
    #         .filter(Account.name == request.authorization.username))
    # print(res)
    res = db.session.get_bind().execute(text("""
        select r.vnum, r.name
        from account a
        inner join player p on p.account_id = a.account_id
        inner join wizdata w on w.player_id = p.id
        right join room r on (r.vnum between w.blockastart and w.blockaend or r.vnum between w.blockbstart and w.blockbend)
        where a.name = :name"""), name=request.authorization.username)
    return render_template("rooms.html", rooms=res)

@app.route('/room/<int:vnum>', methods=['GET', 'POST'])
@auth.requires_auth
def room(vnum):
    room = Room.query.filter_by(vnum=vnum).first()
    RoomForm = model_form(Room, base_class=FlaskForm, db_session=db.session)
    form = RoomForm(obj=room)

    if form.validate_on_submit():
        form.populate_obj(room)
        db.session.commit()
        flash("Saved!")

    return render_template("room.html", form=form, room=room)
