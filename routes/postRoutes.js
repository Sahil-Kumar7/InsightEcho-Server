const {Router} = require('express');
const {createPost, getPosts, getPost, getCatPosts, getUserPosts, editPost, deletePost} = require('../controllers/postControllers.js');
const authMiddleware = require('../middleware/authMiddleware.js');

const route = Router();

route.post('/', authMiddleware, createPost);
route.get('/', getPosts);
route.get('/:id', getPost);
route.put('/:id', authMiddleware, editPost);
route.get('/categories/:category', getCatPosts);
route.get('/users/:id', getUserPosts);
route.delete('/:id', authMiddleware, deletePost);

module.exports = route;