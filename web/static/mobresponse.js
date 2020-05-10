var MobResponses = function () {
  var mobResponseJsonElem = document.getElementById('mobResponseJson');
  var mobResponses = JSON.parse(mobResponseJsonElem.innerText);
  console.debug(mobResponses);
  var actionElem = document.getElementById('action');
  var addBtn = document.getElementById('addNewResponse');
  var editBtn = document.getElementById('editResponse');

  function onEditMobresponseSelected() {
    function enable() {
      actionElem.removeAttribute('disabled');
      editBtn.removeAttribute('disabled');
      addBtn.removeAttribute('disabled');
    }

    function disable() {
      actionElem.setAttribute('disabled', true);
      editBtn.setAttribute('disabled', true);
      addBtn.setAttribute('disabled', true);
    }

    var inputValue = inputElem.value;
    console.debug(inputValue);

    if (inputValue === '') {
      disable();
      actionElem.value = '';
      return;
    }

    if (!/^\w+ "[^"]*"/.test(inputValue)) {
      disable();
      actionElem.value = 'Please provide a trigger and parameter, like this:\nsay "hi"';
      return;
    }

    var trigger = inputValue.split(' ', 1)[0];
    var param = '"' + inputValue.split('"')[1] + '"';

    // existing trigger?
    if (mobResponses[trigger] !== undefined && mobResponses[trigger][param] !== undefined) {
      var theseResponses = mobResponses[trigger][param]
      console.debug(theseResponses);
      if (theseResponses.length == 1) {
        actionElem.value = theseResponses[0].join(';\n');
        enable()
      } else {
        disable();
        actionElem.value = "There are multiple responses for this trigger. Please edit the mobresponse file directly below.";
      }
    } else {
      // new trigger
      enable();
      actionElem.value = '';
    }
  }

  var inputElem = document.getElementById('trigger');
  inputElem.addEventListener('input', onEditMobresponseSelected);
  onEditMobresponseSelected();
}()
