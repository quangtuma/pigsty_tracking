// data model

const fs = require("fs");

let PATH = "Pigs Information.txt";

class Pig
{
    constructor(id, weight, date_add, date_vaccin)
    {
        this.id = id; this.weight = weight; this.date_add = date_add, this.date_vaccin = date_vaccin;
    }

    toJson()
    {
        return JSON.stringify(this);
    }

    writeInfor()
    {
        fs.writeFile(
            PATH, 
            this.toJson(),
            function(err)
            {
                if (err) {
                    return console.error(err);
                }
            }
        );
    }

    readInfor(id)
    {
        fs.readFile(
            PATH,
            function(err, data)
            {
                if (err)
                {
                    return console.error(err);
                }

                console.log(data);
            }
        );
    }
}

module.exports = { Pig }