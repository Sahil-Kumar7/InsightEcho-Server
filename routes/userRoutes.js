const {Router} = require('express');
const {registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors} = require("../controllers/userControllers.js");
const authMiddleware = require('../middleware/authMiddleware.js');

const route = Router();

route.post('/register',registerUser);
route.post('/login',loginUser);
route.get('/:id',getUser);
route.get('/',getAuthors);
route.post('/change-avatar',authMiddleware ,changeAvatar);
route.put('/edit-user',authMiddleware ,editUser);

module.exports = route;