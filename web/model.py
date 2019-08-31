from main import db

from flask_sqlalchemy import SQLAlchemy


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


class Account(db.Model):
    account_id = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    email = db.Column(db.String(80), nullable=True)
    passwd = db.Column(db.String(13), nullable=True)
    name = db.Column(db.String(80), nullable=True)
    birth = db.Column(db.Integer, nullable=True)
    term = db.Column(db.Integer, nullable=True)
    time_adjust = db.Column(db.Integer, nullable=True)
    flags = db.Column(db.Integer, nullable=True)
    last_logon = db.Column(db.Integer, nullable=True)
    multiplay_limit = db.Column(db.Integer)
    # players = db.relationship('Player', backref='Account', lazy=True, foreign_keys='account_id')

    def __repr__(self):
        return "<Name: {}>".format(self.name)

class Wizdata(db.Model):
    player_id = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    setsev = db.Column(db.Integer, nullable=True)
    office = db.Column(db.Integer, nullable=True)
    blockastart = db.Column(db.Integer, nullable=True)
    blockaend = db.Column(db.Integer, nullable=True)
    blockbstart = db.Column(db.Integer, nullable=True)
    blockbend = db.Column(db.Integer, nullable=True)

    def __repr__(self):
        return "<Id: {}>".format(self.player_id)

class Room(db.Model):
    vnum = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    x = db.Column(db.Integer)
    y = db.Column(db.Integer)
    z = db.Column(db.Integer)
    name = db.Column(db.String(127))
    description = db.Column(db.String())
    zone = db.Column(db.Integer)
    room_flag = db.Column(db.Integer)
    sector = db.Column(db.Integer)
    teletime = db.Column(db.Integer)
    teletarg = db.Column(db.Integer)
    telelook = db.Column(db.Integer)
    river_speed = db.Column(db.Integer)
    river_dir = db.Column(db.Integer)
    capacity = db.Column(db.Integer)
    height = db.Column(db.Integer)
    spec = db.Column(db.Integer)

    def __repr__(self):
        return "<Name: {}>".format(self.name)

    def getRoomsOf(name):
        wizdata = (Wizdata.query
                .join(Player, Wizdata.player_id == Player.id)
                .join(Account, Account.account_id == Player.account_id)
                .filter(Account.name == name)
                ).first()

        blockaExisting = (Room.query
                .filter(wizdata.blockastart <= Room.vnum)
                .filter(Room.vnum <= wizdata.blockaend)).all()

        blockbExisting = (Room.query
                .filter(wizdata.blockbstart <= Room.vnum)
                .filter(Room.vnum <= wizdata.blockbend)).all()

        # It's possible that somebody has been assigned rooms that don't exist in Db
        # so let's generate them
        rooms = blockaExisting + blockbExisting
        existingVnums = set(map(lambda r: r.vnum, rooms))
        desiredVnums = set(list(range(wizdata.blockastart, wizdata.blockaend+1))
                + list(range(wizdata.blockbstart, wizdata.blockbend+1)))
        newVnums = desiredVnums.difference(existingVnums)
        for v in newVnums:
            r = Room(vnum=v, x=0, y=0, z=0, name="", description="", zone=1, room_flag=0, sector=0, teletime=0, teletarg=0, telelook=0, river_speed=0, river_dir=0, capacity=0, height=0, spec=0)
            rooms.append(r)
            db.session.add(r)
        db.session.commit()

        return rooms

class Player(db.Model):
    id = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    name = db.Column(db.String(80))
    talens = db.Column(db.Integer)
    title = db.Column(db.String())
    account_id = db.Column(db.Integer)
    guild_id = db.Column(db.Integer)
    guildrank = db.Column(db.Integer)
    load_room = db.Column(db.Integer)
    last_logon = db.Column(db.Integer)
    nutrition = db.Column(db.Integer)

    def __repr__(self):
        return "<Name: {}>".format(self.name)
