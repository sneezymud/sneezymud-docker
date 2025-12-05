import auth
import json
from pprint import pprint
from model import Player, Wizdata, Account, Room, Zone, Obj, Mob, Mobresponses, getOwnedVnums, getBlockForVnum, Roomexit, getPlayerName
from main import app, db

from flask import render_template, request, flash
from sqlalchemy.sql import text

from flask_wtf import FlaskForm
from wtforms import StringField
from wtforms.validators import DataRequired
from wtforms_sqlalchemy.orm import model_form

# TODO: figure out how to lazily create objects
# TODO: for every slightest action, this bloody thing causes a million DB requests.

@app.route("/")
@auth.requires_auth
def home():
    return render_template("home.html")

def log(*args, **kwargs):
    print("↓"*50)
    print(*args, **kwargs)
    print("↑"*50)


@app.route("/zones")
@auth.requires_auth
def zones():
    zones = Zone.query.all()
    return render_template("zones.html", zones=zones)


@app.route("/rooms", methods=['GET', 'POST'])
@auth.requires_auth
def rooms():
    name = getPlayerName(request.authorization.username)
    if request.method == 'GET':
        # Layoutificator getting map data for graphical display
        if request.headers.get('Content-Type') == 'application/json':
            return jsonifyRooms(Room.getMy(name), Roomexit.getMy(name))
        # List of rooms for individual editing
        else:
            return render_template("list.html", type='room', things=Room.getMy(name))
    # Layoutificator sending map data
    elif request.method == 'POST':
        return sendRoomsToDb(request.json)

@app.route("/objs")
@auth.requires_auth
def objects():
    name = getPlayerName(request.authorization.username)
    return render_template("list.html", type='obj', things=Obj.getMy(name))

@app.route("/mobs")
@auth.requires_auth
def mobs():
    name = getPlayerName(request.authorization.username)
    return render_template("list.html", type='mob', things=Mob.getMy(name))

@app.route('/room/<int:vnum>', methods=['GET', 'POST'])
@auth.requires_auth
def room(vnum):
    name = getPlayerName(request.authorization.username)
    return edit(vnum, Room, 'room.html', name, backlink='rooms')

@app.route('/obj/<int:vnum>', methods=['GET', 'POST'])
@auth.requires_auth
def obj(vnum):
    name = getPlayerName(request.authorization.username)
    return edit(vnum, Obj, 'obj.html', name, backlink='objs')


@app.route('/mob/<int:vnum>', methods=['GET', 'POST'])
@auth.requires_auth
def mob(vnum):
    name = getPlayerName(request.authorization.username)
    return edit(vnum, Mob, 'mob.html', name, backlink='mobs')


@app.route('/mobresponse/<int:vnum>', methods=['GET', 'POST'])
@auth.requires_auth
def mobresponse(vnum):
    name = getPlayerName(request.authorization.username)
    responses = Mobresponses.parseTriggersFromMobResponse(vnum)
    extraData = {"responses": responses, "responsesJson": json.dumps(responses)}

    return edit(vnum, Mobresponses, 'mobresponse.html', name, backlink='mob/{vnum}'.format(vnum=vnum), extraData=extraData)


def edit(vnum, Thing, template, name, backlink, extraData=None):
    if not Thing.canAccess(vnum, name):
        return render_template("badaccess.html")

    thing = Thing.query.filter_by(vnum=vnum).first()
    if thing is None:
        thing = Thing.create(vnum, name)
        db.session.add(thing)

    Form = model_form(Thing, base_class=FlaskForm, db_session=db.session)
    form = Form(obj=thing)

    if form.validate_on_submit():
        form.populate_obj(thing)
        thing.owner = getPlayerName(request.authorization.username)
        db.session.commit()
        flash("Saved!")

    return render_template(template, form=form, vnum=vnum, thing=thing, backlink=backlink, extraData=extraData)


def jsonifyRooms(rooms, exits):
    roomDict = {}
    for room in rooms:
        roomDict[room.vnum] = dict(x=room.x, y=-room.y, z=room.z)
    exitDict = {}
    for exit in exits:
        if exit.vnum not in exitDict:
            exitDict[exit.vnum] = {}
        exitDict[exit.vnum][exit.direction] = {'tgt': exit.destination}

    return json.dumps(dict(rooms=roomDict, exits=exitDict))


# This function runs 10 DB queries, not counting begin/commit. Yummy.
def sendRoomsToDb(fromSvg):
    name = getPlayerName(request.authorization.username)
    rooms = fromSvg['rooms']
    exits = fromSvg['exits']
    ownedVnums = getOwnedVnums(name)
    if len(rooms) > len(ownedVnums):
        return "You tried to save {tried} rooms, but you only have {available} rooms available".format(tried=len(rooms), available=len(ownedVnums)), 400

    # map rooms to available vnums
    # we should somehow calculate xyz coords based on exits pointing into this area, but this is probably not the right place
    vnumMapping = {}
    newRooms = {}
    for (room, vnum) in zip(rooms, ownedVnums):
        newRooms[vnum] = rooms[room]
        vnumMapping[room] = vnum
    newExits = {}
    for sourceRoom in exits:
        for direction in exits[sourceRoom]:
            if vnumMapping[sourceRoom] not in newExits:
                newExits[vnumMapping[sourceRoom]] = {}
            newExits[vnumMapping[sourceRoom]][int(direction)] = {'tgt': vnumMapping[exits[sourceRoom][direction]['tgt']]}

    # for side effect of creating the rooms
    for vnum in newRooms:
        dbRoom = Room.query.filter(Room.vnum == vnum).first()
        dbRoom.x = newRooms[vnum]['x']
        dbRoom.y = -newRooms[vnum]['y']
        dbRoom.block = getBlockForVnum(name, vnum)
        if 'z' in newRooms[vnum]:
            dbRoom.z = newRooms[vnum]['z']

    # ... and finally generate exits.
    Roomexit.deleteOf(vnumMapping.values())
    for sourceRoom in newExits:
        for direction in newExits[sourceRoom]:
            ex = Roomexit.create(
                    owner=name,
                    vnum=sourceRoom,
                    direction=direction,
                    destination=newExits[sourceRoom][direction]['tgt'],
                    block=getBlockForVnum(name, sourceRoom)
                    )
            db.session.add(ex)

    db.session.commit()
    return "Saved", 201
