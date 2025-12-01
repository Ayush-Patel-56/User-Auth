import os
import boto3
import urllib.request
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

def test_upload():
    print("Testing S3 Upload...")
    try:
        session = boto3.session.Session()
        s3 = session.client(
            's3',
            region_name='ap-southeast-1',
            endpoint_url='https://tyeszjpfmtmftibxibwj.supabase.co/storage/v1/s3',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            config=Config(signature_version='s3v4')
        )
        
        bucket_name = 'media'
        file_name = 'test_upload.txt'
        content = b'Hello Supabase Storage!'
        
        print(f"Uploading {file_name} to bucket '{bucket_name}'...")
        s3.put_object(Bucket=bucket_name, Key=file_name, Body=content, ACL='public-read')
        print("Upload successful.")
        
        # Construct Public URL
        url = f"https://tyeszjpfmtmftibxibwj.supabase.co/storage/v1/object/public/{bucket_name}/{file_name}"
        print(f"Testing Public URL: {url}")
        
        try:
            with urllib.request.urlopen(url) as response:
                if response.status == 200 and response.read() == content:
                    print("SUCCESS: File is publicly accessible!")
                else:
                    print(f"FAILURE: Status {response.status}")
        except Exception as http_err:
            print(f"FAILURE: Public access failed. {http_err}")
            print("Possible cause: Bucket is not Public.")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_upload()
