const express = require('express');
const tagsRouter = express.Router();
const {getAllTags, getPostsByTagName} = require('../db');

tagsRouter.use((req, res, next) => {
    console.log("A request is being made to /tags");
    next();
});

tagsRouter.get('/:tagName/posts', async (req, res, next) => {
    const tagName = await getAllTags();
    try {
      	const posts = await getPostsByTagName(tagName);
      	res.send({posts: posts})
    } catch ({ name, message }) {
      	next({name, message})
    }
});

module.exports = tagsRouter;