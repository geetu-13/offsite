require('dotenv').config()
const app = require("./app");
const PORT = process.env.PORT || 3000;
const {init} = require('./connection');

init().then(() => {
    app.listen(PORT, async () => {
        console.log("Server Running on port", PORT);
    });
})