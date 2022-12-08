//  THIS FILE IS SERVER IS USE FOR HANDLE, CONTROL AND INTERACTIVE WITH CLIENT (WEBSITE CLIENT)

// initialize library and object
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require('fs');
const snap7 = require('node-snap7');

require('dotenv').config();

const colors = require('colors');
const { info } = require('console');
colors.enable();

//#region s7 plc client

// initialize s7 PLC client and connect to PLC
var s7client = new snap7.S7Client();
s7client.ConnectTo('192.168.1.129', 0, 0, function(err) {
    if(err)
        return console.log((' >> Connection failed. Code #' + err + ' - ' + s7client.ErrorText(err)).red);
});

//#endregion

//#region fields

// initialize store array
let pigs = [];

let settingOffsets = { humidity_max: 0, humidity_min: 2, temp_max: 4, temp_min: 6, eating: 8, light_start: 10, light_stop: 12, time_eating_morning: 14, time_eating_lunch: 16, time_eating_dinner: 18, time_shower: 20, time_drinking: 22 };

let controlOffsets = { light: 0, fan_1: 1, fan_2: 2, heating_lamp: 3, pump_shower: 4, pump_drink: 5, food: 6, runing_status: 7, auto: 8, start: 9 }; // start, stop, auto, manual,...

let controlValues= [ '0', '0', '0', '0', '0', '0', '0', '0', '0' ]; // save 

let parameterValues = [0, 0, 0, 0]; // save temperature = [0], humidity = [0], m_food = [0], m_pig = [0]

//#endregion

//#region app, server and socket io

// use user interface in pigsty-ui for web app
app.use(express.static(__dirname + '/pigsty-ui'));
app.get('/', (req, res) => { res.sendFile(__dirname + '/pigsty-ui/index.html') });

// handle io socket connection event 
io.on('connection', function(socket) {
    console.log('A connection');

    loadData();
    updateControl();

    // handle io socket disconnection event 
    socket.on('disconnect', () => {
        userCount--;
        io.sockets.emit('userCount', {message:message});
        console.log('disconnect');

    });

    // handle input setting click event in setting
    socket.on('event-setting-click', data => {
        //console.log(data);
        setSettings(data.message.setting * 2, data.message.value);
    });

    // handle parameters control click event in manual
    socket.on('event-control-click', data => {
        //console.log(data);
        turnControl(data.offset);
    });

    // handle pig information save in pig input
    socket.on('event-save-click', data => {
        //console.log(data);

        var result = true;

        for(let item of pigs)
        {
           if (item.id == data.infor[0])
           {
                result = false;
                break;
           }
        }

        io.sockets.emit('feedback-save-click', { result:result });

        if (result)
        {
            let pig = { id: data.infor[0], weight: data.infor[1], date_add: data.infor[2], date_vaccin: data.infor[3] };

            pigs.push(pig);

            recordData();

            console.log(pig);
        }
    });

    // handle pig information output in pig information part
    socket.on('event-delete-click', data => {
        var result = false;
        if (data.idOutput != null)
        {
            var idx = pigs.findIndex(element => element.id == data.idOutput);
            if (idx >= 0)
            {
                pigs.splice(pigs[idx], 1);
                console.log(pigs);
                recordData();
                result = true;
            }
            else 
            {
                result = false;
            }
        }

        io.sockets.emit('feedback-delete-click', { result:result });
    });

    // handle event when scan rfid in id textbox in pig information part
    socket.on('event-get-infor', data => {
        console.log(data);

        var result = false;

        console.log(pigs);
        for(let item of pigs)
        {
            console.log(data.id);
            console.log(item.id);
           if (item.id == data.id)
           {
                result = item;
                break;
           }
        }

        io.sockets.emit('feedback-get-infor', { result:result });
    });


})

// server run at port, listen client connect to 8080 port (website "localhost:8080")
server.listen(process.env.PORT, () => console.log('Server is listening at port 8080..'));

//#endregion

//#region timer
// set timer to update data to client through parameter update event
setInterval(() => {

    var date_now = new Date();
    var result = date_now.getDate()+"/"+(date_now.getMonth()+1)+"/"+date_now.getFullYear();
    updateParameter();
    io.sockets.emit('event-update-parameter', { parameterValues:parameterValues, date_add:result });

}, 1000);

//#endregion

//#region pigs control

// store pig information to .txt file
function recordData()
{
    fs.writeFile(
        process.env.PATH_PIGS,
        JSON.stringify(pigs),
        function (err) {
            if (err)
                return console.error(err);
            else 
                return console.log("Write data successfully");
        }
    );
}

// load pig information in .txt file
function loadData()
{
    fs.readFile(process.env.PATH_PIGS, function (err, data) {
        if (err) {
            return console.error(err);
        }

        // if data is empty, read from txt file, else init..
        if (data != "")
        {
            var objects = JSON.parse(data);

            objects.forEach(element => {
            pigs.push(element);
            });

            console.log("Read pigs from txt");
            console.log(pigs);
        }
    });
}

// auto turn on or off in manual control from plc
function turnControl(controlOffset)
{
    if (!s7client.Connected())
    {
        console.log('>> PLC isn\'t connected is not connect'.red);
        return false;
    }

    var result = false;
    s7client.DBRead(Number(process.env.PLC_DB_CONTROL), Number(process.env.START_OFFSET), Number(process.env.SIZE_BYTE_ALL_CONTROL), function (err, data){
        if (err)
        {
            result = false;
            io.sockets.emit('feedback-control-click', { result:result });
            return console.log(('>> Read equipment status: failed - ' + s7client.ErrorText(err)).red);
        }
        console.log(data);

        var bin_values = bin2array(buffer2bin(data));
        controlValues[controlOffset] = bin_values[controlOffset] = bin_values[controlOffset] == '0' ? '1' : '0';
        var buffer_send = bin2buffer(bin_values.reverse().join(''));

        s7client.DBWrite(Number(process.env.PLC_DB_CONTROL), Number(process.env.START_OFFSET), Number(process.env.SIZE_BYTE_ALL_CONTROL), buffer_send, function (err) {
            if (err)
            {
                result = false;
                io.sockets.emit('feedback-control-click', { result:result });
                return console.log(('>> Change equipment status: failed - ' + err).red);
            }
            else 
            {
                result = controlValues[controlOffset];
                console.log('>> Change equipment status: successfully'.green);
                io.sockets.emit('feedback-control-click', { offset: controlOffset, value:result });
            }
        });

    });
    return result;
}

// udpate status of turning on or off in manual control at initialization from plc
function updateControl()
{
    if (!s7client.Connected())
    {
        console.log('>> PLC isn\'t connected is not connect'.red);
        return;
    }

    s7client.DBRead(Number(process.env.PLC_DB_CONTROL), Number(process.env.START_OFFSET), Number(process.env.SIZE_BYTE_ALL_CONTROL),
        function (err, data){
            if (err)
            {
                return console.log(('>> Read equipment status: failed - ' + s7client.ErrorText(err)).red);
            }

            var bin_values = bin2array(buffer2bin(data));

            controlValues = bin_values;
            
            io.sockets.emit('init-control', { controls:controlValues } );
        }
    );
}

// set parameter as eating, drinking, timer... to plc
function setSettings(settingOffset, value)
{
    if (!s7client.Connected())
    {
        console.log('>> PLC isn\'t connected is not connect'.red);
        return;
    }

    var buffer_send = Buffer.allocUnsafe(2);
    buffer_send.writeUInt16BE(value);
    console.log('Buffer Send:')
    console.log(buffer_send);

    s7client.DBWrite(Number(process.env.PLC_DB_SETTING), settingOffset, Number(process.env.SIZE_BYTE_SETTING), buffer_send, function (err) {
        if (err)
            console.log(('>> Set setting: failed - ' + err).red);
        else 
            console.log('>> Set setting: successfully'.green);
    });


}

// update parameter as temperature, humidity,.. from plc to update to client
function updateParameter()
{
    if (!s7client.Connected())
    {
        console.log('>> PLC isn\'t connected is not connect'.red);
        return;
    }

    s7client.DBRead(Number(process.env.PLC_DB_PARAMETER), Number(process.env.START_OFFSET), Number(process.env.SIZE_BYTE_ALL_PARAMETER),
        function (err, data){
            if (err)
            {
                return console.log(('>> Read equipment status: failed - ' + s7client.ErrorText(err)).red);
            }

            for (let i = 0; i < process.env.SIZE_BYTE_ALL_PARAMETER / 2; i++)
            {
                var buff = Buffer.from([data[i*2], data[i*2 + 1]]);

                parameterValues[i] = buff.readUInt16BE(0);
            }

            //... update to UI
        }
    );
}

//#endregion

//#region converts that serve encoder and decoder data to plc and from plc
function buffer2bin(buff)
{
    return buff.readUInt16LE().toString(2);
}

function bin2buffer(bin)
{
    var buff = Buffer.allocUnsafe(2);
    buff.writeUInt16LE(parseInt(bin, 2))
    return buff;
}

function bin2array(bin)
{
    var str = [];
    var enough = String(bin).length;
    str = bin.split("").reverse();
    if (enough < 9)
    {
        for (let i = 0; i < 9 - enough; i++)
        {
            str.push('0');
        }
    }
    return str;
}
//#endregion