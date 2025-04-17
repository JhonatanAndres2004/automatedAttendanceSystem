import requests
from requests.auth import HTTPDigestAuth
from PIL import Image
from io import BytesIO
import boto3
import os
from datetime import datetime
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# URL for the live video stream
url = os.getenv("CAMERA_URL")
# Authentication details for the camera
username = os.getenv("CAMERA_USERNAME")
password = os.getenv("CAMERA_PASSWORD")

def main():
    
    # Send a request to the video stream with authentication
    response = requests.get(url, auth=HTTPDigestAuth(username, password), stream=True)
    
    # Check if the request was successful
    if response.status_code == 200:
        bytes_data = bytes()  # Buffer to store stream data
        for chunk in response.iter_content(chunk_size=1024):
            bytes_data += chunk
            # JPEG frames start with b'\xff\xd8' and end with b'\xff\xd9'
            start = bytes_data.find(b'\xff\xd8')  # JPEG start
            end = bytes_data.find(b'\xff\xd9')  # JPEG end
            if start != -1 and end != -1:
                # Extract the JPEG frame
                jpeg_frame = bytes_data[start:end + 2]
                
                classroom_folder = "../../classroom"
                os.makedirs(classroom_folder, exist_ok=True)
                # Generate a unique filename using the current date and time
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                local_filename = f"../../classroom/frame_{timestamp}.jpeg"
                
                # Save the frame locally
                img = Image.open(BytesIO(jpeg_frame))
                img.save(local_filename)
                print(f"Frame saved locally as {local_filename}")
                # Clear the buffer after extracting the frame
                bytes_data = bytes_data[end + 2:]
                break
    else:
        print(f"Error retrieving video stream. Status code: {response.status_code}")
        exit(1)
 
if __name__ == "__main__":
    main()
