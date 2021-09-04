const pg = require('pg');
const client = new pg.Client('postgres://localhost:5432/juicebox-dev');

async function getAllUsers() {
    try {
        const {rows} = await client.query(
            `SELECT id, username, name, location, active
            FROM users;
        `);
        return rows;
    } catch (error) {
        throw error;
    }
}

async function getAllPosts() {
    try {
        const {rows} = await client.query(
            `SELECT id
            FROM posts;
        `);
        const posts = await Promise.all(rows.map(row => getPostById(row.id)))
        return posts;
    } catch (error) {
        throw error;
    }
}

async function getPostsByUser(userId) {
    try {
        const {rows} = client.query(`
            SELECT * FROM posts
            WHERE "authorId"=${userId};
        `);
        return rows;
    } catch (error) {
        throw error;
    }
}

async function getUserById(userId) {
    console.log(userId);
    try {
        const {rows:[user]} = await client.query(`
            SELECT * FROM users
            WHERE "id"=${userId};
        `);
        delete user.password
        console.log("HERE?");
        const posts = await getPostsByUser(userId)
        user.posts = posts;
        return user
    } catch (error) {
        throw error;
    }
}

async function createUser({
    username, 
    password,
    name,
    location
    }) {
    try {
        const {rows:[user]} = await client.query(`
            INSERT INTO users(username, password, name, location) 
            VALUES($1, $2, $3, $4)
            ON CONFLICT (username) DO NOTHING
            RETURNING *;
        `, [username, password, name, location]);
        return user
    } catch (error) {
        throw error;
    }
}

async function createPost({
    authorId, 
    title,
    content
}) {
    try {
        const {rows:[post]} = await client.query(`
            INSERT INTO posts("authorId", title, content) 
            VALUES($1, $2, $3)
            RETURNING *;
        `, [authorId, title, content]);
        return post
    } catch (error) {
        throw error;
    }
}

async function createTags(tagList) {
    if (tagList.length === 0) {
        return;
    }
    const insertValues = tagList.map(
        (tag, index) => `$${index + 1}`).join('), (');

    const selectValues = tagList.map(
        (tag, index) => `$${index + 1}`).join(', ');
        console.log(insertValues, selectValues);
        const queryString = `
        INSERT INTO tags (name)
        VALUES (${insertValues})
        ON CONFLICT (name) DO NOTHING;
    `
    console.log(queryString);
    try {
        await client.query(queryString, tagList)
        
        const {rows} = await client.query(`
            SELECT * FROM tags
            WHERE name
            IN (${selectValues});
        `, tagList)
        console.log(rows);
        return rows;
    } catch (error) {
        throw error;
    }
}

async function createPostTag(postId, tagId) {
    console.log(postId, tagId);
    try {
        await client.query(`
            INSERT INTO post_tags("postId", "tagId")
            VALUES ($1, $2)
            ON CONFLICT ("postId", "tagId") DO NOTHING;
        `, [postId, tagId]);
    } catch (error) {
        throw error
    }
}

async function getPostById(postId) {
    try {
        const {rows:[post]} = await client.query(`
            SELECT *
            FROM posts
            WHERE id=$1;
        `, [postId]);

        const {rows:tags} = await client.query(`
            SELECT tags.*
            FROM tags
            JOIN post_tags ON tags.id=post_tags."tagId"
            WHERE post_tags."postId"=$1;
        `, [postId]);

        const {rows:[author]} = await client.query(`
            SELECT id, username, name, location
            FROM users
            WHERE id=$1;
        `, [post.authorId]);

        post.tags = tags;
        post.author = author;

        delete post.authorId;

        return post;
    } catch (error) {
        throw error;
    }
}

async function addTagsToPost(postId, tagList) {
    try {
        const createPostTagPromises = tagList.map(
            tag => createPostTag(postId, tag.id)
        );
            
        await Promise.all(createPostTagPromises);
        console.log("HERE?")
        return await getPostById(postId);
    } catch (error) {
        throw error;
    }
}

async function updateUser(id, fields = {}) {
    const setString = Object.keys(fields).map(
        (key, index) => `"${key}"=$${index + 1}`
    ).join(', ');
    if (setString.length === 0) {
        return;
    }
    try {
        const {rows:[user]} = await client.query(`
            UPDATE users
            SET ${setString}
            WHERE id=${id}
            RETURNING *;
        `, Object.values(fields));
        return user;
    } catch (error) {
        throw error;
    }
}

async function updatePost(id, fields = {
    title,
    content,
    active
}) {
    const setString = Object.keys(fields).map(
        (key, index) => `"${key}"=$${index + 1}`
    ).join(', ');
    console.log(id)
    if (setString.length === 0) {
        return;
    }
    try {
        const {rows:[post]} = await client.query(`
            UPDATE posts
            SET ${setString}
            WHERE id=${id}
            RETURNING *;
        `, Object.values(fields));
        return post;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    client,
    getAllUsers,
    createUser,
    updateUser,
    createPost,
    updatePost,
    getAllPosts,
    getPostsByUser,
    getUserById,
    createTags,
    getPostById,
    addTagsToPost,
}