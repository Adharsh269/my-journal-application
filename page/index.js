import express from "express";
import axios from "axios";
import env from "dotenv";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import e from "express";

const app = express();
env.config();
const port = process.env.PORT;
const saltRounds = process.env.SALTROUNDS;

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
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());


app.get("/", (req, res) => {
	req.isAuthenticated() ? res.redirect("/home") : res.redirect("/login");
})
app.get("/home", (req, res) => {
	// console.log(req.body);
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

app.get("/logout", (req, res, next) => {
	req.logout(function (err) {
		if(err) {
			return next(err);
		}
		res.redirect("/");
	})
});

app.post("/register", async (req, res) => {
	const { username, email, password } = req.body;
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
	new Strategy({usernameField: "email" }, async function verify(email, password, cb) {
		try {
			const result = await axios.get(`http://localhost:3000/users?email=${encodeURIComponent(email)}`);
			// console.log(result.data.rows);
			if(!result.data.rows){
				return cb(null, false, {message:"user not found"});
			}
			const user = result.data.rows[0];
			const storedHashedPassword = user.password;
			const isValid = bcrypt.compare(password, storedHashedPassword);
			if (!isValid) {
				return cb(null, false, {message:"Incorrect password"});
			}
			return cb(null, user);
		} catch (error) {
			console.log(error);
			return cb(error);
		}
	})
);

app.get("/episodes", async (req, res) => {
	if(req.isAuthenticated()) {
		try {
			const userid = req.user.id;
			console.log(req.user.id);
			const result = await axios.get(`http://localhost:3000/users/${userid}/episodes`);
			const episodes = result.data.rows?.[0].posts;
			res.render("thoughtsEpisodes.ejs",{episodes: episodes});
		} catch (error) {
			console.log(error);
			res.status(500).json(error);
		}
	} else {
		res.redirect("/login");
	}
});

app.get("/episodes/:id", async (req, res) => {
	if(req.isAuthenticated()) {
		const { id } = req.params;
		const userid = req.user.id;
		console.log(userid," ",id);
		try {
			const result = await axios.get(`http://localhost:3000/users/${userid}/episodes/${id}`);
			const episode = result.data[0];
			if(!result.data) {
				return res.status(404).send("Episode not found");
			}
			res.render("thoughtEpisode.ejs", 
				{episode : episode}
			)
		} catch (error) {
			console.log(error);
			res.status(500).json(error);
		}
	} else {
		res.redirect("/login");
	}
});

app.get("/account", (req, res) => {
	if(req.isAuthenticated()) {
		res.render("account.ejs", {user:req.user});
	} else {
		res.redirect("/login");
	}
});

app.get("/thoughts", async (req, res) => {
	if(req.isAuthenticated()) {
		try {
			const userid = req.user.id;
			const result = await axios.get(`http://localhost:3000/users/${userid}/thoughts`);
			const thoughts = result.data[0];
			// console.log(thoughts);
			res.render("thoughtsEpisodes.ejs",{thoughts: thoughts});
		} catch (error) {
			console.log(error);
			res.status(500).json(error);
		}
	} else {
		res.redirect("/login");
	}
});

app.get("/thoughts/:id", async (req, res) => {
	if(req.isAuthenticated()) {
		try {
			console.log(req.params.id);
			const id = req.params.id;
			const userid = req.user.id;
			const result = await axios.get(`http://localhost:3000/users/${userid}/thoughts/${id}`);
			const thought = result.data[0];
			// console.log(thought);
			if(!result.data) {
				return res.status(404).send("Thought not found");
			}
			res.render("thoughtEpisode.ejs",{thought: thought})
		} catch (error) {
			console.log(error);
			res.status(500).json(error);
			
		}
	} else {
		res.redirect("/login");
	}
});

app.get("/prompts", async (req, res) => {
	if(req.isAuthenticated()) {
		const userid = req.user.id;
		try {
			const result = await axios.get(`http://localhost:3000/users/${userid}/prompts`);
			const prompts = result.data[0];
			// console.log(prompts);
			res.render("promptsGoals.ejs",{prompts: prompts});
		} catch (error) {
			console.log(error);
			res.status(500).json(error);
			
		}
	} else {
		res.redirect("/login");
	}
});

app.get("/lifegoals", async (req, res) => {
	if(req.isAuthenticated()) {
		const userid = req.user.id;
		try {
			const result = await axios.get(`http://localhost:3000/users/${userid}/goals`);
			const goals = result.data[0];
			// console.log(goals);
			res.render("promptsGoals.ejs",{goals: goals});
		} catch (error) {
			console.log(error);
			res.status(500).json(error);
			
		}
	} else {
		res.redirect("/login");
	}
});

app.get("/todo", async (req, res) => {
	if(req.isAuthenticated()) {
		const userid = req.user.id;
		const result = await axios.get(`http://localhost:3000/users/${userid}/todo`);
		const todos = result.data[0];
		// console.log(todos);
		res.render("todo.ejs",{todos: todos})
	} else {
		res.redirect("/login");
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