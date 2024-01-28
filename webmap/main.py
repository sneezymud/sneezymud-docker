from flask import Flask, send_file
from flask import render_template, request, flash
import logging

from map_gen import generate_map

app = Flask(__name__)

# regenerate the map when flask is fired up.
# this can be commented out, but the map_gen.py will need to be run manually
generate_map()

@app.route("/")
def home():
    return send_file("./index.html")

if __name__ == "__main__":
    print("Starting")
    app.run(host="0.0.0.0", debug=True)