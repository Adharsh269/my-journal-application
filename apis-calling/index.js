import express from "express";
import env from "dotenv";
import pg from "pg";

env.config();
const app = express();
const port = process.env.PORT;

app.use(express.json());

const db = new pg.Client({
    user:process.env.PG_USER,
    host:process.env.PG_HOST,
    database:process.env.PG_DATABASE,
    password:process.env.PG_PASSWORD,
    port:process.env.PG_PORT
});
db.connect();

app.get("/users/:id/episodes", async (req, res) => {
    try{
        const userId = req.params.id;
        const result = await db.query("SELECT u.id,u.username, JSON_BUILD_OBJECT('episode_id',e.id, 'star',e.star, 'mood',e.mood, 'episode_date',e.episode_date,'wentwell',JSON_AGG(DISTINCT w.list), 'wentwrong',JSON_AGG(DISTINCT wr.list), 'learning',JSON_AGG(DISTINCT l.list) ) as episode FROM USERS AS u JOIN episode AS e ON u.id = e.user_id JOIN wentwell AS w ON e.id = w.episode_id JOIN wentwrong as wr ON e.id = wr.episode_id JOIN learning as l ON e.id = l.episode_id WHERE u.id = $1 GROUP BY u.id,u.username, e.star, e.mood, e.episode_date, e.id;",[userId]);
        res.json(result.rows);
    } catch (err) {
        res.send(err);
    }
});

app.get("/:user_id/episodes/:id/posts", async (req, res) => {
    try {
        const result = await db.query();
        res.json(result.rows)
    } catch (err) {
        res.json(err);
    }
})

app.listen(port, () => {
    console.log("Server running on:", port);
});