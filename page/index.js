import express from "express";
import axios from "axios";
import env from "dotenv";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";

const app = express();
env.config();
const port = process.env.PORT;
const saltRounds = 10;
app.use(
	session({
		secret:process.env.SESSION_SECRET,
		resave:false,
		saveUninitialized:true,
		cookie:{
			maxAge:1000* 60 * 60 * 24,
		}
	})
);
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
	req.isAuthenticated() ? res.redirect("/home") : res.redirect("/login");
})
app.get("/home", (req, res) => {
	req.isAuthenticated() ? res.render("index.ejs") : res.redirect("/login");
});

app.get("/register", (req, res) => {
	res.render("signup.ejs");
});
app.get("/login", (req, res) => {
	res.render("login.ejs");
})

app.post("/login",
	passport.authenticate("local", {
		successRedirect:"/home",
		failureRedirect:"/login"
	})
);

app.get("/logout", (req, res) => {
	req.logout(function (err) {
		if(err) {
			return next(err);
		}
		res.redirect("/");
	})
});

app.post("/register", async (req, res) => {
	const { username, email, password, confirmpassword} = req.body;
	try {
		const checkResult = await axios.get(`http://localhost:3000/users?email=${encodeURIComponent(email)}`);
		const userExists = Array.isArray(checkResult.data.rows) ? checkResult.data.rows.length > 0 : false;
		if(userExists) {
			return res.redirect("/login");
		}
		if(password !== confirmpassword) {
			res.redirect("/register");	
		}
		const hashedPassword = await bcrypt.hash(password, saltRounds);
		const result = await axios.post("http://localhost:3000/users",{
				username,
				email,
				password:hashedPassword,
				confirmpassword:hashedPassword
		});
		const user = result.data;
		req.login(user, (err) => {
			if (err) {
				console.error("Login error:", err);
				return res.status(500).send("Error logging in");
			}			
			console.log("success");
			res.redirect("/home");
		});
	} catch (error) {
		console.log(error);
		res.status(500).json(error);
	}
});

passport.use("local",
	new Strategy(async function verify(email, password, cb) {
		try {
			const result = await axios.get(`http:localhost:3000/users?email=${encodeURIComponent(email)}`);
			console.log(result.data);
			if(result.data){
				const user = result.data;
				const storedHashedPassword = user.password;
				bcrypt.compare(password, storedHashedPassword, (err, valid) => {
					if(err) {
						console.log("Error comparing password:",err);
						return cb(err);
					} else {
						if(valid) {
							return cb(null, user);
						} else {
							return cb(null, false);
						}
					}
				});
			} else {
				alert("not found");
			}
		} catch (error) {
			console.log(error);
			res.status(500).json(error);
		}
	})
);

app.get("/episodes", async (req, res) => {
	try {
		const userid = 1;
		const result = await axios.get(`http://localhost:3000/users/${userid}/episodes`);
		res.send(JSON.stringify(result.data.rows));
	} catch (error) {
		console.log(error);
		res.status(500).json(error);
	}
});


passport.serializeUser((user, cb) => {
	cb(null, user);
});

passport.deserializeUser((user, cb) => {
	cb(null, user);
})

app.listen(port, () => {
	console.log("Server running on the port:",port);
})