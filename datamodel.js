// data model: pig information type

const fs = require("fs");

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
}

module.exports = { Pig }