from main import db

from flask_sqlalchemy import SQLAlchemy


def getThingsOf(type, name):
    wizdata = (Wizdata.query
            .join(Player, Wizdata.player_id == Player.id)
            .join(Account, Account.account_id == Player.account_id)
            .filter(Account.name == name)
            ).first()

    blockaExisting = (type.query
            .filter(wizdata.blockastart <= type.vnum)
            .filter(type.vnum <= wizdata.blockaend)).all()

    blockbExisting = (type.query
            .filter(wizdata.blockbstart <= type.vnum)
            .filter(type.vnum <= wizdata.blockbend)).all()

    # It's possible that somebody has been assigned rooms that don't exist in Db
    # so let's generate them
    things = blockaExisting + blockbExisting
    existingVnums = set(map(lambda r: r.vnum, things))
    desiredVnums = set(list(range(wizdata.blockastart, wizdata.blockaend+1))
            + list(range(wizdata.blockbstart, wizdata.blockbend+1)))
    newVnums = desiredVnums.difference(existingVnums)
    for v in newVnums:
        r = type.create(v)
        things.append(r)
        db.session.add(r)
    db.session.commit()

    return things

def checkVnum(vnum, name):
    wizdata = (Wizdata.query
            .join(Player, Wizdata.player_id == Player.id)
            .join(Account, Account.account_id == Player.account_id)
            .filter(Account.name == name)
            ).first()
    
    inBlockA = wizdata.blockastart <= vnum and wizdata.blockaend >= vnum
    inBlockB = wizdata.blockbstart <= vnum and wizdata.blockbend >= vnum

    return inBlockA or inBlockB
        

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

    def create(vnum):
        return Room(vnum=vnum, x=0, y=0, z=0, name="", description="", zone=1, room_flag=0, sector=0, teletime=0, teletarg=0, telelook=0, river_speed=0, river_dir=0, capacity=0, height=0, spec=0)

    def getMy(name):
        return getThingsOf(Room, name)

    def canAccess(vnum, name):
        return checkVnum(vnum, name)

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


class Obj(db.Model):
    vnum = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    name = db.Column(db.String(127))
    short_desc = db.Column(db.String(127))
    long_desc = db.Column(db.String(255))
    action_desc = db.Column(db.String(255))
    type = db.Column(db.Integer)
    action_flag = db.Column(db.Integer)
    wear_flag = db.Column(db.Integer)
    val0 = db.Column(db.Integer)
    val1 = db.Column(db.Integer)
    val2 = db.Column(db.Integer)
    val3 = db.Column(db.Integer)
    weight = db.Column(db.Float)
    price = db.Column(db.Integer)
    can_be_seen = db.Column(db.Integer)
    spec_proc = db.Column(db.Integer)
    max_exist = db.Column(db.Integer)
    max_struct = db.Column(db.Integer)
    cur_struct = db.Column(db.Integer)
    decay = db.Column(db.Integer)
    volume = db.Column(db.Integer)
    material = db.Column(db.Integer)
    # objextra = db.relationship('objextra', backref='obj', lazy=True)
    # objaffect = db.relationship('objaffect', backref='obj', lazy=True)

    def create(vnum):
        return Obj(vnum=vnum, name="", short_desc="", long_desc="", action_desc="", type=0, action_flag=0, wear_flag=0, val0=0, val1=0, val2=0, val3=0, weight=0, price=0, can_be_seen=0, spec_proc=0, max_exist=9999, max_struct=0, cur_struct=0, decay=0, volume=0, material=0)

    def __repr__(self):
        return "<Name: {}>".format(self.name)

    def getMy(name):
        return getThingsOf(Obj, name)

    def canAccess(vnum, name):
        return checkVnum(vnum, name)


# class Objextra(db.Model):
#     vnum = db.Column(db.Integer, db.ForeignKey('obj.vnum'), unique=True, nullable=False, primary_key=True)
#     name = db.Column(db.String(127))
#     description = db.Column(db.Text)


# class Objaffect(db.Model):
#     vnum = db.Column(db.Integer, db.ForeignKey('obj.vnum'), unique=True, nullable=False, primary_key=True)
#     type = db.Column(db.Integer)
#     mod1 = db.Column(db.Integer)
#     mod2 = db.Column(db.Integer)


class Mob(db.Model):
    def __repr__(self):
        return "<Name: {}>".format(self.name)

    def getMy(name):
        return getThingsOf(Mob, name)

    def create(vnum):
        return Mob(vnum=vnum, name="", short_desc="", long_desc="", description="", actions=0, affects=0, faction=0, fact_perc=0, letter="", attacks=0, mob_class=0, level=0, tohit=0, ac=0, hpbonus=0, damage_level=0, damage_precision=0, gold=0, race=0, weight=0, height=0, str=0, bra=0, con=0, dex=0, agi=0, intel=0, wis=0, foc=0, per=0, cha=0, kar=0, spe=0, pos=0, def_position=0, sex=0, spec_proc=0, skin=0, vision=0, can_be_seen=0, max_exist=0, local_sound="", adjacent_sound="")

    vnum = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    name = db.Column(db.String(127))
    short_desc = db.Column(db.String(127))
    long_desc = db.Column(db.String(255))
    description = db.Column(db.Text)
    actions = db.Column(db.Integer)
    affects = db.Column(db.Integer)
    faction = db.Column(db.Integer)
    fact_perc = db.Column(db.Integer)
    letter = db.Column(db.String(1))
    attacks = db.Column(db.Float)
    mob_class = db.Column('class', db.Integer)
    level = db.Column(db.Integer)
    tohit = db.Column(db.Integer)
    ac = db.Column(db.Float)
    hpbonus = db.Column(db.Float)
    damage_level = db.Column(db.Float)
    damage_precision = db.Column(db.Integer)
    gold = db.Column(db.Integer)
    race = db.Column(db.Integer)
    weight = db.Column(db.Integer)
    height = db.Column(db.Integer)
    str = db.Column(db.Integer)
    bra = db.Column(db.Integer)
    con = db.Column(db.Integer)
    dex = db.Column(db.Integer)
    agi = db.Column(db.Integer)
    intel = db.Column(db.Integer)
    wis = db.Column(db.Integer)
    foc = db.Column(db.Integer)
    per = db.Column(db.Integer)
    cha = db.Column(db.Integer)
    kar = db.Column(db.Integer)
    spe = db.Column(db.Integer)
    pos = db.Column(db.Integer)
    def_position = db.Column(db.Integer)
    sex = db.Column(db.Integer)
    spec_proc = db.Column(db.Integer)
    skin = db.Column(db.Integer)
    vision = db.Column(db.Integer)
    can_be_seen = db.Column(db.Integer)
    max_exist = db.Column(db.Integer)
    local_sound = db.Column(db.String(255))
    adjacent_sound = db.Column(db.String(255))

    def canAccess(vnum, name):
        return checkVnum(vnum, name)


class Mob_extra(db.Model):
    vnum = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    keyword = db.Column(db.String(32))
    description = db.Column(db.String(255))


class Mob_imm(db.Model):
    vnum = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    type = db.Column(db.Integer)
    amt = db.Column(db.Integer)


class Mobresponses(db.Model):
    vnum = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    response = db.Column(db.Text)

