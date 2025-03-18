import boto3
import json
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'interface', '.env')

load_dotenv(dotenv_path)


client=boto3.client('rekognition',aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("REGION_NAME"))

#Credentials are optionals as we are accessing from the same AWS user
s3 = boto3.client('s3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("REGION_NAME")
)

#Define bucket name to access
bucket_name = os.getenv("BUCKET_NAME")

student_id_photo=r"C:\Users\User\Desktop\FinalProject\Images\single.jpeg"
camera_local_file = r'C:\Users\User\Desktop\FinalProject\Images\big_group_photo.jpg' 
#convert files to bytes in order to be able to read it
with open(camera_local_file, 'rb') as image_file:
    camera_file_bytes = image_file.read()
with open(student_id_photo, 'rb') as image_file:
    student_id_photo_bytes = image_file.read()

#Use temporary file and pass it as an argument to Rekognition, alternatively use a file from an
#S3 Bucket: Image={'S3Object':{'Bucket':bucket_name,'Name':target_file}} . It depends on infrastructure
responseDetection=client.detect_faces( Image={'Bytes': camera_file_bytes})

for face in responseDetection['FaceDetails']:
    print(json.dumps(face['BoundingBox'], indent=4, sort_keys=True))

#Print index for comparision with real value of faces in the image
print(str(len(responseDetection['FaceDetails']))+ "Faces were detected")

#Look for the face in SourceImage evaluating all the faces in TargetImage
responseRecognition=client.compare_faces(
    SourceImage={'Bytes': student_id_photo_bytes},
    TargetImage={'Bytes': camera_file_bytes},
    SimilarityThreshold=80
)
#Print if there are any face matches inside the JSON response
for faceMatch in responseRecognition['FaceMatches']:
    print(json.dumps(faceMatch['Face']['BoundingBox'], indent=4, sort_keys=True))
    print('The face at ' + str(faceMatch['Face']['BoundingBox']) + ' positions matches with ' + str(faceMatch['Similarity']) + '% confidence')
