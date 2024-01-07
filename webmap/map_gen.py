# map_gen - originally written by kyt on discord, modified by Dash
# TODO: room markers - up/down/teleport/death/etc


from peewee import MySQLDatabase, Model, CharField, IntegerField, ForeignKeyField
import svgwrite
from collections import deque 
import roomdata, zonedata, mobdata
import time
import json
from pathlib import Path

sneezy = MySQLDatabase("sneezy", host="sneezy-db", port=3306, user="sneezy", password="password")
#immortal = MySQLDatabase("immortal", host="localhost", port=3306, user="sneezy", password="password")
path = Path(__file__).parent

ROOM_UNVISITED = -1
ROOM_QUEUED = 0
ROOM_VISITED = 1

INF = 1000000 # something big idk
ORIGIN = 100 # Center Square

# Entry points to assign to places that can only be reached through portal/teleport
# room VNUM, absolute (True/False), coordinates
# absolute = True will position the target room at that location on the map
# absolute = False will position the target room relative to the origin
PORTALS = {
    11004:  [True, (82, 68, 3)],    # Cimean Cloud City
    11090:  [False, (0,0,-1)],      # Cimean Cloud City
    5131:   [False, (0,0,-1)],      # Grimhaven Sewers
    5116:   [False, (0,0,-1)],      # Grimhaven Sewers         
    9070:   [False, (0,0,1)],       # Galek Church Attic
    9081:   [False, (0,-1,0)],      # Galek Church Attic
    9092:   [False, (0,0,1)],       # Galek Church Attic
    531:    [False, (0,0,1)],       # Mage Academy Observatory
    9550:   [False, (0,0,-1)],      # Mage Academy Training Room
    9551:   [False, (0,0,-1)],      # Mage Academy Training Room
    9553:   [False, (0,0,-1)],      # Mage Academy Training Room
    9554:   [False, (0,0,-1)],      # Mage Academy Training Room
    9555:   [False, (0,0,-1)],      # Mage Academy Training Room
    4648:   [False, (0,0,-1)],      # East Gate Settlement, Private Office
    31399:  [False, (-1,1,0)],      # Small Hut
    28999:  [False, (0,0,-1)],      # Trolloc Infested Farmsteads
    28997:  [False, (0,-1,0)],      # Trolloc Infested Farmsteads
    23310:  [False, (0,0,-1)],      # Dark Ant Tunnels
    15901:  [False, (0,0,-1)],      # Inside the Well
    15905:  [False, (0,0,-1)],      # Inside the Well
    16456:  [False, (0,0,-1)],      # Brightmoon Town Sewers
    15995:  [False, (0,0,1)],       # Brightmoon Library
    1386:   [False, (0,-1,0)],      # Brightmoon
    1385:   [False, (0,0,-1)],      # Brightmoon
    15446:  [False, (0,0,-1)],      # Abanos's Farm
    15284:  [False, (0,1,0)],       # Poacher Camp
    34034:  [False, (-1,0,0)],      # Synpathian Mountain Camp
    15329:  [False, (0,0,-1)],      # Rancher Saloon
    25299:  [False, (0,0,-1)],      # Prarie Camp
    45362:  [False, (-1,1,0)],      # Kalysian Aqueducts
    25609:  [False, (0,-6,1)],      # Atakaji Desert
    25650:  [False, (-2,-2,1)],     # Atakaji Desert
    45490:  [False, (0,1,0)],       # Parnithian Tomb
    45518:  [False, (1,0,0)],       # Parnithian Tomb
    9612:   [False, (1,0,0)],       # Hold of Smuggler's Ship
    
    #12351: [False, (30,-30,0)],   # Inverse GH Cottage from GH park?  This just breaks things
    11835:  [False, (0,30,0)],      # Inverse Grimhaven
    27500:  [True, (109, -70, 0)],  # Vella Island
    27790:  [False, (9,0,0)],       # Vella Island Portals T1
    27791:  [False, (0,1,0)],       # Vella Island Portals T2
    27792:  [False, (1,0,0)],
    27793:  [False, (0,-1,0)],
    27794:  [False, (1,1,0)],       # Vella Island Portals T3
    27795:  [False, (-1,1,0)],
    27796:  [False, (1,-1,0)],
    27797:  [False, (-1,-1,0)],
    27798:  [False, (1,-1,0)],
    27799:  [False, (1,1,0)],
    27709:  [False, (1,0,0)],       # Vella Island Shack
    27695:  [False, (-2,2,0)],      # Vella Island Shack
    23288:  [False, (0,-1,0)],      # Arden Forest Shack
    5700:   [True, (-100,166,0)],   # Aurian Valley
    6800:   [True, (25,25,1)],      # The Circle
    4856:   [False, (-1,1,0)],      # Aerie
    45434:  [False, (0,0,-1)],      # Troll Excavation Site
    45465:  [False, (0,-1,0)],      # Troll Excavation Extension
    45466:  [False, (0,0,-1)],       # Troll Excavation Extension
    11328:  [False, (0,1,0)],       # The Ancient Malithean Mines
    11327:  [False, (0,1,0)],       # The Ancient Malithean Mines

    31401: [True, (-115, -69, 0)], # Dracolich Lair
    31411: [False, (2, -4, 0)], # Dracolich Lair
    31415: [False, (-4, 1, 0)], # Dracolich Lair
    31423: [False, (0, -5, 0)], # Dracolich Lair
    31430: [False, (-2, -5, 0)], # Dracolich Lair

    16709: [False, (0,-1,0)],   # Player House

    7524: [False, (0,0,-1)],    # Temple of the Unicorn

    26885: [False, (0,-1,1)],   # Usurped Faction Mansion

    #12351: [False, (30,-30,0)],   # Inverse GH Cottage from GH park?

    # The Pattern.  Kill me now.
    3061: [False, (5,0,0)],
    3062: [False, (5,0,0)],
    3063: [False, (5,0,0)],
    3064: [False, (5,0,0)],
    3065: [False, (5,0,0)],
    3066: [False, (5,0,0)],
    3067: [False, (5,0,0)],
    3068: [False, (5,0,0)],
    3073: [False, (5,0,0)],
    3074: [False, (5,0,0)],
    3075: [False, (5,0,0)],
    3076: [False, (5,0,0)],
    3077: [False, (5,0,0)],
    3078: [False, (5,0,0)],
    3079: [False, (5,0,0)],
    3080: [False, (5,0,0)],
    3095: [False, (5,0,0)],
    3099: [False, (5,0,0)],

}

DO_NOT_ENTER = [ # Entry points that cause issues in the map
        10360,  # 94 - Lost mines - non-euclidian entrance to area
    ]

# map parameters
MAP_BORDER = 10
ROOM_SIZE = 10
ROOM_BORDER = 1
EXIT_SIZE = 6
RIVER_MARKER_SIZE = 1.5
TRAINER_SIZE = 3
PORTAL_SIZE = 3

Z_SHIFT_Y = -4 # how many pixels to shift the up/down layers
Z_SHIFT_X = 2

class Room(Model):
    vnum = IntegerField(primary_key=True)
    name = CharField()
    zone = IntegerField()
    room_flag = IntegerField()
    description = CharField()
    sector = IntegerField()
    river_speed = IntegerField()
    river_dir = IntegerField()
    teletime = IntegerField()
    teletarg = IntegerField()
    telelook = IntegerField()

    class Meta:
        database = sneezy

class Obj(Model):
    vnum = IntegerField(primary_key=True)
    name = CharField()
    type = IntegerField()
    val0 = IntegerField()
    long_desc = CharField()
    short_desc = CharField()

    class Meta:
        database = sneezy

class Mob(Model):
    vnum = IntegerField(primary_key=True)
    short_desc = CharField()
    level = IntegerField()
    spec_proc = IntegerField()

    class Meta:
        database = sneezy

class RoomExit(Model):
    vnum = IntegerField(primary_key=True)
    author = ForeignKeyField(Room, backref="exits", db_column="vnum")
    name = CharField()
    type = IntegerField()
    direction = IntegerField()
    destination = IntegerField()
    description = CharField()

    class Meta:
        database = sneezy

class Zone(Model):
    zone_nr = IntegerField(primary_key=True)
    zone_name = CharField()
    zone_enabled = IntegerField()
    bottom = IntegerField()
    top = IntegerField()

    class Meta:
        database = sneezy

def generate_map():
    timer = time.time()
    rooms = get_rooms()
    print("Data loading took", time.time() - timer, "seconds")

    timer = time.time()
    mapped_rooms, bounds, zone_report = map_rooms(rooms, ORIGIN)
    print("Graph traversal took ", time.time() - timer, "seconds")

    
    timer = time.time()
    draw_map(mapped_rooms, rooms, bounds, zone_report)
    print("Drawing map took ", time.time() - timer, "seconds")
    print("Finished.")
    # (rooms, exits) = position_rooms()
    # (min_x, min_y, max_x, max_y) = normalize(rooms, exits)
    # draw_map(rooms, exits, max_x - min_x + 1, max_y - min_y + 1)

def get_rooms():
    sneezy.connect()
    print("Loading room data...")
    query = (Room.select(Room, Zone).join(Zone, on=((Room.vnum >= Zone.bottom) & (Room.vnum <= Zone.top))).filter(Zone.zone_enabled==1)).objects()

    rooms = {}

    for room in query:
        room.exits = []
        room.coords = (None, None, None) # x, y, z
        room.local_coords = (None, None, None) # x, y, z
        room.entry_coords = (None, None, None) # x, y, z
        room.visited = ROOM_UNVISITED
        room.d = float('inf')
        room.π = None
        room.overlap = False
        room.flags = roomdata.parseRoomFlags(room.room_flag)
        room.portals = []
        room.trainers = []
        rooms[room.vnum] = room

    print(f"...Loaded %d rooms from SQL." % (len(rooms)))

    print("Loading exit data...")
    exits = (RoomExit.select()).objects()

    for exit in exits:
        if exit.vnum in rooms and exit.destination in rooms:
            zone_exit = False
            if rooms[exit.vnum].zone_nr != rooms[exit.destination].zone_nr:
                zone_exit = True
            rooms[exit.vnum].exits.append(
                {
                    'origin': exit.vnum, 
                    'destination':exit.destination, 
                    'name':exit.name, 
                    'direction':exit.direction, 
                    'type':exit.type, 
                    'description':exit.description, 
                    'zone_exit':zone_exit, 
                    'euclidian':'non-euclidian',
                    'ret': None,
                    'drawn': False}
                )
    
    print(f"...Loaded %d exits from SQL." % (len(exits)))
    
    print("Loading portal data...")
    portals = (Obj.select().filter(Obj.type==32)).objects()
    for portal in portals:
        portal.target = extract_bits(portal.val0, 24, 1)
        #print(portal.name, portal.vnum, portal.target, portal.long_desc)
    portals = {portal.vnum:portal for portal in portals}

    print("Loading mob data...")
    mobs = (Mob.select()).objects()
    trainer_mobs = []
    for mob in mobs:
        if mob.spec_proc in mobdata.trainerDict:
            mob.trainer = mobdata.trainerDict[mob.spec_proc]
            trainer_mobs.append(mob)
            #print(f"[{mob.vnum}] {mob.short_desc} ({mob.trainer['name']}, {mob.level})")
    trainer_mobs = {mob.vnum:mob for mob in trainer_mobs}
    

    print("Loading zone spawn data...")
    obj_loads, mob_loads = zonedata.parse_zonefiles()
    for obj in obj_loads:
        #print(obj)
        if obj[0] in rooms and obj[1] in portals:# and portals[obj[1]].target in rooms:         
            #print(f"portal {portals[obj[1]]} spawn noted in room {rooms[obj[0]].name}")
            rooms[obj[0]].portals.append(portals[obj[1]])
    for mob in mob_loads:
        if mob[0] in rooms and mob[1] in trainer_mobs:
            #print(f"trainer/gm {trainer_mobs[mob[1]].trainer['name']} {trainer_mobs[mob[1]].level}spawn noted in room {rooms[mob[0]].name}")
            rooms[mob[0]].trainers.append(trainer_mobs[mob[1]])

    return rooms

def map_rooms(rooms, origin):

    max = [-float('inf'),-float('inf'),-float('inf')]
    min = [float('inf'),float('inf'),float('inf')]

    room_queue = deque()
    zone_queue = deque()
    portal_queue = deque()

    for vnum,portal in PORTALS.items():
        # make sure we visit the absolute locations
        if portal[0] == True:
            portal_queue.append(rooms[vnum])

    rooms[origin].coords = (0, 0, 0)
    rooms[origin].local_coords = (0, 0, 0)
    rooms[origin].entry_coords = (0, 0, 0)
    rooms[origin].d = 0
    
    zone_queue.append(rooms[origin])

    coordinate_map = {}
    sorted_rooms = []

    while len(zone_queue) != 0 or len(portal_queue) != 0:
        if len(zone_queue) == 0:
            # zone queue empty, pop a room from the portal stack and add it to the zone queue
            portal_target = rooms[portal_queue.popleft().vnum]

            if portal_target.visited == ROOM_VISITED:
                continue

            if portal_target.vnum in PORTALS:
                if PORTALS[portal_target.vnum][0]:
                    portal_target.entry_coords = PORTALS[portal_target.vnum][1]
                else:
                    portal_target.entry_coords = tuple(map(sum, zip(portal_target.entry_coords, PORTALS[portal_target.vnum][1])))
                #print(f"Trying to enter portal: {portal_target.name} [{portal_target.vnum}] in {portal_target.zone_name} with coords {portal_target.entry_coords}")
                zone_queue.append(portal_target)
            else:
                print(f"Portal needs output location: {portal_target.name} [{portal_target.vnum}] in {portal_target.zone_name} from coords {portal_target.entry_coords}")
                continue

        zone_queue = sorted(zone_queue, key=lambda item: item.d, reverse=True)
        entry_room = zone_queue.pop()
        if entry_room.visited != ROOM_VISITED and entry_room.vnum not in DO_NOT_ENTER:

            entry_room.coords = entry_room.entry_coords
            entry_room.local_coords = (0, 0, 0)
            room_queue.append(entry_room)
            #print(f"Using entrypoint to zone {entry_room.zone_nr} {entry_room.zone_name} [{entry_room.vnum}] {entry_room.entry_coords}")
                    
        while len(room_queue)  != 0:
            cur_room = room_queue.popleft()
            #print(f"Visiting %s - %s [%d] %s" % (cur_room.zone_name, cur_room.name, cur_room.vnum, cur_room.coords))
            for exit in cur_room.exits:
                if exit['destination'] < 100:
                    # skip links to imm rooms
                    continue
                reverse_exit = False
                return_exit = False
                for ret_exit in rooms[exit['destination']].exits:
                    if ret_exit['direction'] == reverse_direction(exit['direction']) and ret_exit['destination'] == cur_room.vnum:
                        exit['euclidian'] = 'euclidian'
                        exit['ret'] = ret_exit
                        reverse_exit = True
                        return_exit = True
                    elif ret_exit['direction'] == reverse_direction(exit['direction']) and exit['euclidian'] != 'euclidian':
                        exit['euclidian'] = 'non-reversible'
                        reverse_exit = True
                    elif ret_exit['destination'] == cur_room.vnum and exit['euclidian'] != 'euclidian':
                        exit['euclidian'] = 'one-way'
                        return_exit = True
                # if not reverse_exit and not return_exit:
                #     print(f'One-way exit from %s [%d]: %s' % (cur_room.name, cur_room.vnum, exit)) 
                # elif not return_exit:
                #     print(f'No return from %s [%d]: %s' % (cur_room.name, cur_room.vnum, exit)) 
                # elif not reverse_exit:
                #     print(f'Twisted return from %s [%d]: %s' % (cur_room.name, cur_room.vnum, exit)) 
                        
                # if exit['destination']==100:
                #     print(f'CS exit from %s [%d]: %s' % (cur_room.name, cur_room.vnum, exit))  

                if rooms[exit['destination']].visited == ROOM_UNVISITED:
                    if exit['zone_exit']:
                        rooms[exit['destination']].entry_coords = calc_new_coord(cur_room.coords, exit['direction'])
                        rooms[exit['destination']].d = cur_room.d+1
                        rooms[exit['destination']].π = cur_room
                        zone_queue.append(rooms[exit['destination']])
                        #print(f"adding entrypoint to zone {rooms[exit['destination']].zone_nr} {rooms[exit['destination']].zone_name} [{rooms[exit['destination']].vnum}] {rooms[exit['destination']].entry_coords}")
                    else: 
                        rooms[exit['destination']].visited = ROOM_QUEUED
                        rooms[exit['destination']].d = cur_room.d+1
                        rooms[exit['destination']].π = cur_room
                        rooms[exit['destination']].coords = calc_new_coord(cur_room.coords, exit['direction'])
                        rooms[exit['destination']].local_coords = calc_new_coord(cur_room.local_coords, exit['direction'])
                        room_queue.append(rooms[exit['destination']])
            
            # Queue up any portals that spawn in our room
            for portal in cur_room.portals:
                if portal.target not in rooms or rooms[portal.target].visited == ROOM_VISITED: continue
                #print(f"Portal to unlinked room {rooms[portal.target].name} [{portal.target}] in {rooms[portal.target].zone_name} from coords {cur_room.coords}")
                rooms[portal.target].entry_coords = cur_room.coords
                rooms[portal.target].d = cur_room.d+1
                rooms[portal.target].π = cur_room
                if rooms[portal.target] not in portal_queue:
                    portal_queue.append(rooms[portal.target])

            # Queue up any teleport destinations from this room, but ignore selfdirected teleports
            if cur_room.teletarg > 0 and cur_room.teletarg != cur_room.vnum:
                if cur_room.teletarg not in rooms or rooms[cur_room.teletarg].visited == ROOM_VISITED: 
                    ...
                else:
                    #print(f"Teleport to unlinked room {rooms[portal.target].name} [{portal.target}] in {rooms[portal.target].zone_name} from coords {cur_room.coords}")
                    rooms[cur_room.teletarg].entry_coords = cur_room.coords
                    rooms[cur_room.teletarg].d = cur_room.d+1
                    rooms[cur_room.teletarg].π = cur_room
                    if rooms[cur_room.teletarg] not in portal_queue:
                        portal_queue.append(rooms[cur_room.teletarg])

            cur_room.visited = ROOM_VISITED
            sorted_rooms.append(cur_room)
            if cur_room.coords in coordinate_map:
                coordinate_map[cur_room.coords].append(cur_room)
                for room in coordinate_map[cur_room.coords]:
                    room.overlap = True
                #print("overlap at", cur_room.coords, [f"%s [%d]" % (room.name, room.vnum) for room in coordinate_map[cur_room.coords]])
            else: 
                coordinate_map[cur_room.coords] = []
                coordinate_map[cur_room.coords].append(cur_room)
                for i in range(3):
                    if max[i] < cur_room.coords[i]: max[i] = cur_room.coords[i]
                    if min[i] > cur_room.coords[i]: min[i] = cur_room.coords[i]

            
    print("Bounding Box:", min, max)
    bounds = (min, max)

    # now, sort the coordinate map by z, so we draw the lowest levels first
    sorted_rooms = sorted(sorted_rooms, key=lambda item: item.coords[2])

    #count linked vs unlinked rooms in each zone to see if we're missing anything big
    zone_report = {}
    for r in rooms:
        room = rooms[r]
        if room.zone_nr not in zone_report:
            zone = {
                'nr': room.zone_nr,
                'name':room.zone_name, 
                'room_count':0, 
                'unlinked':0, 
                'x_max':-INF,
                'y_max':-INF,
                'x_min':INF,
                'y_min':INF,
                'z_min':INF,
                'z_max':-INF
                }
            zone_report[room.zone_nr] = zone
        zone_report[room.zone_nr]['room_count'] += 1 
        if room.visited == ROOM_VISITED:
            if zone_report[room.zone_nr]['x_max'] < room.coords[0]: zone_report[room.zone_nr]['x_max'] = room.coords[0]
            if zone_report[room.zone_nr]['x_min'] > room.coords[0]: zone_report[room.zone_nr]['x_min'] = room.coords[0]
            if zone_report[room.zone_nr]['y_max'] < room.coords[1]: zone_report[room.zone_nr]['y_max'] = room.coords[1]
            if zone_report[room.zone_nr]['y_min'] > room.coords[1]: zone_report[room.zone_nr]['y_min'] = room.coords[1]
            if zone_report[room.zone_nr]['z_max'] < room.coords[2]: zone_report[room.zone_nr]['z_max'] = room.coords[2]
            if zone_report[room.zone_nr]['z_min'] > room.coords[2]: zone_report[room.zone_nr]['z_min'] = room.coords[2]

        if room.visited != ROOM_VISITED:
            zone_report[room.zone_nr]['unlinked'] += 1 
    for zone in zone_report:
        perc = int(100*zone_report[zone]['unlinked']/zone_report[zone]['room_count'])
        zone_report[zone]['linked']=zone_report[zone]['room_count']-zone_report[zone]['unlinked']
        if perc > 10 or zone_report[zone]['unlinked'] > 5:
            #print(f"Zone {zone} ({int(100*zone_report[zone]['unlinked']/zone_report[zone]['room_count'])}%) [{zone_report[zone]['name']}]: {zone_report[zone]['unlinked']}/{zone_report[zone]['room_count']} unlinked")
            ...

    #zone_report = {zone:report for zone,report in zone_report.items() if report['linked']>0}

    with open(path / 'static/data/zones.json', 'w') as f:
        json.dump(zone_report, f)
    
    return sorted_rooms, bounds, zone_report

def draw_map(mapped_rooms, rooms, bounds, zone_report):
    print("Drawing map...")

    x_dims = bounds[1][0] - bounds[0][0]
    y_dims = bounds[1][1] - bounds[0][1]
    z_dims = bounds[1][2] - bounds[0][2]

    map_width = x_dims * (ROOM_SIZE + EXIT_SIZE) + (MAP_BORDER * 2) + abs(z_dims * Z_SHIFT_X)
    map_height = y_dims * (ROOM_SIZE + EXIT_SIZE) + MAP_BORDER * 2 + abs(z_dims * Z_SHIFT_Y)

    svg = svgwrite.Drawing(
        path / "static/data/map.svg",
        size=(
            f"{map_width}px",
            f"{map_height}px",
        ),
    )


    svg_groups = {}
    svg_group_ct = {}
    for z_index in range(bounds[0][2],bounds[1][2]+1):
        svg_groups[z_index] = {}
        svg_group_ct[z_index] = {}
        for zone in zone_report:
            svg_groups[z_index][zone_report[zone]['nr']] = svg.g(id=f"zone{zone_report[zone]['nr']}level{z_index}", class_=f"zonelevel zone{zone_report[zone]['nr']} level{z_index}")
            svg_group_ct[z_index][zone_report[zone]['nr']] = 0


    # first draw zone bounds
    for zn,zone in zone_report.items():
        draw_zone_bounds(svg, zone, bounds, rooms)

    # this is kind of gnarly, but we want to draw starting from bottom to top:
    # all the exits for a z-level
    # then all the rooms for a z-level
    # I'd like to refactor this so we're not looping so many times, but eh
    for z_index in range(bounds[0][2],bounds[1][2]+1):
        # draw non euclidian exits
        for room in mapped_rooms:
            if room.coords[2] == z_index:
                # draw the non-euclidian exits first
                for exit in room.exits:
                    if exit['destination'] < 100:
                        # skip links to imm rooms
                        continue
                    if exit['euclidian'] == "non-euclidian":
                        draw_exit(svg_groups[z_index][room.zone_nr], svg, rooms, exit, bounds)
                        svg_group_ct[z_index][room.zone_nr] += 1
        # draw euclidian exits
        for room in mapped_rooms:
            if room.coords[2] == z_index:
                # draw the non-euclidian exits first
                for exit in room.exits:
                    if exit['destination'] < 100:
                        # skip links to imm rooms
                        continue
                    if exit['euclidian'] != "non-euclidian":
                        draw_exit(svg_groups[z_index][room.zone_nr], svg, rooms, exit, bounds)
                        svg_group_ct[z_index][room.zone_nr] += 1
        # draw rooms
        for room in mapped_rooms:
            if room.coords[2] == z_index:
                draw_room(svg_groups[z_index][room.zone_nr], svg, rooms, room, bounds)
                svg_group_ct[z_index][room.zone_nr] += 1
        # draw portal/teleport links        
        for room in mapped_rooms:
            if room.coords[2] == z_index:
                draw_portal_connections(svg_groups[z_index][room.zone_nr], svg, rooms, room, bounds)
                svg_group_ct[z_index][room.zone_nr] += 1

    for z_index in range(bounds[0][2],bounds[1][2]+1):
        for zone in zone_report:
            if svg_group_ct[z_index][zone_report[zone]['nr']] >0:
                svg.add(svg_groups[z_index][zone_report[zone]['nr']])
    
    svg.save()

def draw_zone_bounds(svg, zone, bounds, rooms):
    min_x, min_y = get_room_map_coords((zone['x_min'], zone['y_min'], 0), bounds)
    max_x, max_y = get_room_map_coords((zone['x_max'], zone['y_max'], 0), bounds)
    min_x = min_x + Z_SHIFT_X * zone['z_min']
    min_y = min_y + Z_SHIFT_Y * zone['z_max']
    max_x = max_x + Z_SHIFT_X * zone['z_max']
    max_y = max_y + Z_SHIFT_Y * zone['z_min']

    zone_class=f"mapelement zoneextent{zone['nr']} zoneextent"
    desc = zone['name']

    rect = svg.rect(
        id=f"zoneextent{zone['nr']}",
        class_=zone_class,
        insert=(min_x-EXIT_SIZE,min_y-EXIT_SIZE,),
        size=(max_x-min_x+ROOM_SIZE+2*EXIT_SIZE, max_y-min_y+ROOM_SIZE+2*EXIT_SIZE),
        stroke=("black"),
        stroke_width=0,
        fill="darkkhaki",
    )
    rect.set_desc(title=desc)
    svg.add(rect)


def draw_portal_connections(g, svg, rooms, room, bounds):
    map_x, map_y = get_room_map_coords(room.coords, bounds)
    start_x = map_x + ROOM_SIZE/2 
    start_y = map_y + ROOM_SIZE/2 

    if room.teletarg > 0 and room.teletarg != room.vnum and rooms[room.teletarg].coords != (None, None, None):
        end_x, end_y = get_room_map_coords(rooms[room.teletarg].coords, bounds)
        end_x = end_x + ROOM_SIZE/2 
        end_y = end_y + ROOM_SIZE/2 

        class_=f"mapelement zlevel{room.coords[2]} zone{room.zone_nr} from{room.vnum} teleportpath"

        connection = svg.line(
            class_=class_,
            start=(start_x,start_y,),
            end=(end_x,end_y,),
            stroke="green",
            stroke_width=1,
            stroke_dasharray="3,3",
        )
        connection.set_desc(title=f"Teleport to {rooms[room.teletarg].name} [{room.teletarg}]")
        g.add(connection)

    for portal in room.portals:
        if portal.target in rooms and rooms[portal.target].coords != (None, None, None):

            end_x, end_y = get_room_map_coords(rooms[portal.target].coords, bounds)
            end_x = end_x + ROOM_SIZE/2 
            end_y = end_y + ROOM_SIZE/2 

            
            class_=f"mapelement zlevel{room.coords[2]} zone{room.zone_nr} from{room.vnum} portalpath"

            connection = svg.line(
                class_=class_,
                start=(start_x,start_y,),
                end=(end_x,end_y,),
                stroke="purple",
                stroke_width=1,
                stroke_dasharray="3,3",
            )
            connection.set_desc(title=f"Portal to {rooms[portal.target].name} [{portal.target}]")
            g.add(connection)



def draw_exit(g, svg, rooms, exit, bounds):
    if exit['direction'] == 4 or exit['direction'] == 5: return # we don't draw up/down this way

    if exit['drawn'] == True and not exit['zone_exit']: return #we already drew this exit from the other side

    origin_x, origin_y = get_room_map_coords(rooms[exit['origin']].coords, bounds)
    dest_x, dest_y = get_room_map_coords(rooms[exit['destination']].coords, bounds)
    origin_x, origin_y = get_exit_map_coords(origin_x, origin_y, exit['direction'])
    dest_x, dest_y = get_exit_map_coords(dest_x, dest_y, reverse_direction(exit['direction']))

    stroke = "2"
    color = "black"
    if roomdata.exitTypes[exit['type']] in ["DOOR", "TRAPDOOR", "DRAWBRIDGE", "PANEL", "SCREEN", "HATCH"]: color = "brown"
    if roomdata.exitTypes[exit['type']] in ["GATE", "GRATE", "PORTCULLIS", "RUBBLE"]: color = "gray"
    if exit['euclidian'] == 'euclidian': color = "black"
    if exit['euclidian'] == 'non-euclidian': color = "red"
    if exit['euclidian'] == 'one-way': color = "darkred"
    if exit['euclidian'] == 'non-reversible': color = "darkred"

    # we need to calculate 3 line segments:
    #   the cardinal exit from this room
    #   the cardinal entrance to the next room and
    #   the (dashed? dotted?) line segment connecting them 
    # that said, doing this for EVERY connection greatly enlarges the load time of the map.
    # so we'll check for complex exits that don't wind up where we expect

    expected_coords = calc_new_coord(rooms[exit['origin']].coords, exit['direction'])
    actual_coords = rooms[exit['destination']].coords

    class_ = f"mapelement zlevel{rooms[exit['origin']].coords[2]} zone{rooms[exit['origin']].zone_nr} exit"
    if expected_coords == actual_coords:
        # draw the simple exit
        line = svg.line(
            class_=class_,
            start=(origin_x,origin_y,),
            end=(dest_x,dest_y,),
            stroke=color,
            stroke_width=stroke,
        )

        g.add(line)
    else:
        # draw the complex exit
        origin_stub_x, origin_stub_y = get_exit_stub_map_coords(origin_x, origin_y, exit['direction'])
        dest_stub_x, dest_stub_y = get_exit_stub_map_coords(dest_x, dest_y, reverse_direction(exit['direction']))

        origin_stub = svg.line(
            class_=class_,
            start=(origin_x,origin_y,),
            end=(origin_stub_x,origin_stub_y,),
            stroke=color,
            stroke_width=stroke,
        )
        dest_stub = svg.line(
            class_=class_,
            start=(dest_stub_x,dest_stub_y,),
            end=(dest_x,dest_y,),
            stroke=color,
            stroke_width=stroke,
        )
        stub_connection = svg.line(
            class_=class_,
            start=(dest_stub_x,dest_stub_y,),
            end=(origin_stub_x,origin_stub_y,),
            stroke=color,
            stroke_width=1,
            stroke_dasharray="1,1",
        )
        g.add(stub_connection)
        g.add(dest_stub)
        g.add(origin_stub)
    exit['drawn'] = True
    if exit['ret'] != None:
        exit['ret']['drawn'] = True

def draw_room(g, svg, rooms, room, bounds):
    map_x, map_y = get_room_map_coords(room.coords, bounds)

    room_class=f"mapelement zlevel{room.coords[2]} zone{room.zone_nr} vnum{room.vnum}"

    rect = svg.rect(
        id=f"{room.vnum}",
        class_=room_class,
        insert=(map_x,map_y,),
        size=(ROOM_SIZE, ROOM_SIZE),
        stroke=("black"),
        stroke_width=ROOM_BORDER,
        fill=roomdata.sectorDataFromID(room.sector)['color'],
    )
    rect.set_desc(
        title=f"[{room.vnum}] {room.name} {room.coords} \n{room.zone_name}\n{room.flags if len(room.flags)>0 else ''}\n{room.description}")

    g.add(rect)

    # draw a blue directional arrow in a room with a river flow setting
    if room.river_speed > 0:
        draw_river_flow(g, svg, room, bounds, room_class)

    # draw up/down markers
    for exit in room.exits:
        x = map_x + ROOM_SIZE/2 
        y = map_y + ROOM_SIZE/2 
        r = ROOM_SIZE/6
        if exit['direction'] == 4: # up
            ax, ay = x-r, y-1
            bx, by = x+r, y-1
            cx, cy = x, y-r-1
            marker = svg.polyline(
                points=[(bx,by),(cx,cy),(ax,ay)],
                class_=f"{room_class} up",
                fill='black',
                stroke="black",
                stroke_width="0",
            )
            g.add(marker)
        if exit['direction'] == 5: # down
            ax, ay = x-r, y+1
            bx, by = x+r, y+1
            cx, cy = x, y+r+1
            marker = svg.polyline(
                points=[(bx,by),(cx,cy),(ax,ay)],
                class_=f"{room_class} down",
                fill='black',
                stroke="black",
                stroke_width="0",
            )
            g.add(marker)

    # draw a black X in a room flagged for instant DEATH
    if "DEATH" in room.flags:
        s_x_1, s_y_1 = get_internal_room_coords(map_x, map_y, 6)
        e_x_1, e_y_1 = get_internal_room_coords(map_x, map_y, 9)
        s_x_2, s_y_2 = get_internal_room_coords(map_x, map_y, 7)
        e_x_2, e_y_2 = get_internal_room_coords(map_x, map_y, 8)
        line_1 = svg.line(
            start=(s_x_1,s_y_1,),
            end=(e_x_1,e_y_1,),
            class_=f"{room_class} death",
            stroke="black",
            stroke_width="1",
            fill="black",
        )
        line_2 = svg.line(
            start=(s_x_2,s_y_2,),
            end=(e_x_2,e_y_2,),
            class_=room_class,
            stroke="black",
            stroke_width="1",
            fill="black",
        )
        g.add(line_1)
        g.add(line_2)
    
    # draw a green square in a room with a teleport
    if room.teletarg > 0 and room.teletarg != room.vnum:
        x = map_x + ROOM_SIZE/2 - PORTAL_SIZE/2
        y = map_y + ROOM_SIZE/2 - PORTAL_SIZE/2 

        rect = svg.rect(
            insert=(x,y,),
            size=(PORTAL_SIZE, PORTAL_SIZE),
            class_=f"{room_class} portal",
            stroke=("darkgreen"),
            stroke_width="1",
            fill="green",
        )
        rect.set_desc(title=f"Teleport to {rooms[room.teletarg].name} [{room.teletarg}] ({room.telelook}, {room.teletime})")
        g.add(rect)

    # draw a gold circle in a room with a trainer/gm
    if len(room.trainers) > 0:
        x = map_x + ROOM_SIZE/2 
        y = map_y + ROOM_SIZE/2 
        r = TRAINER_SIZE/2

        circle = svg.circle(
            center=(x,y),
            r=r,
            class_=f"{room_class} trainer",
            stroke="goldenrod",
            stroke_width=1,
            fill="gold",
        )
        trainer = room.trainers[0]
        circle.set_desc(title=f"L{trainer.level} {trainer.trainer['name']}: {trainer.short_desc}")
        g.add(circle)

    # draw a purple square in a room with a portal
    if len(room.portals) > 0:
        x = map_x + ROOM_SIZE/2 - PORTAL_SIZE/2
        y = map_y + ROOM_SIZE/2 - PORTAL_SIZE/2 

        rect = svg.rect(
            insert=(x,y,),
            size=(PORTAL_SIZE, PORTAL_SIZE),
            class_=f"{room_class} portal",
            stroke=("indigo"),
            stroke_width="1",
            fill="orchid",
        )
        portal_strings = [f"{portal.short_desc} to {rooms[portal.target].name if portal.target in rooms else portal.target}" for portal in room.portals]
        rect.set_desc(title=f"Passage {portal_strings}")
        g.add(rect)

# Helper functions

def draw_river_flow(g, svg, room, bounds, room_class):
    direction = room.river_dir
    if direction in [0,1,2,3,6,7,8,9]:
        x, y = get_room_map_coords(room.coords, bounds)
        ax,ay = bx,by = cx,cy = get_exit_map_coords(x, y, direction)
        # "north", "east", "south", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"
        if direction == 0: 
            bx = ax-RIVER_MARKER_SIZE*0.7
            by = ay+RIVER_MARKER_SIZE*2
            cx = ax+RIVER_MARKER_SIZE*0.7
            cy = ay+RIVER_MARKER_SIZE*2 
        if direction == 1: 
            bx = ax-RIVER_MARKER_SIZE*2
            by = ay+RIVER_MARKER_SIZE*0.7
            cx = ax-RIVER_MARKER_SIZE*2
            cy = ay-RIVER_MARKER_SIZE*0.7 
        if direction == 2: 
            bx = ax-RIVER_MARKER_SIZE*0.7
            by = ay-RIVER_MARKER_SIZE*2
            cx = ax+RIVER_MARKER_SIZE*0.7
            cy = ay-RIVER_MARKER_SIZE*2 
        if direction == 3: 
            bx = ax+RIVER_MARKER_SIZE*2
            by = ay+RIVER_MARKER_SIZE*0.7
            cx = ax+RIVER_MARKER_SIZE*2
            cy = ay-RIVER_MARKER_SIZE*0.7 
        # we don't do 4/5 up/down
        if direction == 6: 
            bx = ax-RIVER_MARKER_SIZE*2
            by = ay+RIVER_MARKER_SIZE*1
            cx = ax-RIVER_MARKER_SIZE*1
            cy = ay+RIVER_MARKER_SIZE*2 
        if direction == 7: 
            bx = ax+RIVER_MARKER_SIZE*2
            by = ay+RIVER_MARKER_SIZE*1
            cx = ax+RIVER_MARKER_SIZE*1
            cy = ay+RIVER_MARKER_SIZE*2 
        if direction == 8: 
            bx = ax-RIVER_MARKER_SIZE*2
            by = ay-RIVER_MARKER_SIZE*1
            cx = ax-RIVER_MARKER_SIZE*1
            cy = ay-RIVER_MARKER_SIZE*2 
        if direction == 9: 
            bx = ax+RIVER_MARKER_SIZE*2
            by = ay-RIVER_MARKER_SIZE*1
            cx = ax+RIVER_MARKER_SIZE*1
            cy = ay-RIVER_MARKER_SIZE*2 

        marker = svg.polyline(
            points=[(bx,by),(ax,ay),(cx,cy)],
            class_=room_class,
            fill='none',
            stroke="lightblue",
            stroke_width="1",
        )
        marker.set_desc(title=f"Speed: {room.river_speed}")

        g.add(marker)

def extract_bits(number, k, p):   
    return ( ((1 << k) - 1)  &  (number >> (p-1) ) )

def get_room_center_coords(x, y):
    return x+(ROOM_SIZE/2), y+(ROOM_SIZE/2)

def get_internal_room_coords(x, y, direction):
    # "north", "east", "south", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"
    if direction == 0: return x+(ROOM_SIZE/2), y+(ROOM_SIZE/4)
    if direction == 1: return x+ROOM_SIZE-(ROOM_SIZE/4), y+(ROOM_SIZE/2)
    if direction == 2: return x+(ROOM_SIZE/2), y+ROOM_SIZE-(ROOM_SIZE/4)
    if direction == 3: return x+(ROOM_SIZE/4), y+(ROOM_SIZE/2)
    # we don't do 4/5 up/down
    if direction == 6: return x+ROOM_SIZE-(ROOM_SIZE/3), y+(ROOM_SIZE/3)
    if direction == 7: return x+(ROOM_SIZE/3), y+(ROOM_SIZE/3)
    if direction == 8: return x+ROOM_SIZE-(ROOM_SIZE/3), y+ROOM_SIZE-(ROOM_SIZE/3)
    if direction == 9: return x+(ROOM_SIZE/3), y+ROOM_SIZE-(ROOM_SIZE/3)

def get_exit_stub_map_coords(x, y, direction):
    # "north", "east", "south", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"
    if direction == 0: return x, y-(EXIT_SIZE/2)
    if direction == 1: return x+(EXIT_SIZE/2), y
    if direction == 2: return x, y+(EXIT_SIZE/2)
    if direction == 3: return x-(EXIT_SIZE/2), y
    # we don't do 4/5 up/down
    if direction == 6: return x+(EXIT_SIZE/2), y-(EXIT_SIZE/2)
    if direction == 7: return x-(EXIT_SIZE/2), y-(EXIT_SIZE/2)
    if direction == 8: return x+(EXIT_SIZE/2), y+(EXIT_SIZE/2)
    if direction == 9: return x-(EXIT_SIZE/2), y+(EXIT_SIZE/2)

def get_exit_map_coords(x, y, direction):
    # "north", "east", "south", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"
    if direction == 0: return x+(ROOM_SIZE/2), y
    if direction == 1: return x+ROOM_SIZE, y+(ROOM_SIZE/2)
    if direction == 2: return x+(ROOM_SIZE/2), y+ROOM_SIZE
    if direction == 3: return x, y+(ROOM_SIZE/2)
    # we don't do 4/5 up/down
    if direction == 6: return x+ROOM_SIZE, y
    if direction == 7: return x, y
    if direction == 8: return x+ROOM_SIZE, y+ROOM_SIZE
    if direction == 9: return x, y+ROOM_SIZE

def get_room_map_coords(coords, bounds):
    x, y, z = normalize_coords(coords, bounds)
    map_x = x * (ROOM_SIZE + EXIT_SIZE) + (MAP_BORDER) + (z * Z_SHIFT_X)
    map_y = y * (ROOM_SIZE + EXIT_SIZE) + (MAP_BORDER) + (z * Z_SHIFT_Y)
    return map_x, map_y

def normalize_coords(coords, bounds):
        # normalize coords
    x = coords[0] - bounds[0][0]
    y = coords[1] - bounds[0][1]
    z = coords[2]
    return x, y, z

def calc_new_coord(coords, direction):
    # "north", "east", "south", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"
    translations = [
        (0,-1,0),
        (1,0,0),
        (0,1,0),
        (-1,0,0),
        (0,0,1),
        (0,0,-1),
        (1,-1,0),
        (-1,-1,0),
        (1,1,0),
        (-1,1,0)
        ]
    
    return tuple(map(sum, zip(coords, translations[direction])))

def reverse_direction(direction):
    # useful for determining return exits
    reverse = [2, 3, 0, 1, 5, 4, 9, 8, 7, 6]
    return reverse[direction]

if __name__ == "__main__":
    generate_map()