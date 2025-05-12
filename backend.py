import mysql.connector
import os
from dotenv import load_dotenv
import boto3
import detection
import argparse
import get_frame
import os
import time
from datetime import datetime

# Configure command-line arguments
parser = argparse.ArgumentParser(description='Script to take student attendance')
parser.add_argument('--table', type=str, required=True, choices=['robotica', 'diseno1', 'diseno2'],
                    help='Database table to use')

# Parse arguments
args = parser.parse_args()
table_name = args.table

# Load environment variables
load_dotenv()

folders = ["../../students", "../../classroom"] #, "../../StudentsFoundInClassroom"

# Delete only files (keep the folders)
for folder in folders:
    if os.path.exists(folder):
        for file in os.listdir(folder):
            file_path = os.path.join(folder, file)
            if os.path.isfile(file_path):
                os.remove(file_path)
    else:
        os.makedirs(folder)


def delete_old_pictures(folder_path):
    today = datetime.today().date()
    if os.path.exists(folder_path):
        for filename in os.listdir(folder_path):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')):
                file_path = os.path.join(folder_path, filename)
                try:
                    mod_time = os.path.getmtime(file_path)
                    file_date = datetime.fromtimestamp(mod_time).date()
                    print(rf"Todays date: {today} last mod date {file_date}")
                    if file_date != today:
                        os.remove(file_path)
                        print(f"Deleted: {filename}")
                except Exception as e:
                    print(f"Error with {filename}: {e}")

delete_old_pictures(rf"../../StudentsFoundInClassroom/{table_name}")

# Get frame from camera
get_frame.main()

# Set up MySQL connection
conn = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST"),
    user=os.getenv("MYSQL_USER"),
    password=os.getenv("MYSQL_PASSWORD"),
    database=os.getenv("MYSQL_DATABASE")
)

# Query students from the specified table
cursor = conn.cursor()
cursor.execute(f"SELECT student_name FROM {table_name}")
students = [student[0] for student in cursor.fetchall()]
cursor.close()
conn.close()

# Set up S3 connection - use the default credential chain
S3_BUCKET = os.getenv("S3_BUCKET_NAME")

# Create session using the same authentication method as AWS CLI
session = boto3.session.Session()
s3 = session.client('s3')

# Folder to save student images locally
save_folder = "../../students"


successful_students = []

# Download student images from S3 based on selected table
for student in students:
    s3_key = f"{student}.jpeg"
    local_file_path = os.path.join(save_folder, f"{student}.jpeg")
    
    try:
        s3.download_file(S3_BUCKET, s3_key, local_file_path)
        print(f" Student image downloaded: {s3_key}")
        successful_students.append(student)
    except Exception as e:
        print(f" Failed to download {s3_key}: {str(e)}")

classroom_folder = "../../classroom"
# # #Definir el mapeo de archivos de aula específicos para cada curso
classroom_file_map = {
    "robotica": "int_robotica11.jpg",
    "diseno1": "diseno1_1.jpg",
    "diseno2": "diseno2_9.jpg"
}

'''# Descargar la imagen específica del aula según el curso seleccionado
try:
#     # Obtener el nombre de archivo correcto basado en la tabla seleccionada
    classroom_file = classroom_file_map.get(table_name)
   
    if classroom_file:
#         # Define la ruta local donde se guardará la imagen
        local_file_path = os.path.join(classroom_folder, classroom_file)
        
#         # Descarga la imagen específica del aula desde S3
        s3.download_file(S3_BUCKET, classroom_file, local_file_path)
        print(f" Classroom image downloaded: {classroom_file}")
    else:
        print(f" No specific classroom image defined for table: {table_name}")
except Exception as e:
    print(f" Error downloading classroom image: {str(e)}")
'''
# Save downloaded student names to a text file
txt_file_path = os.path.join(save_folder, "students_downloaded.txt")

with open(txt_file_path, "w", encoding="utf-8") as file:
    for student in successful_students:
        file.write(student + "\n")

# Run detection
detection.main(table_name)
