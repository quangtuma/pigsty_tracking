// THIS FILE WILL BE USED IN INDEX.HTML FOR DISPLAYING AND INTERFACE WITH USER

//#region intialization
var socket = io();

let settingOffsets = { humidity_max: 0, humidity_min: 1, temp_max: 2, temp_min: 3, eating: 4, light_start: 5, light_stop: 6, time_eating_morning: 7, time_eating_lunch: 8, time_eating_dinner: 9 };

let controlStatus = [ '0', '0', '0', '0', '0', '0', '0', '0', '0' ];
//#endregion

//#region select element from user interface
var parameter_temp = document.querySelector("#parameter-temp");
var parameter_humi = document.querySelector("#parameter-humi");
var parameter_weight = document.querySelector("#input-weight");
var parameter_food = document.querySelector("#parameter-food");

var settings_inputs = document.querySelectorAll("[id^='setting-']");
var settings_buttons = document.querySelectorAll("[id^='button-setting-']");

var control_buttons = document.querySelectorAll("[id^='button-control-']");

var input_button = document.querySelector('#button-input');
var pig_inputs = document.querySelectorAll("[id^='input-']");

var pig_infor = document.querySelectorAll("[id^='infor-']");

var img_light = document.querySelector("#img-light");
var img_heating = document.querySelector("#img-heating");
var img_fan1 = document.querySelector("#img-fan-1");
var img_fan2 = document.querySelector("#img-fan-2");
var img_shower = document.querySelectorAll("[id^='img-shower-']");
var img_drink = document.querySelector("#img-drink");
var img_food = document.querySelector("#img-food");

var input_date_add = document.querySelector("#input-date-add");
var input_date_vaccin = document.querySelector("#input-date-vaccin");
//#endregion

// set event listeners from elements on user interface
function setAddEventListeners(){

    // setting button
    for (let i = 0; i < settings_buttons.length; i++)
        settings_buttons[i].addEventListener('click', function() {

            if (settings_inputs[i].value === "")
            {
                return alert('Please insert before confirm');
            }

            var message = { setting: i, value: settings_inputs[i].value };

            socket.emit('event-setting-click', { message:message });
    });
    
    // manual button
    for (let i = 0; i < control_buttons.length; i++)
        control_buttons[i].addEventListener('click', function() {

            var message = { manual: i };

            //changeControl(i);

            socket.emit('event-control-click', { offset:message.manual });
    });

    // input pig information button
    input_button.addEventListener('click', function(e) {
        e.preventDefault();
        var infor = [];
        for (let item of pig_inputs)
        {
            if (item.value == "")
                return alert('Please input fully pig tracking information');
            infor.push(item.value);
        }

        socket.emit('event-save-click', { infor:infor });

    });
    
    // input ID to textbox
    pig_infor[0].addEventListener('input', function(){
        if (pig_infor[0].value.length == 10)
        {
            socket.emit('event-get-infor', { id:pig_infor[0].value });

            socket.on('feedback-get-infor', function(data) {
                console.log(data);
                if (data.result === false)
                    return alert('There is no information in the card');
                pig_infor[1].value = data.result.weight;
                pig_infor[2].value = data.result.date_add;
                pig_infor[3].value = data.result.date_vaccin;
            });
        }
        else {
            pig_infor[1].value = pig_infor[2].value = pig_infor[3].value = "";
        }
    });
}

setAddEventListeners();

// change button status
function changeControl(i)
{
    var replace = "", search = "";
    if (controlStatus[i] == '0')
    {
        control_buttons[i].className = "pigsty-tracking-button";

        if (i < 7)
        {
            replace = "Bật";
            search = "Tắt";
        }
        switch (i)
        {
            case 0:
                img_heating.src = "public/playground_assets/emojionemonotonelightbulb411-3tbs.svg";
                break;
            case 1:
                img_fan1.src = "public/playground_assets/vector1041-foff24.svg";
                break;
            case 2:
                img_fan2.src = "public/playground_assets/vector1041-foff24.svg";
                break;
            case 3:
                img_light.src = "public/playground_assets/emojionemonotonelightbulb411-3tbs.svg";
                break;
            case 4: 
                img_shower.forEach(element => {
                    element.src = "public/playground_assets/cilshower-off.svg";
                });
                break;
            case 5:
                img_drink.src = "public/playground_assets/mditap.svg";
                break;
            case 6:
                img_food.src = "public/playground_assets/rectangle-food.svg"
                break;
            case 7: 
                control_buttons[i].textContent = "AUTO";
                break;
            case 8:
                control_buttons[i].textContent = "START";
                break;
            default:
                break;
        }
    } 
    else 
    {
        control_buttons[i].className = "pigsty-tracking-button-off";

        if (i < 7)
        {
            replace = "Tắt";
            search = "Bật";
        }
        switch (i)
        {
            case 0:
                img_heating.src = "public/playground_assets/emojionelightbulb413-te19.svg";
                break;
            case 1:
                img_fan1.src = "public/playground_assets/vector1041-fo24.svg";
                break;
            case 2:
                img_fan2.src = "public/playground_assets/vector1041-fo24.svg";
                break;
            case 3:
                img_light.src = "public/playground_assets/emojionelightbulb413-te19.svg";
                break;
            case 4:
                img_shower.forEach(element => {
                    element.src = "public/playground_assets/cilshower-on.svg";
                });
                break;
            case 5:
                img_drink.src = "public/playground_assets/mditap-on.svg";
                break;
            case 6:
                img_food.src = "public/playground_assets/rectangle-food-on.svg"
                break;
            case 7:
                control_buttons[i].textContent = "MANUAL";
                break;
            case 8:
                control_buttons[i].textContent = "STOP";
                break;
            default:
                break;
        }
    }

    if (i < 7) control_buttons[i].textContent = control_buttons[i].textContent.replace(search, replace);
}

// event that receive data for event-save-click
socket.on('feedback-save-click', function(data) {
    console.log(data);
    data.result ? alert('Save successfully') : alert ('ID already exists');
});

// event that receive data for event-control-click
socket.on('feedback-control-click', function(data) {
    console.log(data);
    if (data.result != false)
    {
        controlStatus[data.offset] = String(data.value);
        changeControl(data.offset);
    }
    else
        alert('Please check PLC connection before using manual');
});

// event that receive data for button status initialization
socket.on('init-control', function(data) {
    console.log(data);
    controlStatus = data.controls;
    for (let i = 0; i < controlStatus.length; i++){
        changeControl(i);
    }
});

// event that receive data for parameter udpating to display
socket.on('event-update-parameter', function(data) { 
    console.log(data);
    var array = data.parameterValues;
    parameter_humi.textContent = array[0];
    parameter_temp.textContent = array[1];
    parameter_food.textContent = array[2];
    parameter_weight.value = array[3] > 5 ? array[3] : null;

    if (array[3] > 5) input_date_add.value = String(data.date_add);
});