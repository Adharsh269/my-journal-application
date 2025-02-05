import express from "express";
import axios from "axios";
import env from "dotenv";

const app = express();
env.config();
const port = process.env.PORT;
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));

app.get("/", (req, res) => {
	res.render("index.ejs");
})

app.listen(port, () => {
	console.log("Server running on the port:",port);
})