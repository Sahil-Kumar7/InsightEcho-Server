const HttpError = require('../models/errorModel.js');
const User = require('../models/userModel.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const {v4: uuid} = require("uuid");


// ===================REGISTER A USER
// POST : api/users/register
// UNPROTECTED

const registerUser = async (req,res,next) => {
    try {
        const {name, email, password, password2} = req.body;
        if(!name || !email || !password){
            return next(new HttpError("Fill in all fields.",422))
        }

        const newEmail = email.toLowerCase();
        const emailExists = await User.findOne({email:newEmail});
        if(emailExists){
            return next(new HttpError("Email already exists.", 422));
        }

        if((password.trim()).length < 5){
            return next(new HttpError("Password must be at least 5 characters.", 422));
        }
        if(password!=password2){
            return next(new HttpError("Passwords do not match.", 422));
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);
        const newUser = await User.create({name, email:newEmail, password:hashedPass});
        res.status(200).json(`New User ${newUser.email} registered!`);

    } catch (error) {
        return next(new HttpError("User Registration Failed!",422))
    }
}



// ===================LOGIN A REGISTERED USER
// POST : api/users/login
// UNPROTECTED

const loginUser = async (req,res,next) => {
    try {
        const {email, password} = req.body;
        if(!email || !password){
            return next(new HttpError("Fill in all fields.",422))
        }
        const newEmail = email.toLowerCase();

        const user = await User.findOne({email:newEmail});
        if (!user) {
            return next(new HttpError('Invalid credentials',422));
        }

        const comparePass = await bcrypt.compare(password,user.password);
        if(!comparePass){
            return next(new HttpError('Invalid credentials',422));
        }

        const {_id:id, name} = user;
        const token = jwt.sign({id, name},process.env.JWT_SECRET, {expiresIn: "1d"});

        res.status(200).json({token, id, name});

    } catch (error) {
        return next(new HttpError("LogIn failed. Please check your credentials.",422));
    }
}



// ===================USER PROFILE
// POST : api/users/:id
// UNPROTECTED

const getUser = async (req,res,next) => {
    try {
        const {id} = req.params;
        const user = await User.findById(id).select('-password');
        if(!user){
            return next(new HttpError("User not found!",422));
        }       
        res.status(200).json(user); 
    } catch (error) {
        return next(new HttpError(error));
    }
}



// ===================CHANGE USER AVATAR
// POST : api/users/change-avatar
// UNPROTECTED

const changeAvatar = async (req,res,next) => {
    try { 
        if(!req.files.avatar) {
            return next(new HttpError("Please select an image.",422));
        }
            //find user from database
            const user = await User.findById(req.user.id);

            //delete old avatar if exists
            if(user.avatar){
                fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar),(err)=>{
                    if(err) {
                        return next(new HttpError(err));
                    }
                });
            }
            const {avatar} = req.files;
            if(avatar.size > 500000){
                return next(new HttpError("The image should be less than 500Kb",422));
            }

            let filename;
            filename = avatar.name;
            let splittedFileName = filename.split('.');
            let newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length -1];
            avatar.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) =>{
                if(err) {
                    return next(new HttpError(err,422));
                }   

                const updatedAvatar = await User.findByIdAndUpdate(req.user.id, {avatar:newFileName}, {new:true});
                if(!updatedAvatar) {
                    return next(new HttpError("Avatar couldn't be changed.",422));
                }
                res.status(200).json(updatedAvatar);
            });

        } catch (error) {
        return next(new HttpError(error));
    }
}



// ===================EDIT USER DETAILS (from profile)
// POST : api/users/edit-user
// UNPROTECTED

const editUser = async (req,res,next) => {
    try {
        const {name, email, currentPassword, newPassword, confirmNewPassword} = req.body;
        if(!name || !email || !currentPassword || !newPassword){
            return next(new HttpError('Fill in all fields.',422));
        }
        // get user from database
        const user = await User.findById(req.user.id);
        if(!user) {
            return next(new HttpError('User not found!',403));
        }

        // new email doesn't already exist
        const emailExist = await User.findOne({email});
        if(emailExist && emailExist._id != req.user.id){
            return next(new HttpError('Email already exists.',422));
        }

        // compare current password to db password
        const validateUserPassword = await bcrypt.compare(currentPassword, user.password);
        if(!validateUserPassword) {
            return next(new HttpError('Invalid current password.',422));
        }

        // compare new passwords
        if(newPassword !== confirmNewPassword){
            return next(new HttpError("New asswords do not match.", 422));
        }

        // hash new password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        // update user info in database
        const newInfo = await User.findByIdAndUpdate(req.user.id, {name, email, password: hash}, {new:true});
        res.status(200).json(newInfo);

    } catch (error) {
        return next(new HttpError(error));
    }
}



// ===================GET AUTHORS
// POST : api/users/authors
// UNPROTECTED

const getAuthors = async (req,res,next) => {
    try {
        const authors = await User.find().select('-password');
        res.status(200).json(authors);
    } catch (error) {
        return next(new HttpError(error));
    }
}



module.exports = {registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors} 