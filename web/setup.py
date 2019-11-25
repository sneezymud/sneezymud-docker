import os
import uuid

def inputStr(id, value):
    # what happens if a room has " in name?
    return '<input type="text" id="{id}" value="{value}" />'.format(id=id, value=value)

def setup(app):
    createSecret(app)
    app.jinja_env.globals.update(inputStr=inputStr)
    app.jinja_env.globals.update(renderAsForm=renderAsForm)


def createSecret(app):
    def read():
        with open('secretkey', 'r') as file:
            app.secret_key = file.read()

    def write():
        with open('secretkey', 'w') as file:
            file.write(str(uuid.uuid4()))

    try:
        read()
    except FileNotFoundError:
        write()
        read()

    if len(app.secret_key) < 8:
        write()
        read()

# unused, broken
def renderAsForm(model, form):
    out = form.hidden_tag() + """
        <div class="ib">
          <fieldset>
            <div class="grid">
              {elems}
            </div>
            <input type="submit" value="Save" />
            <button type="button" ><a href="/">Cancel</a></button>
          </fieldset>
        </div>
    """
    suppressedKeys = dict(metadata=1, query=1, query_class=1)
    elems = ""
    for key in dir(model):
        if key[0] != '_' and key not in suppressedKeys:
            val = getattr(model, key)
            elems += str(key) + "=" + str(val) + "<br />\n"
    elems = str(form._fields)
    return elems

