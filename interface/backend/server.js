import express from "express";
import mysql from "mysql2";
import cors from "cors";
import dotenv from "dotenv";
import { exec } from "child_process";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import https from "https"
import os, { platform } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path:"../../.env"});

const app = express();
app.use(cors());
app.use(express.json());

//  Function to handle MySQL reconnection
let db;

function handleDatabaseConnection() {
  db = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  db.connect((err) => {
    if (err) {
      console.error(" MySQL Connection Error:", err);
      setTimeout(handleDatabaseConnection, 5000); // Retry after 5s
    } else {
      console.log("✅ MySQL Connected!");
    }
  });

  db.on("error", (err) => {
    console.error(" MySQL Error:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.log("🔄 Reconnecting...");
      handleDatabaseConnection();
    } else {
      throw err;
    }
  });
}

//  Initialize DB connection
handleDatabaseConnection();


// Retrieve students from a specific table
app.get("/students/:table", (req, res) => {
  const { table } = req.params;

  // Validate that the table name is one of the allowed ones
  const allowedTables = ["robotica", "diseno1", "diseno2"];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }

  db.query(`SELECT student_name, attendances FROM ${table}`, (err, results) => {
    if (err) {
      console.error(" Query Error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

app.get('/historics/:table/:student_name', (req, res) => {
  const { table, student_name } = req.params;
  const allowedTables = ["robotica_records", "diseno1_records", "diseno2_records"];

  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }

  const query = `SELECT attendance_date FROM ${table} WHERE student_name = ? ORDER BY attendance_date DESC`;

  db.query(query, [student_name], (err, results) => {
    if (err) {
      console.error("Error fetching attendance records:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json({ records: results });
  });
});



// Update attendance
app.post('/update-attendances/:table', (req, res) => {
  const { students } = req.body;
  const { table } = req.params;

  // Validate inputs
  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: "Invalid student list." });
  }

  // Secure table name
  const allowedTables = ["robotica", "diseno1", "diseno2"];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: "Invalid table." });
  }

  const recordsTable = `${table}_records`;

  // Get current date in Bogota timezone (only the date part)
  const bogotaDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }))
    .toISOString().split('T')[0]; // Format: 'YYYY-MM-DD'

  // Step 1: Update the attendance count
  const updateQuery = `UPDATE ${table} SET attendances = attendances + 1 WHERE student_name IN (?)`;

  db.query(updateQuery, [students], (err, result) => {
    if (err) {
      console.error("Error updating attendance:", err);
      return res.status(500).json({ error: err.message });
    }

    // Step 2: Insert attendance record (avoiding duplicates for the same day)
    const insertValues = students.map(name => [name, bogotaDate]);

    const insertQuery = `INSERT INTO ${recordsTable} (student_name, attendance_date)
                         VALUES ? 
                         ON DUPLICATE KEY UPDATE attendance_date = attendance_date`;

    db.query(insertQuery, [insertValues], (err2, result2) => {
      if (err2) {
        console.error("Error inserting attendance records:", err2);
        return res.status(500).json({ error: err2.message });
      }

      res.json({
        success: true,
        updated: result.affectedRows,
        inserted: result2.affectedRows,
        message: `Updated ${result.affectedRows} records and inserted history entries.`
      });
    });
  });
});


app.get('/attendance-matrix/:table', async (req, res) => {
  const { table } = req.params;

  const allowedTables = ["robotica", "diseno1", "diseno2"];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }

  const recordTable = `${table}_records`;

  try {
    // 1. Fetch all unique attendance dates
    const [dateResults] = await db.promise().query(`
      SELECT DISTINCT DATE(attendance_date) AS date FROM ${recordTable}
    `);
    const dates = dateResults.map(row => new Date(row.date).toISOString().split("T")[0]).sort();

    // 2. Fetch all students from the base table
    const [studentResults] = await db.promise().query(`
      SELECT student_name FROM ${table}
    `);
    const studentNames = studentResults.map(row => row.student_name);

    // 3. Fetch all attendance records
    const [attendanceResults] = await db.promise().query(`
      SELECT student_name, DATE(attendance_date) AS date FROM ${recordTable}
    `);

    // 4. Convert attendance records to a Set for quick lookup
    const attendanceSet = new Set(
      attendanceResults.map(({ student_name, date }) => {
        const formatedDate = new Date(date).toISOString().split("T")[0]
        return `${student_name}_${formatedDate}`
      })
    );

    // 5. Build matrix
    const data = studentNames.map(name => {
      const row = { student_name: name };
      dates.forEach(date => {
        const formattedDate = new Date(date).toISOString().split("T")[0];
        const key = `${name}_${formattedDate}`;
        row[formattedDate] = attendanceSet.has(key) ? 1 : 2;
      });
      return row;
    });
    //const formattedDates = new Date(dates).toISOString().split("T")[0];
    res.json({ dates, data });

  } catch (err) {
    console.error("Error fetching attendance matrix:", err);
    res.status(500).json({ error: "Database error" });
  }
});


app.post("/run-backend", (req, res) => {
  const { table } = req.body;
  
  // Validar la tabla
  const allowedTables = ["robotica", "diseno1", "diseno2"];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }
  
  const scriptPath = path.join(__dirname, "../../backend.py");
  
  console.log(`Attempting to execute Python script at: ${scriptPath}`);
  
  // Check if the file exists 
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found at: ${scriptPath}`);
    return res.status(500).json({ 
      error: "Script file not found", 
      path: scriptPath 
    });
  }
  const op = os.platform()
  let pythonPath
    if (op === "win32"){
      pythonPath = path.join(__dirname, "../../.venv/Scripts/python.exe");
    } else if (op === "linux"){ //
      pythonPath = path.join(__dirname,"../../.venv/bin/python3")
    }
    
  //Pass the table as an argument to the Python Script
  const command = `${pythonPath} "${scriptPath}" --table ${table}`;
  
  console.log(`Executing: ${command}`);
  
  exec(command, (error, stdout, stderr) => {
    console.log("Python stdout:", stdout);
    
    if (stderr) {
      console.error("Python stderr:", stderr);
    }
    
    if (error) {
      console.error("Execution error:", error);
      return res.status(500).json({ 
        error: "Script execution failed", 
        details: stderr,
        stdout: stdout
      });
    }
    
    const recognizedPath = path.join(__dirname, "../../recognized_students.json");
    console.log(`Looking for recognition results at: ${recognizedPath}`);
    
    // Check if the output file exists
    if (!fs.existsSync(recognizedPath)) {
      console.error(`Results file not found at: ${recognizedPath}`);
      return res.status(500).json({ 
        error: "Recognition results file not found",
        path: recognizedPath
      });
    }
    
    fs.readFile(recognizedPath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading recognition file:", err);
        return res.status(500).json({ 
          error: "Failed to read recognition results", 
          details: err.message 
        });
      }
      
      try {
        const recognizedStudents = JSON.parse(data);
        console.log("Recognition successful, found students:", recognizedStudents);
        res.json({ recognized: recognizedStudents });
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        return res.status(500).json({ 
          error: "Invalid recognition results format", 
          details: jsonError.message,
          rawData: data
        });
      }
    });
  });
});


const PHOTOS_DIR = path.join(__dirname, "../../StudentsFoundInClassroom");

// Endpoint to get list of all classroom photos
app.get("/classroom-photos", (req, res) => {
  try {
    // Ensure directory exists
    if (!fs.existsSync(PHOTOS_DIR)) {
      return res.json({ photos: [] });
    }
    
    // Read directory and filter for image files
    const files = fs.readdirSync(PHOTOS_DIR)
      .filter(file => file.toLowerCase().endsWith('.jpeg') || 
                     file.toLowerCase().endsWith('.jpg') || 
                     file.toLowerCase().endsWith('.png'));
    
    // Sort files by creation time (newest first)
    const sortedFiles = files.sort((a, b) => {
      const statA = fs.statSync(path.join(PHOTOS_DIR, a));
      const statB = fs.statSync(path.join(PHOTOS_DIR, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });
    
    res.json({ photos: sortedFiles });
  } catch (error) {
    console.error("Error getting photos:", error);
    res.status(500).json({ error: "Failed to retrieve photos" });
  }
});

// Endpoint to serve individual photos
app.get("/photo/:filename", (req, res) => {
  const { filename } = req.params;
  
  // Prevent directory traversal attacks
  const safePath = path.normalize(filename).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(PHOTOS_DIR, safePath);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Photo not found" });
  }
  
  // Serve the file
  res.sendFile(filePath);
});

const sslOptions = {
  key: fs.readFileSync(process.env.VITE_SSL_KEY),
  cert: fs.readFileSync(process.env.VITE_SSL_CERT)
}
//  Start Server
const PORT = process.env.PORT || 5000;
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`HTTPS server running on port ${PORT} on ${os.platform}`)
})