import express from "express";
import mysql from "mysql2";
import cors from "cors";
import dotenv from "dotenv";
import { exec } from "child_process";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path:"../../.env"});

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Function to handle MySQL reconnection
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

// 🔄 Initialize DB connection
handleDatabaseConnection();

// ✅ Get all students
// Obtener estudiantes de una tabla específica
app.get("/students/:table", (req, res) => {
  const { table } = req.params;

  // Validar que el nombre de la tabla es uno de los permitidos
  const allowedTables = ["robotica", "diseno1", "diseno2"];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: "Tabla inválida" });
  }

  db.query(`SELECT student_name, attendances FROM ${table}`, (err, results) => {
    if (err) {
      console.error(" Query Error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});


// Update attendance
app.post('/update-attendances/:table', (req, res) => {
  const { students } = req.body;
  const { table } = req.params;
  
  // Validate inputs
  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: "Lista de estudiantes inválida." });
  }
  
  // Validate table name to prevent SQL injection
  const allowedTables = ["robotica", "diseno1", "diseno2"];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: "Tabla inválida" });
  }

  // Use a proper parameterized query with placeholders
  const query = `UPDATE ${table} SET attendances = attendances + 1 WHERE student_name IN (?)`;
  
  db.query(query, [students], (err, results) => {
    if (err) {
      console.error("Error updating attendance:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ 
      success: true, 
      message: `Updated ${results.affectedRows} student records` 
    });
  });
});

app.post("/run-backend", (req, res) => {
  const { table } = req.body;
  
  // Validar la tabla
  const allowedTables = ["robotica", "diseno1", "diseno2"];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: "Tabla inválida" });
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
  
  const pythonPath = path.join(__dirname, "../../.venv/Scripts/python.exe");
  // Pasar la tabla como argumento al script Python
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

//  Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));