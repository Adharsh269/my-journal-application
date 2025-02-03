import express from "express";
import env from "dotenv";
import pg from "pg";

env.config();
const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({extended:true}));

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.get("/users/:id/episodes", async (req, res) => {
  try {
    const userid = req.params.id;
    const result = await db.query(
      `SELECT  u.id,u.username,
            COALESCE(JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'episode id', e.episode_id,
                        'episode date', e.episode_date,
                        'star', e.star,
                        'mood', e.mood,
                        'wentwell', e.wentwell,
                        'wentwrong', e.wentwrong,
                        'learning', e.learning
                    )
                )FILTER (WHERE e.episode_id IS NOT NULL), '[]'::json) AS posts
            FROM users as u
            LEFT JOIN (
                SELECT e.id AS episode_id, e.user_id, e.episode_date, e.star, e.mood,
                JSON_AGG(DISTINCT w.list) AS wentwell,
                JSON_AGG(DISTINCT wr.list) AS wentwrong,
                JSON_AGG(DISTINCT l.list) AS learning
                FROM episode AS e
                LEFT JOIN wentwell AS w ON w.episode_id = e.id
                LEFT JOIN wentwrong AS wr ON wr.episode_id = e.id
                LEFT JOIN learning AS l ON l.episode_id = e.id
                GROUP BY e.id, e.user_id, e.episode_date, e.star, e.mood
            ) AS e ON e.user_id = u.id 
            WHERE u.id = $1
            GROUP BY u.id, u.username `,
      [userid]
    );
    res.json(result.rows);
  } catch (err) {
    res.send(err);
  }
});

app.get("/users/:id/episodes/:episode_id", async (req, res) => {
  try {
    const userid = req.params.id;
    const episodeId = req.params.episode_id;
    const result = await db.query(
      `SELECT u.id, u.username, e.id, e.star, e.mood, e.episode_date, JSON_BUILD_OBJECT('wentwell',JSON_AGG(DISTINCT w.list), 'wentwrong', JSON_AGG(DISTINCT wr.list), 'learnings', JSON_AGG(DISTINCT l.list)) as episode FROM episode AS e JOIN users as u ON e.user_id = u.id JOIN wentwell AS w ON e.id = w.episode_id JOIN wentwrong AS wr ON e.id = wr.episode_id JOIN learning AS l ON e.id = l.episode_id where u.id = $1 and e.id = $2 GROUP BY u.id, e.id, e.star, e.mood, e.episode_date`,
      [userid, episodeId]
    );
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.json(err);
  }
});

app.get("/users/:id/star/episodes", async (req, res) => {
  try {
    const userid = parseInt(req.params.id);

    // Validate userid
    if (isNaN(userid)) {
      return res
        .status(400)
        .json({ error: "Invalid user ID. User ID must be an integer." });
    }

    const result = await db.query(
      `SELECT  u.id,u.username,
            COALESCE(JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'episode id', e.episode_id,
                        'episode date', e.episode_date,
                        'star', e.star,
                        'mood', e.mood,
                        'wentwell', e.wentwell,
                        'wentwrong', e.wentwrong,
                        'learning', e.learning
                    )
                )FILTER (WHERE e.episode_id IS NOT NULL), '[]'::json) AS posts
            FROM users as u
            LEFT JOIN (
                SELECT e.id AS episode_id, e.user_id, e.episode_date, e.star, e.mood,
                JSON_AGG(DISTINCT w.list) AS wentwell,
                JSON_AGG(DISTINCT wr.list) AS wentwrong,
                JSON_AGG(DISTINCT l.list) AS learning
                FROM episode AS e
                LEFT JOIN wentwell AS w ON w.episode_id = e.id
                LEFT JOIN wentwrong AS wr ON wr.episode_id = e.id
                LEFT JOIN learning AS l ON l.episode_id = e.id
                WHERE e.star = true
                GROUP BY e.id, e.user_id, e.episode_date, e.star, e.mood
            ) AS e ON e.user_id = u.id 
            WHERE u.id = $1
            GROUP BY u.id, u.username;`,
      [userid]
    );
    res.json(result.rows);
  } catch (err) {
    res.json(err);
  }
});

app.get("/users/:id/prompts", async (req, res) => {
  try {
    const userid = req.params.id;
    const result = await db.query(
      `SELECT u.id, u.username, 
      JSON_AGG(DISTINCT p.list) as prompts 
      FROM users AS u JOIN prompts AS p ON u.id = p.user_id 
      WHERE u.id = $1 
      GROUP BY u.id, u.username;`,
      [userid]
    );
    res.json(result.rows);
  } catch (err) {
    res.json(err);
  }
});

app.get("/users/:id/goals", async (req, res) => {
  try {
    const userid = req.params.id;
    const result = await db.query(
      `SELECT u.id, u.username,  
      JSON_AGG(DISTINCT lg.list) as lifegoals 
      FROM users as u 
      JOIN lifegoals as lg ON lg.user_id = u.id 
      WHERE u.id = $1 
      GROUP BY u.id, u.username`,
      [userid]
    );
    console.log(result.rows);
    res.json(result.rows);
  } catch (err) {
    res.json(err);
  }
});

app.get("/users/:id/thoughts", async (req, res) => {
  try {
    const userid = req.params.id;
    const result = await db.query(
      `SELECT  u.id, u.username,
	COALESCE(JSON_AGG(
		JSON_BUILD_OBJECT(
			'id', t.thought_id,
			'rated', t.star,
			'date', t.date,
			'feelings', t.feelings
		)
	) FILTER (WHERE thought_id is not null), '[]'::json) as posts
FROM users AS u
JOIN(
	SELECT t.id AS thought_id, t.user_id, t.star, t.date, t.feelings
	FROM thoughts AS t
) AS t ON t.user_id = u.id
WHERE u.id = $1
GROUP BY u.id, u.username;`,
      [userid]
    );
    res.json(result.rows);
  } catch (err) {
    res.json(err);
  }
});

app.get("/users/:id/thoughts/:thoughts_id", async (req, res) => {
  try {
    const userid = req.params.id;
    const thoughtsid = req.params.thoughts_id;
    const result = await db.query(
      `SELECT u.id, u.username, JSON_BUILD_OBJECT(
	'thought id', t.id,
	'date', t.date,
		'star', t.star,
    'thoughts', t.feelings
	) AS post
  FROM users as u
            JOIN thoughts AS t ON t.user_id = u.id
            WHERE u.id = $1 and t.id = $2
            GROUP BY u.id, u.username, t.id;`,
      [userid, thoughtsid]
    );
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.json(err);
  }
});

app.get("/users/:id/star/thoughts", async (req, res) => {
  try {
    const userid = req.params.id;
    const result = await db.query(
      `SELECT u.id, u.username,
	COALESCE(JSON_AGG(
			JSON_BUILD_OBJECT(
				'id', t.thought_id,
				'rated', t.star,
				'date', t.date,
				'feelings', t.feelings
			)
		) FILTER (WHERE t.thought_id IS NOT NULL), '[]'::json
	) AS posts
  FROM users AS u
  LEFT JOIN(
	SELECT t.id AS thought_id, t.user_id, t.star, t.date, t.feelings
	FROM thoughts AS t
	WHERE t.star = true
  ) AS t ON t.user_id = u.id
  WHERE u.id = $1
    GROUP BY u.id, u.username;`,
      [userid]
    );
    res.json(result.rows);
  } catch (err) {
    res.json(err);
  }
});

app.get("/users/:id/todo", async (req, res) => {
  try {
    const userid = req.params.id;
    const result = await db.query(
      `SELECT u.id, u.username, JSON_AGG(
	JSON_BUILD_OBJECT( 
	'id', td.id,
	'todo_item',td.todo_item, 	
	'start',td.todo_start, 	
	'end',td.todo_end ) --
)AS items 
FROM users as u 
JOIN todo as td ON td.user_id = u.id
WHERE u.id = $1
GROUP BY u.id, u.username;`,
      [userid]
    );
    res.json(result.rows);
  } catch (err) {
    res.json(err);
  }
});

app.post("/users/:id/episodes", async(req, res) => {
  try {
    const userid = req.params.id;
    const {star, mood} = req.body;

    const wentwell = Array.isArray(req.body.wentwell) ? req.body.wentwell : [];
    const wentwrong = Array.isArray(req.body.wentwrong) ? req.body.wentwrong : [];
    const learning = Array.isArray(req.body.learning) ? req.body.learning : [];

    await db.query("BEGIN");
    const result = await db.query(`
        INSERT INTO episode(star, mood, user_id, episode_date)
        VALUES ($1, $2, $3, NOW())
        RETURNING id ;
      `, [star, mood, userid]);

      const episode_id = result.rows[0].id;
      
      const insertList = async (table, lists) => {
        if(lists.length > 0) {
          const values = lists.map((_, i) => `($${i + 1}, $${lists.length + 1})`).join(",");
          await db.query(`INSERT INTO ${table}(list, episode_id) VALUES ${values}`, [...lists, episode_id]);
        }
      };
      await insertList("wentwell", wentwell);
      await insertList("wentwrong", wentwrong);
      await insertList("learning", learning);
      // const wentwellValue = wentwell.map((item) => `('${item}', ${episode_id})`).join(",");
      // if(wentwellValue) {
      //   await db.query(`INSERT INTO wentwell(list, episode_id) VALUES ${wentwellValue} RETURNING id;`)
      // }
      // const wentwrongValue = wentwrong.map((item) => `('${item}', ${episode_id})`).join(",");
      // if(wentwrongValue) {
      //   await db.query(`INSERT INTO wentwrong(list, episode_id) VALUES ${wentwrongValue} RETURNING id;`)
      // }
      // const learninglValue = learning.map((item) => `('${item}', ${episode_id})`).join(",");
      // if(learninglValue) {
      //   await db.query(`INSERT INTO learning(list, episode_id) VALUES ${learninglValue} RETURNING id;`)
      // }
      await db.query("COMMIT");
      res.json({messgae:"Successfully inserted the episode in the database.",episode_id})
  } catch (err) {
    await db.query("ROLLBACK");
    console.log(err);
    res.json(err);
  }
});

/** to delete individual episode from the database */
app.delete("/users/:id/episodes/:episode_id", async (req, res) => {
  try {
    const userid = req.params.id;
    const episodeid = req.params.episode_id;
    await db.query(`DELETE FROM episode WHERE episode.id = $1 AND episode.user_id = $2`, [episodeid, userid])
    res.json({message:"Successfully deleted the data."});
  } catch (err) {
    console.log(err);
    res.json(err);
  }
});

/** posting the feelings to the mind */
app.post("/users/:id/thoughts", async (req, res) => {
  try {
    const userid = req.params.id;
    const {feelings, star} = req.body;
    await db.query("BEGIN");
    await db.query(`INSERT INTO thoughts(feelings, user_id, star, date)
        VALUES ($1, $2, $3, NOW());
      `, [feelings, userid, star]);
    await db.query("COMMIT");
    res.json({message:"successfully inserted data to thoughts table"});
  } catch(err) {
    await db.query("ROLLBACK");
    console.log(err);
    res.json(err);
  }
});

/** delteing thoughts from the thoughts table */
app.delete("/users/:id/thoughts/:thoughts_id", async (req, res) => {
  try {
    const userid = req.params.id;
    const thoughtid = req.params.thoughts_id;
    await db.query(`DELETE FROM thoughts WHERE thoughts.id = $1 AND thoughts.user_id = $2`, [thoughtid, userid]);
    res.json({message:"successfully delete thought with the id", thoughtid});
  } catch (err) {
    console.log(err);
    res.json(err);
  }
});

app.listen(port, () => {
  console.log("Server running on:", port);
});
