require('dotenv').config()
const app = require("./app");
const PORT = process.env.PORT || 3000;
const {init} = require('./connection');
// const {getResponse, analyzeSentiment} = require('./services/llm')

init().then(() => {
    app.listen(PORT, async () => {
        console.log("Server Running on port", PORT);
        // console.log(await getResponse("How many planets are there in solar system"));
        // console.log(await analyzeSentiment("It is a very sad day"));
    });
})