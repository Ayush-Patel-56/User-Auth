import os
import boto3
import urllib.request
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

def debug_storage():
    print("--- Debugging Supabase Storage ---")
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
        
        # 1. List Objects
        print(f"\n1. Listing objects in '{bucket_name}':")
        response = s3.list_objects_v2(Bucket=bucket_name)
        if 'Contents' in response:
            for obj in response['Contents']:
                print(f" - {obj['Key']} (Size: {obj['Size']})")
                last_key = obj['Key']
        else:
            print(" - Bucket is empty.")
            last_key = None

        if last_key:
            # 2. Generate Presigned URL (Private Access)
            print(f"\n2. Generating Presigned URL for '{last_key}':")
            presigned_url = s3.generate_presigned_url('get_object',
                                                    Params={'Bucket': bucket_name, 'Key': last_key},
                                                    ExpiresIn=3600)
            print(f"URL: {presigned_url}")
            
            # 3. Test Presigned URL
            print("   Testing Presigned URL...")
            try:
                with urllib.request.urlopen(presigned_url) as res:
                    print(f"   SUCCESS: Status {res.status}")
            except Exception as e:
                print(f"   FAILURE: {e}")

            # 4. Test Public URL
            print(f"\n3. Testing Public URL for '{last_key}':")
            public_url = f"https://tyeszjpfmtmftibxibwj.supabase.co/storage/v1/object/public/{bucket_name}/{last_key}"
            print(f"URL: {public_url}")
            try:
                with urllib.request.urlopen(public_url) as res:
                    print(f"   SUCCESS: Status {res.status}")
            except Exception as e:
                print(f"   FAILURE: {e}")
                print("   (If Presigned worked but Public failed, your Bucket is likely PRIVATE)")

    except Exception as e:
        print(f"\nERROR: {e}")

if __name__ == "__main__":
    debug_storage()
