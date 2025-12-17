from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import pickle
import numpy as np
from pymongo import MongoClient
from bson import ObjectId
import logging

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI')
try:
    mongo_client = MongoClient(MONGODB_URI)
    db = mongo_client.ecommerce
    logger.info("✅ Connected to MongoDB")
except Exception as e:
    logger.error(f"❌ MongoDB connection error: {e}")
    db = None

# Model paths
MODEL_PATH = os.getenv('MODEL_PATH', './models')
os.makedirs(MODEL_PATH, exist_ok=True)

# Load models
collaborative_model = None
content_model = None
user_item_matrix = None
product_features = None

def load_models():
    """Load trained ML models"""
    global collaborative_model, content_model, user_item_matrix, product_features
    
    try:
        collab_path = os.path.join(MODEL_PATH, 'collaborative_model.pkl')
        content_path = os.path.join(MODEL_PATH, 'content_model.pkl')
        
        if os.path.exists(collab_path):
            with open(collab_path, 'rb') as f:
                data = pickle.load(f)
                collaborative_model = data.get('model')
                user_item_matrix = data.get('user_item_matrix')
            logger.info("✅ Loaded collaborative filtering model")
        
        if os.path.exists(content_path):
            with open(content_path, 'rb') as f:
                data = pickle.load(f)
                content_model = data.get('model')
                product_features = data.get('features')
            logger.info("✅ Loaded content-based filtering model")
            
    except Exception as e:
        logger.error(f"Error loading models: {e}")

load_models()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'models_loaded': {
            'collaborative': collaborative_model is not None,
            'content_based': content_model is not None
        }
    })

@app.route('/recommendations/user/<user_id>', methods=['GET'])
def get_user_recommendations(user_id):
    """Get personalized recommendations for a user"""
    try:
        limit = int(request.args.get('limit', 10))
        
        # Get user interactions
        interactions = list(db.interactions.find({
            'user': ObjectId(user_id)
        }).sort('timestamp', -1).limit(100))
        
        if not interactions:
            # Return popular products for new users
            popular_products = list(db.products.find()
                .sort([('purchases', -1), ('ratings.average', -1)])
                .limit(limit))
            product_ids = [str(p['_id']) for p in popular_products]
            return jsonify({
                'success': True,
                'recommendations': product_ids,
                'method': 'popular'
            })
        
        # Get user's purchase history
        purchased_product_ids = [
            str(i['product']) for i in interactions 
            if i['type'] == 'purchase'
        ]
        
        # Collaborative filtering recommendations
        collab_recs = []
        if collaborative_model and user_item_matrix is not None:
            collab_recs = get_collaborative_recommendations(
                user_id, purchased_product_ids, limit
            )
        
        # Content-based recommendations
        content_recs = []
        if content_model and product_features is not None:
            content_recs = get_content_based_recommendations(
                purchased_product_ids, limit
            )
        
        # Hybrid approach: combine both methods
        recommendations = hybrid_recommendations(
            collab_recs, content_recs, limit
        )
        
        # Filter out already purchased products
        recommendations = [
            rec for rec in recommendations 
            if rec not in purchased_product_ids
        ][:limit]
        
        if not recommendations:
            # Fallback to popular products
            popular_products = list(db.products.find()
                .sort([('purchases', -1)])
                .limit(limit))
            recommendations = [str(p['_id']) for p in popular_products]
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'method': 'hybrid'
        })
        
    except Exception as e:
        logger.error(f"Error getting user recommendations: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/recommendations/product/<product_id>', methods=['GET'])
def get_similar_products(product_id):
    """Get similar products based on product attributes"""
    try:
        limit = int(request.args.get('limit', 6))
        
        # Get product details
        product = db.products.find_one({'_id': ObjectId(product_id)})
        if not product:
            return jsonify({'success': False, 'error': 'Product not found'}), 404
        
        # Content-based similarity
        if content_model and product_features is not None:
            similar = get_content_based_recommendations([product_id], limit + 1)
            # Remove the product itself
            similar = [p for p in similar if p != product_id][:limit]
        else:
            # Fallback: same category
            similar_products = list(db.products.find({
                'category': product['category'],
                '_id': {'$ne': ObjectId(product_id)}
            })
            .sort([('purchases', -1), ('ratings.average', -1)])
            .limit(limit))
            similar = [str(p['_id']) for p in similar_products]
        
        return jsonify({
            'success': True,
            'similar_products': similar,
            'method': 'content_based'
        })
        
    except Exception as e:
        logger.error(f"Error getting similar products: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def get_collaborative_recommendations(user_id, exclude_products, limit):
    """Get recommendations using collaborative filtering"""
    try:
        # Find similar users based on purchase patterns
        user_purchases = set(exclude_products)
        
        # Get all users' purchases
        all_interactions = list(db.interactions.find({
            'type': 'purchase'
        }))
        
        # Calculate user similarity
        user_similarities = {}
        for interaction in all_interactions:
            other_user = str(interaction['user'])
            if other_user == user_id:
                continue
            
            product = str(interaction['product'])
            if product in user_purchases:
                user_similarities[other_user] = user_similarities.get(other_user, 0) + 1
        
        # Get products from similar users
        similar_users = sorted(user_similarities.items(), 
                              key=lambda x: x[1], 
                              reverse=True)[:10]
        
        recommended_products = {}
        for similar_user_id, similarity in similar_users:
            user_products = list(db.interactions.find({
                'user': ObjectId(similar_user_id),
                'type': 'purchase'
            }))
            
            for interaction in user_products:
                product_id = str(interaction['product'])
                if product_id not in exclude_products:
                    recommended_products[product_id] = recommended_products.get(
                        product_id, 0
                    ) + similarity
        
        # Sort by score
        sorted_recs = sorted(recommended_products.items(), 
                           key=lambda x: x[1], 
                           reverse=True)
        return [product_id for product_id, _ in sorted_recs[:limit]]
        
    except Exception as e:
        logger.error(f"Collaborative filtering error: {e}")
        return []

def get_content_based_recommendations(product_ids, limit):
    """Get recommendations using content-based filtering"""
    try:
        # Get products based on similar categories and tags
        products = list(db.products.find({
            '_id': {'$in': [ObjectId(pid) for pid in product_ids]}
        }))
        
        if not products:
            return []
        
        # Extract categories and tags
        categories = set()
        tags = set()
        for product in products:
            categories.add(product.get('category'))
            tags.update(product.get('tags', []))
        
        # Find similar products
        similar_products = list(db.products.find({
            '$or': [
                {'category': {'$in': list(categories)}},
                {'tags': {'$in': list(tags)}}
            ],
            '_id': {'$nin': [ObjectId(pid) for pid in product_ids]}
        })
        .sort([('purchases', -1), ('ratings.average', -1)])
        .limit(limit))
        
        return [str(p['_id']) for p in similar_products]
        
    except Exception as e:
        logger.error(f"Content-based filtering error: {e}")
        return []

def hybrid_recommendations(collab_recs, content_recs, limit):
    """Combine collaborative and content-based recommendations"""
    # Weight: 60% collaborative, 40% content-based
    collab_weight = 0.6
    content_weight = 0.4
    
    scores = {}
    
    # Add collaborative recommendations
    for idx, product_id in enumerate(collab_recs):
        score = collab_weight * (len(collab_recs) - idx) / len(collab_recs)
        scores[product_id] = scores.get(product_id, 0) + score
    
    # Add content-based recommendations
    for idx, product_id in enumerate(content_recs):
        score = content_weight * (len(content_recs) - idx) / len(content_recs)
        scores[product_id] = scores.get(product_id, 0) + score
    
    # Sort by combined score
    sorted_products = sorted(scores.items(), 
                           key=lambda x: x[1], 
                           reverse=True)
    
    return [product_id for product_id, _ in sorted_products[:limit]]

@app.route('/train', methods=['POST'])
def train_models():
    """Trigger model training"""
    try:
        import train_model
        result = train_model.train_and_save_models()
        
        # Reload models
        load_models()
        
        return jsonify({
            'success': True,
            'message': 'Models trained successfully',
            'metrics': result
        })
    except Exception as e:
        logger.error(f"Training error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
