from pathlib import Path           
import os                         

def parse_zonefiles():
    path = Path(__file__).parent
    path_to_zonefiles = path / '..' / 'sneezymud' / 'lib' / 'zonefiles'
    print(f"Searching for zonefiles at: {path_to_zonefiles}")

    obj_loads = []
    mob_loads = []

    for file in os.listdir(path_to_zonefiles):
            cur_file = open(path_to_zonefiles / file,'r', encoding='utf-8', errors='ignore')
           # print(cur_file)

            lines = cur_file.readlines()
            lines = [[x for x in line.split()] for line in lines]
            for line in lines:
                if len(line) >= 5:
                    if line[0] == "O": obj_loads.append((int(line[4]), int(line[2])))
                    if line[0] == "M": mob_loads.append((int(line[4]), int(line[2])))

    return obj_loads, mob_loads

if __name__ == "__main__":

    parse_zonefiles()