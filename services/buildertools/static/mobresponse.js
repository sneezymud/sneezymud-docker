var MobResponses = function () {
  var mobResponseJsonElem = document.getElementById('mobResponseJson');
  var mobResponses = JSON.parse(mobResponseJsonElem.innerText);
  console.debug(mobResponses);
  var actionElem = document.getElementById('action');
  var addBtn = document.getElementById('addNewResponse');
  var editBtn = document.getElementById('editResponse');

  function enableEditing() {
    actionElem.removeAttribute('disabled');
    editBtn.removeAttribute('disabled');
    addBtn.removeAttribute('disabled');
  }

  function disableEditing() {
    actionElem.setAttribute('disabled', true);
    editBtn.setAttribute('disabled', true);
    addBtn.setAttribute('disabled', true);
  }

  function onEditMobresponseSelected() {
    var inputValue = inputElem.value;

    if (inputValue === '') {
      disableEditing();
      actionElem.value = '';
      return;
    }

    if (!/^\w+ "[^"]*"/.test(inputValue)) {
      disableEditing();
      actionElem.value = 'Please provide a trigger and parameter, like this:\nsay "hi"';
      return;
    }

    var trigger = inputValue.split(' ', 1)[0];
    var param = '"' + inputValue.split('"')[1] + '"';

    // existing trigger?
    if (mobResponses[trigger] !== undefined && mobResponses[trigger][param] !== undefined) {
      var theseResponses = mobResponses[trigger][param];
      console.debug(theseResponses);
      populateResponsesDropdow(theseResponses);
    } else {
      // new trigger
      enableEditing();
      actionElem.value = '';
    }
  }

  function clearDropdown(dd) {
    // cloneNode is non-recursive by default, so we just drop children in one go.
    dd.parentElement.replaceChild(dd.cloneNode(), dd);
    console.log("cleared DD");
  }

  function populateResponsesDropdow(responses) {
    clearDropdown(document.getElementById('responseVariant'));
    var dropdown = document.getElementById('responseVariant');

    var itemsInDropdown = 0;
    function addToDropdown(variant) {
      var option = document.createElement("option");
      ++itemsInDropdown;
      option.text = itemsInDropdown.toString();
      option.value = itemsInDropdown.toString();
      dropdown.appendChild(option);
      console.log("Appended " + option.value);
    }

    if (responses.length == 1) {
      actionElem.value = responses[0].join(';\n') + ';';
    } else {
      responses.forEach(addToDropdown);
    }

    dropdown.onchange = function (event) {
      var idx = event.target.value - 1;
      var text = responses[idx];
      actionElem.value = text.join(';\n') + ';';
    }
    var event = new Event('change');
    dropdown.dispatchEvent(event);
    enableEditing();
  }

  var inputElem = document.getElementById('trigger');
  inputElem.addEventListener('input', onEditMobresponseSelected);
  onEditMobresponseSelected();
}()
