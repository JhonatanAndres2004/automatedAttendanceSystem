# Attendance Tracking System Based on Facial Identification

An automated attendance management system that leverages facial recognition technology to streamline student identification and record-keeping in academic environments.

# Video of the project

Link: [text](https://www.youtube.com/watch?v=Iy_daGBITbk)

# 🎯 Overview

This system addresses the inefficiencies of traditional attendance methods by using computer vision and artificial intelligence to automatically identify students and maintain attendance records. The solution achieves a 90% F1-score with minimal processing requirements, making it scalable for various educational and large-scale scenarios.

# ✨ Key Features

1. Automated Face Detection & Recognition: Real-time student identification using advanced AI models

2. Web-based Interface: User-friendly dashboard for attendance management

3. Multiple Frame Processing: Captures multiple frames per session for improved accuracy

4. Historical Analytics: Comprehensive attendance tracking with visual reports

5. Manual Correction Support: Allows instructors to manually verify and correct identifications

6. Cloud Integration: Leverages AWS services for scalable performance

# 🛠️ Technology Stack

Backend

Python: Core application logic
AWS Rekognition: Face detection and identification
MySQL: Attendance data storage
AWS S3: Reference image storage

Frontend

React: Interactive web interface
JavaScript: Client-side functionality

Hardware

AXIS Q1604 IP Camera: Image capture
Lens CS 2.8-8mm F1.2 P-Iris 5MP: Wide-angle classroom coverage
FortiSwitch 148F-FPOE: Network connectivity with PoE support

# 🚀 Getting Started
Prerequisites

Python 3.8+
Node.js 14+
MySQL 8.0+
AWS Account with Rekognition access
IP Camera with network connectivity

Installation

Clone the repository
git clone https://github.com/yourusername/attendance-tracking-system.git
cd attendance-tracking-system

Backend Setup
cd backend
pip install -r requirements.txt

Frontend Setup
cd frontend
npm install

Database Configuration
Create MySQL database
mysql -u root -p
CREATE DATABASE attendance_system;


Create S3 bucket for image storage
It is possible and recommender to create it directly in the AWS GUI

Configuration

Environment Variables
cp .env.example .env
Update .env with your configuration:
env# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=attendance_system

AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-x
S3_BUCKET_NAME=your-attendance-images-bucket

CAMERA_IP=192.168.1.100
CAMERA_PORT=8035

Camera Setup

Configure static IP address for your IP camera
Set up port forwarding for external access
Ensure PoE connection is established



Running the Application

Start Backend Server
bashcd backend
python app.py

Start Frontend Development Server
bashcd frontend
npm start

Access the Application

Open your browser and navigate to http://localhost:3000
The backend API will be available at http://localhost:5000

# 📖 Usage

Taking Attendance

Setup Course: Add students and their reference photos
Select Course: Choose the active course from the dropdown
Capture Frame: Click "Take Attendance" to capture classroom image
Review Results: Identified students will be highlighted with bounding boxes
Manual Corrections: Toggle attendance status for any missed identifications
Save Record: Click "Save Attendance" to store the session data

Viewing Reports

Course Overview: View attendance statistics by course
Student History: Individual attendance records with visual charts
Session Details: Frame-by-frame detection results for performance analysis

# 🧪 Testing & Validation

The system underwent comprehensive testing:

Model Comparison: Evaluated OpenCV, MTCNN, RetinaFace, and AWS Rekognition
Parameter Optimization: Tested resolution, brightness, photo recency, and similarity thresholds
Real-world Validation: 8 classroom sessions with 44 students
Statistical Analysis: t-test validation confirming >90% F1-Score with 95% confidence

# 🚧 Limitations

Single reference photo per student
Requires clear, unobstructed facial images
No integration with official university systems
Performance may vary with lighting conditions

# Acknowledgments

Universidad del Norte - Department of Electronics and Electrical Engineering
AWS for cloud services and credits
Research participants who provided consent for system testing

# 📞 Contact

Diego Gómez - dgomez@uninorte.edu.co
Jhonatan Maldonado - barreraaj@uninorte.edu.co
Eduardo Guzmán - aeguzman@uninorte.edu.co