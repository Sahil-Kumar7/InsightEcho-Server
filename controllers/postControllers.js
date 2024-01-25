const Post = require('../models/postModel.js');
const User = require('../models/userModel.js');
const fs = require('fs');
const path = require('path');
const {v4: uuid} = require("uuid");
const HttpError = require('../models/errorModel.js');



// ===================CREATE A POST
// POST : api/posts
// PROTECTED

const createPost = async (req, res, next) => {
    try {
        let {title,category,desc} = req.body;
        if(!title || !category || !desc || !req.files){
            return next(new HttpError("Fill in all fields and choose thumbnail.",422));
        }

        const {thumbnail} = req.files;
        //check the file size
        if(thumbnail.size > 2000000){
            return next(new HttpError("File size should be less than 2Mb",422));
        }

        let fileName = thumbnail.name;
        let splittedFileName = fileName.split('.');
        let newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length-1];
        thumbnail.mv(path.join(__dirname, '..', '/uploads', newFileName), async (err) => {
            if(err) {
                return next(new HttpError(err));
            } else {
                const newPost = await Post.create({title, category, desc, thumbnail:newFileName, creator: req.user.id})
                if(!newPost){
                    return next(new HttpError("Post could not be created.",422));
                }

                //find user and increase post count by 1
                const currentUser = await User.findById(req.user.id);
                const userPostCount = currentUser.posts + 1;
                await User.findByIdAndUpdate(req.user.id, {posts:userPostCount})

                res.status(200).json(newPost);
            }
        })
    } catch (error) {
        return next(new HttpError(error));
    }
}



// ===================GET POSTS
// GET : api/posts
// PROTECTED

const getPosts = async (req, res, next) => {
    try {
        const posts = await Post.find().sort({updatedAt: -1})
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error));
    }
}



// ===================GET SINGLE POST
// GET : api/posts/:id
// PROTECTED

const getPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if(!post) {
            return next(new HttpError("Post not found!",404));
        }
        res.status(200).json(post);
    } catch (error) {
        return next(new HttpError(error));
    }
}



// ===================GET POST BY CATEGORY
// POST : api/posts/categories/:category
// PROTECTED

const getCatPosts = async (req, res, next) => {
    try {
        const {category} = req.params;
        const catPosts = await Post.find({category}).sort({createdAt: -1});
        res.status(200).json(catPosts);
    } catch (error) {
        return next(new HttpError(error));
    }
}



// ===================GET AUTHOR POST
// POST : api/posts/users/:id
// PROTECTED

const getUserPosts = async (req, res, next) => {
    try {
        const {id} = req.params;
        const posts = await Post.find({creator: id}).sort({createdAt: -1});
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error));
    }
}



// ===================EDIT POST
// POST : api/posts/:id
// PROTECTED

const editPost = async (req, res, next) => {
    try {
        let fileName;
        let newFileName;
        let updatedPost;
        const postId = req.params.id;
        let {title, category, desc} = req.body;
        // ReactQuill has a paragraph opening and closing tag with a break tag in between so there are 11 characters in there already.
        if(!title || !category | desc.length < 12) {
            return next (new HttpError("Fill in all fields.", 422))
        }
        // get old posts from database
        const oldPost = await Post.findById(postId);
        if(req.user.id == oldPost.creator){
            if( !req.files) {
                updatedPost = await Post.findByIdAndUpdate(postId, {title, category, desc}, {new:true});
            } else {
                //delete old thumbnail from upload
                fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbnail), async (err) => {
                    if(err) {
                        return next(new HttpError(err));
                    }
                })
                //upload new thumbnail
                const {thumbnail} = req.files;

                //check file size
                if(thumbnail.size>2000000){
                    return next(new HttpError("File size should be less than 2Mb",422));
                }
                fileName = thumbnail.name;
                let splittedFileName = fileName.split('.');
                let newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length-1];
                thumbnail.mv(path.join(__dirname, '..', '/uploads', newFileName), async (err) => {
                    if(err) {
                        return next(new HttpError(err));
                    }
                })

                updatedPost = await Post.findByIdAndUpdate(postId, {title, category, desc, thumbnail:newFileName}, {new:true});
            }
        }
        if(!updatedPost) {
            return next(new HttpError("Post couldn't be updated.",422));
        }
        res.status(200).json(updatedPost);
    } catch (error) {
        return next(new HttpError(error));
    }
}



// ===================DELETE POST
// POST : api/posts/:id
// PROTECTED

const deletePost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        if(!postId){
            return next(new HttpError("Post unavailable.",422));
        }
        const post = await Post.findById(postId);
        const fileName = post?.thumbnail;

        if(req.user.id == post.creator){
            // delete thumbnail from uploads folder
            fs.unlink(path.join(__dirname, '..', '/uploads', fileName), async (err) => {
                if(err) {
                    return next(new HttpError(err));
                } else {
                    await Post.findByIdAndDelete(postId);

                    //find user and reduce post count by 1
                    const currentUser = await User.findById(req.user.id);
                    const userPostCount = (currentUser?.posts || 0) - 1;
                    await User.findByIdAndUpdate(req.user.id, {posts: userPostCount});
                    res.status(200).json(`Post ${postId} deleted successfully!`);
                }
            })
        } else {
            return next(new HttpError("Post couldn't be deleted",403));
        }
        
    } catch (error) {
        return next(new HttpError(error));
    }
}


module.exports = {createPost, getPosts, getPost, getCatPosts, getUserPosts, editPost, deletePost};