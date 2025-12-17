import pickle
import os
import numpy as np
import pandas as pd
from pymongo import MongoClient
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv('MONGODB_URI')
MODEL_PATH = os.getenv('MODEL_PATH', './models')

def train_and_save_models():
    """Train and save recommendation models"""
    try:
        # Connect to MongoDB
        client = MongoClient(MONGODB_URI)
        db = client.ecommerce
        logger.info("Connected to MongoDB")
        
        # Fetch data
        interactions = list(db.interactions.find())
        products = list(db.products.find())
        
        logger.info(f"Loaded {len(interactions)} interactions and {len(products)} products")
        
        if not interactions or not products:
            logger.warning("Insufficient data for training")
            return {'error': 'Insufficient data'}
        
        # Train collaborative filtering model
        collab_metrics = train_collaborative_filtering(interactions, products)
        
        # Train content-based filtering model
        content_metrics = train_content_based_filtering(products)
        
        logger.info("✅ Models trained and saved successfully")
        
        return {
            'collaborative': collab_metrics,
            'content_based': content_metrics
        }
        
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise

def train_collaborative_filtering(interactions, products):
    """Train collaborative filtering model"""
    try:
        # Create user-item interaction matrix
        user_ids = list(set([str(i['user']) for i in interactions]))
        product_ids = list(set([str(i['product']) for i in interactions]))
        
        # Initialize matrix
        matrix = np.zeros((len(user_ids), len(product_ids)))
        
        user_idx_map = {uid: idx for idx, uid in enumerate(user_ids)}
        product_idx_map = {pid: idx for idx, pid in enumerate(product_ids)}
        
        # Fill matrix with interaction weights
        for interaction in interactions:
            user_idx = user_idx_map.get(str(interaction['user']))
            product_idx = product_idx_map.get(str(interaction['product']))
            
            if user_idx is not None and product_idx is not None:
                # Weight different interaction types
                weight = {
                    'view': 1,
                    'cart': 2,
                    'purchase': 5,
                    'rating': interaction.get('value', 3)
                }.get(interaction['type'], 1)
                
                matrix[user_idx, product_idx] += weight
        
        # Calculate user similarity
        user_similarity = cosine_similarity(matrix)
        
        # Save model
        model_data = {
            'model': user_similarity,
            'user_item_matrix': matrix,
            'user_ids': user_ids,
            'product_ids': product_ids,
            'user_idx_map': user_idx_map,
            'product_idx_map': product_idx_map
        }
        
        os.makedirs(MODEL_PATH, exist_ok=True)
        with open(os.path.join(MODEL_PATH, 'collaborative_model.pkl'), 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info("Collaborative filtering model saved")
        
        return {
            'num_users': len(user_ids),
            'num_products': len(product_ids),
            'num_interactions': len(interactions)
        }
        
    except Exception as e:
        logger.error(f"Collaborative filtering training error: {e}")
        raise

def train_content_based_filtering(products):
    """Train content-based filtering model"""
    try:
        # Create product feature vectors
        product_ids = [str(p['_id']) for p in products]
        
        # Combine text features
        text_features = []
        for product in products:
            features = (
                product.get('name', '') + ' ' +
                product.get('description', '') + ' ' +
                ' '.join(product.get('tags', [])) + ' ' +
                product.get('category', '')
            )
            text_features.append(features)
        
        # TF-IDF vectorization
        vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(text_features)
        
        # Calculate product similarity
        product_similarity = cosine_similarity(tfidf_matrix)
        
        # Save model
        model_data = {
            'model': product_similarity,
            'features': tfidf_matrix,
            'product_ids': product_ids,
            'vectorizer': vectorizer
        }
        
        os.makedirs(MODEL_PATH, exist_ok=True)
        with open(os.path.join(MODEL_PATH, 'content_model.pkl'), 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info("Content-based filtering model saved")
        
        return {
            'num_products': len(product_ids),
            'num_features': tfidf_matrix.shape[1]
        }
        
    except Exception as e:
        logger.error(f"Content-based filtering training error: {e}")
        raise

if __name__ == '__main__':
    print("Training recommendation models...")
    results = train_and_save_models()
    print("Training completed!")
    print(results)