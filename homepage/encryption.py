"""
Message encryption utilities using Fernet symmetric encryption.
"""
from cryptography.fernet import Fernet
from django.conf import settings


class MessageEncryption:
    """Handles encryption and decryption of direct message text."""
    
    @staticmethod
    def get_cipher():
        """Get Fernet cipher instance using the encryption key from settings."""
        key = settings.MESSAGE_ENCRYPTION_KEY
        if key:
            # Clean the key of whitespace and surrounding quotes
            key = key.strip().strip("'").strip('"')
            
        if not key:
            print("DEBUG: MESSAGE_ENCRYPTION_KEY is missing/empty")
            raise ValueError("MESSAGE_ENCRYPTION_KEY not set in environment")
            
        try:
            return Fernet(key.encode())
        except Exception as e:
            print(f"DEBUG: Encryption key error. Key length: {len(key)}. Error: {e}")
            raise
    
    @staticmethod
    def encrypt(plaintext):
        """
        Encrypt plaintext message.
        
        Args:
            plaintext (str): The message text to encrypt
            
        Returns:
            str: Base64-encoded encrypted text
        """
        if not plaintext:
            return plaintext
        try:
            cipher = MessageEncryption.get_cipher()
            return cipher.encrypt(plaintext.encode()).decode()
        except Exception as e:
            print(f"ENCRYPTION ERROR (Falling back to plaintext): {e}")
            return plaintext
    
    @staticmethod
    def decrypt(ciphertext):
        """
        Decrypt encrypted message.
        
        Args:
            ciphertext (str): The encrypted message text
            
        Returns:
            str: Decrypted plaintext message
        """
        if not ciphertext:
            return ciphertext
        try:
            cipher = MessageEncryption.get_cipher()
            return cipher.decrypt(ciphertext.encode()).decode()
        except Exception as e:
            # If decryption fails (bad key, legacy text, missing env var), 
            # return as-is to prevent 500 crashes
            print(f"DECRYPTION ERROR: {e}")
            return ciphertext
