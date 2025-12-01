import os
import boto3
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

def check_s3():
    print("Checking S3 connection...")
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
        
        print(f"Endpoint: {os.environ.get('AWS_S3_ENDPOINT_URL')}")
        print("Listing buckets...")
        response = s3.list_buckets()
        
        buckets = [b['Name'] for b in response['Buckets']]
        print(f"Buckets found: {buckets}")
        
        target_bucket = 'media'
        if target_bucket in buckets:
            print(f"SUCCESS: Bucket '{target_bucket}' exists.")
        else:
            print(f"WARNING: Bucket '{target_bucket}' NOT found.")
            print(f"Attempting to create bucket '{target_bucket}'...")
            try:
                s3.create_bucket(Bucket=target_bucket)
                print(f"SUCCESS: Created bucket '{target_bucket}'.")
            except Exception as create_err:
                print(f"FAILED to create bucket: {create_err}")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check_s3()
