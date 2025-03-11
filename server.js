import express from "express";
import mysql from "mysql";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";


dotenv.config();
//Obtain current route
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const port = process.env.PORT;

var con = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});


app.use(express.static(path.join(__dirname, 'webPage')));

//Redirect to html file in the webPage folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'webPage', 'index.html'));
});

app.get('/api/datos', (req, res) => {
  const query = "SELECT * FROM students"; // Ajusta según tu tabla
  
  con.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

