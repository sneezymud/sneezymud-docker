import auth
from model import Player, Wizdata, Account, Room, Zone
from main import app, db

from flask import render_template, request
from sqlalchemy.sql import text


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
        inner join room r on (r.vnum between w.blockastart and w.blockaend or r.vnum between w.blockbstart and w.blockbend)
        where a.name = :name"""), name=request.authorization.username)
    print(res)
    return render_template("rooms.html", rooms=res)
